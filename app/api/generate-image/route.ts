import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate images." },
        { status: 401 }
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

    const { prompt } = await request.json();
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Configure fal.ai credentials
    fal.config({
      credentials: process.env.FAL_KEY,
    });

    // 3. Call fal-ai/flux-pro with the prompt
    const result: any = await fal.subscribe("fal-ai/flux-pro", {
      input: {
        prompt: prompt,
        image_size: "landscape_4_3",
        num_images: 1,
        enable_safety_checker: true,
      },
    });

    const imageUrl = result.data.images[0].url;

    // 4. Save image to Supabase
    const { error: saveError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        clerk_id: userId,
        prompt: prompt,
        image_url: imageUrl,
        model: 'flux-pro'
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
