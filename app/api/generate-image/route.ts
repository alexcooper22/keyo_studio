import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai'
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit, isAllowedImageUrl } from "../../../lib/rateLimit";
import { getModelById, getCreditCost, resolveApiKey } from '../../../lib/models'

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate images." },
        { status: 401 }
      );
    }

    const { allowed } = rateLimit(`gen-image:${userId}`, 10, 60_000);
    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { prompt, aspectRatio, imageUrls, resolution, modelId } = body;

    if (!modelId) {
      return NextResponse.json({ error: 'modelId is required' }, { status: 400 });
    }

    let aiModel: Awaited<ReturnType<typeof getModelById>>;
    let creditCost: number;
    try {
      aiModel = await getModelById(modelId);
      creditCost = await getCreditCost(aiModel.id, resolution);
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.log("Request body received:", { prompt, aspectRatio, imageUrls, resolution, creditCost });

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 1. Get active subscription and check credits
    const { data: subscription, error: subError } = await supabaseAdmin
      .from('user_subscriptions')
      .select('credits_remaining, status')
      .eq('clerk_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subError) {
      console.error('Subscription fetch error:', subError);
      return NextResponse.json(
        { error: 'Failed to check subscription' },
        { status: 500 }
      );
    }

    if (!subscription) {
      return NextResponse.json(
        { error: 'No active subscription. Please choose a plan to start generating.' },
        { status: 403 }
      );
    }

    const currentCredits = subscription.credits_remaining;

    // 2. Check credits
    if (currentCredits < creditCost) {
      return NextResponse.json(
        { error: `Not enough credits. This resolution requires ${creditCost} credits.` },
        { status: 403 }
      );
    }

    // 3. Prepare Gemini API call
    let apiKey: string;
    try {
      ({ apiKey } = resolveApiKey(aiModel));
    } catch (err: any) {
      throw new Error(err.message);
    }

    if (aiModel.provider === 'openai') {
      const openai = new OpenAI({ apiKey })
      const size = resolution === '4K' ? '1536x1024' : '1024x1024'

      const response = await openai.images.generate({
        model: aiModel.model_id,
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      })

      const b64 = response.data[0]?.b64_json
      if (!b64) throw new Error('No image data from OpenAI')

      const imageBuffer = Buffer.from(b64, 'base64')
      const fileName = `${userId}/${Date.now()}.png`
      const bucketName = 'user-images'

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, { contentType: 'image/png', upsert: true })

      if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`)

      const { data: { publicUrl } } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName)

      await supabaseAdmin.from('generated_images').insert({
        clerk_id: userId,
        prompt,
        image_url: publicUrl,
        model: aiModel.name,
        resolution: resolution || '1K',
      })

      const { data: updatedSub, error: updateError } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ credits_remaining: currentCredits - creditCost, updated_at: new Date().toISOString() })
        .eq('clerk_id', userId)
        .eq('status', 'active')
        .gte('credits_remaining', creditCost)
        .select('credits_remaining')
        .maybeSingle()

      if (updateError) throw updateError
      if (!updatedSub) return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 })

      return NextResponse.json({ images: [{ url: publicUrl }], prompt, remainingCredits: updatedSub.credits_remaining })
    }

    if (aiModel.provider !== 'google') {
      return NextResponse.json({ error: `Provider "${aiModel.provider}" not yet implemented` }, { status: 501 });
    }

    const ai = new GoogleGenAI({ apiKey });

    const isEdit = imageUrls && imageUrls.length > 0;
    console.log("isEdit:", isEdit, "imageUrls:", imageUrls);

    // Build contents array
    let contents: any[];

    if (isEdit) {
      // Validate all URLs before fetching (SSRF prevention)
      for (const url of imageUrls) {
        if (!isAllowedImageUrl(url)) {
          return NextResponse.json({ error: 'Invalid image URL' }, { status: 400 });
        }
      }

      const imageParts = await Promise.all(
        (imageUrls as string[]).map(async (url) => {
          const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
          // Reject redirects — a trusted domain could redirect to an internal IP (SSRF bypass)
          if (res.status >= 300 && res.status < 400) throw new Error('Invalid image URL');
          if (!res.ok) throw new Error('Failed to fetch reference image');
          const arrayBuffer = await res.arrayBuffer();
          if (arrayBuffer.byteLength > 20 * 1024 * 1024) throw new Error('Reference image too large');
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = res.headers.get('content-type') || 'image/jpeg';
          return { inlineData: { data: base64, mimeType } };
        })
      );

      contents = [
        {
          role: "user",
          parts: [
            ...imageParts,
            { text: prompt }
          ]
        }
      ];
    } else {
      // text-to-image
      contents = [{ role: "user", parts: [{ text: prompt }] }];
    }

    console.log("Gemini request:", { model: aiModel.model_id, isEdit, aspectRatio, resolution });

    const geminiResponse = await ai.models.generateContent({
      model: aiModel.model_id,
      contents,
      config: {
        responseModalities: isEdit ? ["TEXT", "IMAGE"] : ["IMAGE"],
        imageConfig: {
          aspectRatio: aspectRatio || "4:3",
          imageSize: resolution || "1K"
        }
      }
    });

    // 4. Extract base64 image from response
    let imageBase64: string | null = null;
    let imageMimeType = 'image/png';

    const candidates = geminiResponse.candidates || [];
    for (const candidate of candidates) {
      for (const part of (candidate.content?.parts || [])) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          imageMimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }
      if (imageBase64) break;
    }

    if (!imageBase64) {
      throw new Error("No image data received");
    }

    // 5. Upload base64 image to Supabase Storage
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const ext = imageMimeType.includes('jpeg') ? 'jpg' : 'png';
    const fileName = `${userId}/${Date.now()}.${ext}`;
    const bucketName = 'user-images';

    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(fileName, imageBuffer, {
        contentType: imageMimeType,
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    console.log("Image uploaded to Supabase:", publicUrl);

    // 6. Save to generated_images table
    const { error: saveError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        clerk_id: userId,
        prompt,
        image_url: publicUrl,
        model: aiModel.name,
        resolution: resolution || '1K'
      });

    if (saveError) throw saveError;

    // 7. Deduct credits atomically — the .gte guard prevents overdraft in race conditions
    const { data: updatedSub, error: updateError } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        credits_remaining: currentCredits - creditCost,
        updated_at: new Date().toISOString()
      })
      .eq('clerk_id', userId)
      .eq('status', 'active')
      .gte('credits_remaining', creditCost)
      .select('credits_remaining')
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedSub) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });
    }

    return NextResponse.json({
      images: [{ url: publicUrl }],
      prompt,
      remainingCredits: updatedSub.credits_remaining
    });

  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
