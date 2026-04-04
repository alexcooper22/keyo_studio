import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "../../../lib/supabase";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate images." },
        { status: 401 }
      );
    }

    // Get prompt and model from body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { prompt, model, imageUrls } = body;
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // 1. Get or create user in Supabase
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('clerk_id', userId)
      .single();

    let currentCredits = 0;

    if (userError && userError.code === 'PGRST116') {
      // User not found, create new user with 10 credits
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
    if (currentCredits <= 0) {
      return NextResponse.json(
        { error: "No credits left. Please upgrade your plan." },
        { status: 403 }
      );
    }

    // Configure fal.ai credentials
    fal.config({
      credentials: process.env.FAL_KEY,
    });

    // Upload base64 images if provided
    let uploadedUrls: string[] = [];
    if (imageUrls && imageUrls.length > 0) {
      for (const base64Str of imageUrls) {
        try {
          const fetchResponse = await fetch(base64Str);
          const blob = await fetchResponse.blob();
          
          // Next.js polyfills Blob globally, but fal.storage might want a File, Blob is compatible
          // Cast to any if there's type conflicts, but blob is Blob standard API
          const fileUrl = await fal.storage.upload(blob as any);
          uploadedUrls.push(fileUrl);
        } catch (e) {
          console.error("Failed to upload image to fal", e);
        }
      }
    }

    let modelId = 'fal-ai/flux-pro';
    let inputPayload: any = { prompt };

    if (model === 'nano-banana-pro') {
      if (uploadedUrls.length > 0) {
        modelId = 'fal-ai/gemini-3-pro-image-preview/edit';
        inputPayload = { prompt, image_urls: uploadedUrls };
      } else {
        modelId = 'fal-ai/gemini-3-pro-image-preview';
      }
    } else {
      inputPayload = { prompt, image_size: "landscape_4_3", num_images: 1, enable_safety_checker: true };
    }

    // 3. Call selected model with prompt
    const result: any = await fal.subscribe(modelId, {
      input: inputPayload,
    });

    const imageUrl = result.data.images[0].url;

    // 4. Save image to Supabase
    const { error: saveError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        clerk_id: userId,
        prompt: prompt,
        image_url: imageUrl,
        model: model || 'flux-pro'
      });

    if (saveError) throw saveError;

    // 5. Deduct 1 credit
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits: currentCredits - 1 })
      .eq('clerk_id', userId)
      .select('credits')
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({
      images: result.data.images,
      prompt: prompt,
      remainingCredits: updatedUser.credits
    });

  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
