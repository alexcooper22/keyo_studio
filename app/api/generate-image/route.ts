import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenAI } from "@google/genai";
import { supabaseAdmin } from "../../../lib/supabase";

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

    const { prompt, aspectRatio, imageUrls, resolution } = body;
    const creditCost = resolution === '4K' ? 4 : resolution === '2K' ? 3 : 2;
    console.log("Request body received:", { prompt, aspectRatio, imageUrls, resolution, creditCost });

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 1. Get or create user in Supabase and check credits
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('clerk_id', userId)
      .single();

    let currentCredits = 0;

    if (userError && userError.code === 'PGRST116') {
      // User not found — create with 10 credits
      const { data: newUser, error: createError } = await supabaseAdmin
        .from('users')
        .insert({ clerk_id: userId, credits: 10 })
        .select('credits')
        .single();

      if (createError) throw createError;
      currentCredits = newUser.credits;
    } else if (user) {
      currentCredits = user.credits;
    }

    // 2. Check credits
    if (currentCredits < creditCost) {
      return NextResponse.json(
        { error: `Not enough credits. This resolution requires ${creditCost} credits.` },
        { status: 403 }
      );
    }

    // 3. Prepare Gemini API call
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("GOOGLE_AI_API_KEY is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const isEdit = imageUrls && imageUrls.length > 0;

    // Build contents array
    let contents: any[];

    if (isEdit) {
      // image-to-image: fetch images and convert to base64 inlineData
      const imageParts = await Promise.all(
        imageUrls.map(async (url: string) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch image: ${url}`);
          const arrayBuffer = await res.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          const mimeType = res.headers.get('content-type') || 'image/jpeg';
          return {
            inlineData: { data: base64, mimeType }
          };
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

    console.log("Gemini request:", { model: "gemini-3.1-flash-image-preview", isEdit, aspectRatio, resolution });

    const geminiResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents,
      config: {
        responseModalities: ["IMAGE"],
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
      console.error("Gemini response:", JSON.stringify(geminiResponse, null, 2));
      throw new Error("No image data received from Gemini API");
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
        model: 'gemini-3.1-flash-image-preview'
      });

    if (saveError) throw saveError;

    // 7. Deduct credits
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits: currentCredits - creditCost })
      .eq('clerk_id', userId)
      .select('credits')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      images: [{ url: publicUrl }],
      prompt,
      remainingCredits: updatedUser.credits
    });

  } catch (error: any) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
