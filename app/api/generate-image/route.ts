import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import OpenAI from 'openai'
import { supabaseAdmin } from "../../../lib/supabase";
import { rateLimit, isAllowedImageUrl } from "../../../lib/rateLimit";
import { getModelById, getCreditCost, resolveApiKey } from '../../../lib/models'

const PRIVATE_HOST = [
  /^localhost$/i,
  /^127\./,
  /^0\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fe80:/i,
  /^metadata\.google\.internal$/i,
];

function isSafeUrl(raw: string): boolean {
  try {
    const { protocol, hostname } = new URL(raw);
    return protocol === 'https:' && !PRIVATE_HOST.some(p => p.test(hostname));
  } catch { return false; }
}

// Fetch a provider-returned URL, following up to 3 redirects while blocking
// every hop that resolves to a private/internal address (SSRF prevention).
async function fetchProviderImage(url: string): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= 3; hop++) {
    if (!isSafeUrl(current)) throw new Error('Unsafe URL destination');
    const res = await fetch(current, { redirect: 'manual', signal: AbortSignal.timeout(30_000) });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new Error('Redirect missing Location header');
      current = new URL(location, current).href;
      continue;
    }
    return res;
  }
  throw new Error('Too many redirects');
}

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
      const size = resolution === '4K' ? '1536x1024' : resolution === '2K' ? '1024x1536' : '1024x1024'

      const response = await openai.images.generate({
        model: aiModel.model_id,
        prompt,
        n: 1,
        size,
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
        aspect_ratio: aspectRatio || '4:3',
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

    if (aiModel.provider === 'alibaba') {
      // qwen-image-2.0-pro on DashScope International (Singapore) — synchronous multimodal endpoint
      // Size matrix: [aspectRatio][resolution] → WIDTHxHEIGHT
      const sizeMatrix: Record<string, Record<string, string>> = {
        '1:1':   { '1K': '1024*1024', '2K': '1440*1440', '4K': '2048*2048' },
        '4:3':   { '1K': '1024*768',  '2K': '1440*1080', '4K': '2048*1536' },
        '3:4':   { '1K': '768*1024',  '2K': '1080*1440', '4K': '1536*2048' },
        '16:9':  { '1K': '1280*720',  '2K': '1920*1080', '4K': '2560*1440' },
        '9:16':  { '1K': '720*1280',  '2K': '1080*1920', '4K': '1440*2560' },
        '3:2':   { '1K': '1024*682',  '2K': '1536*1024', '4K': '2048*1365' },
        '2:3':   { '1K': '682*1024',  '2K': '1024*1536', '4K': '1365*2048' },
        '21:9':  { '1K': '1280*549',  '2K': '1920*823',  '4K': '2560*1097' },
        '5:4':   { '1K': '1024*819',  '2K': '1280*1024', '4K': '2048*1638' },
        '4:5':   { '1K': '819*1024',  '2K': '1024*1280', '4K': '1638*2048' },
        'auto':  { '1K': '1024*1024', '2K': '1440*1440', '4K': '2048*2048' },
      }
      const ratioSizes = sizeMatrix[aspectRatio] ?? sizeMatrix['4:3']
      const size = ratioSizes[resolution] ?? ratioSizes['1K']

      const genRes = await fetch('https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: aiModel.model_id,
          input: {
            messages: [{
              role: 'user',
              content: [
                ...(imageUrls && imageUrls.length > 0
                  ? (imageUrls as string[]).map((url: string) => ({ image: url }))
                  : []),
                { text: prompt },
              ],
            }],
          },
          parameters: { size },
        }),
        signal: AbortSignal.timeout(90_000),
      })

      const genData = await genRes.json()
      if (!genRes.ok) throw new Error(`DashScope error: ${genData.message ?? genRes.status}`)

      const imageUrl: string | null = genData.output?.choices?.[0]?.message?.content?.[0]?.image ?? null
      if (!imageUrl) throw new Error('DashScope returned no image URL')

      // Fetch and re-upload — presigned OSS URLs expire
      const imgRes = await fetchProviderImage(imageUrl)
      if (!imgRes.ok) throw new Error('Failed to fetch generated image from DashScope CDN')
      const ct = imgRes.headers.get('content-type') || 'image/png'
      const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png'
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer())

      const fileName = `${userId}/${Date.now()}.${ext}`
      const bucketName = 'user-images'

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, { contentType: `image/${ext}`, upsert: true })

      if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`)

      const { data: { publicUrl } } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName)

      await supabaseAdmin.from('generated_images').insert({
        clerk_id: userId,
        prompt,
        image_url: publicUrl,
        model: aiModel.name,
        aspect_ratio: aspectRatio || '4:3',
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

    if (aiModel.provider === 'bytedance') {
      // BytePlus ModelArk (ap-southeast-1) — Seedream image generation
      // Size: pixel dimensions for aspect ratio control; resolution maps to quality tier
      const multiplier: Record<string, number> = { '1K': 1, '2K': 1.5, '4K': 2 }
      const m = multiplier[resolution] ?? 1
      const baseMap: Record<string, [number, number]> = {
        '1:1':  [1024, 1024], '4:3': [1024, 768],  '3:4':  [768, 1024],
        '16:9': [1280, 720],  '9:16': [720, 1280], '3:2':  [1024, 682],
        '2:3':  [682, 1024],  '21:9': [1280, 549], '5:4':  [1024, 819],
        '4:5':  [819, 1024],  'auto': [1024, 1024],
      }
      const [bw, bh] = baseMap[aspectRatio] ?? baseMap['4:3']
      const image_size = `${Math.round(bw * m)}x${Math.round(bh * m)}`

      const bdRes = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: aiModel.model_id, prompt, image_size }),
        signal: AbortSignal.timeout(90_000),
      })

      const bdData = await bdRes.json()
      if (!bdRes.ok) throw new Error(`ByteDance error: ${bdData.error?.message ?? bdData.message ?? bdRes.status}`)

      const imageUrl: string | null = bdData.data?.[0]?.url ?? null
      if (!imageUrl) throw new Error('ByteDance returned no image URL')

      const imgRes = await fetchProviderImage(imageUrl)
      if (!imgRes.ok) throw new Error('Failed to fetch generated image from ByteDance CDN')
      const ct = imgRes.headers.get('content-type') || 'image/png'
      const ext = ct.includes('jpeg') || ct.includes('jpg') ? 'jpg' : 'png'
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer())

      const fileName = `${userId}/${Date.now()}.${ext}`
      const bucketName = 'user-images'

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(fileName, imageBuffer, { contentType: `image/${ext}`, upsert: true })

      if (uploadError) throw new Error(`Supabase upload failed: ${uploadError.message}`)

      const { data: { publicUrl } } = supabaseAdmin.storage.from(bucketName).getPublicUrl(fileName)

      await supabaseAdmin.from('generated_images').insert({
        clerk_id: userId,
        prompt,
        image_url: publicUrl,
        model: aiModel.name,
        aspect_ratio: aspectRatio || '4:3',
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

    // Append aspect ratio hint to text prompt so Gemini respects it
    const ratioHint = aspectRatio && aspectRatio !== 'auto' ? ` Aspect ratio: ${aspectRatio}.` : '';
    if (contents[0]?.parts) {
      const textPart = contents[0].parts.find((p: any) => p.text);
      if (textPart) textPart.text = textPart.text + ratioHint;
    }

    const geminiResponse = await ai.models.generateContent({
      model: aiModel.model_id,
      contents,
      config: {
        responseModalities: isEdit ? ["TEXT", "IMAGE"] : ["IMAGE"],
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
        aspect_ratio: aspectRatio || '4:3',
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
    const message = error?.message || error?.toString() || "Failed to generate image";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
