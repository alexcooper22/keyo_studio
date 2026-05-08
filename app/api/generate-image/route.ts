import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

    // Get prompt and settings from body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }
    const { prompt, aspectRatio } = body;
    
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

    // 3. Call RunComfy API to start generation
    const runComfyApiKey = process.env.RUNCOMFY_API_KEY;
    if (!runComfyApiKey) {
      throw new Error("RUNCOMFY_API_KEY is not configured");
    }

    const startResponse = await fetch("https://model-api.runcomfy.net/v1/models/google/nano-banana-2/text-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${runComfyApiKey}`
      },
      body: JSON.stringify({
        prompt,
        aspect_ratio: aspectRatio || "4:3",
        resolution: "1K",
        output_format: "png",
        num_images: 1
      })
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({}));
      throw new Error(errorData.message || `RunComfy API error: ${startResponse.status}`);
    }

    const { request_id } = await startResponse.json();

    if (!request_id) {
      throw new Error("Failed to receive request_id from RunComfy");
    }

    // 4. Polling for status (max 60 seconds)
    let status = "pending";
    let attempts = 0;
    const maxAttempts = 60; // 60 attempts * 2 seconds = 120 seconds

    while (status !== "completed" && attempts < maxAttempts) {
      // Wait 2 seconds between polls
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;

      const statusResponse = await fetch(`https://model-api.runcomfy.net/v1/requests/${request_id}/status`, {
        headers: {
          "Authorization": `Bearer ${runComfyApiKey}`
        }
      });

      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        status = statusData.status;
        
        if (status === "failed") {
          throw new Error("Generation failed on RunComfy side");
        }
      } else {
        console.warn(`Polling failed on attempt ${attempts}: ${statusResponse.status}`);
      }
    }

    if (status !== "completed") {
      throw new Error("Generation timed out after 60 seconds");
    }

    // 5. Get the result
    const resultResponse = await fetch(`https://model-api.runcomfy.net/v1/requests/${request_id}/result`, {
      headers: {
        "Authorization": `Bearer ${runComfyApiKey}`
      }
    });

    if (!resultResponse.ok) {
      throw new Error(`Failed to fetch result: ${resultResponse.status}`);
    }

    const resultData = await resultResponse.json();
    // Support both output.images[0] and output.image as requested
    const imageUrl = resultData.output?.images?.[0] || resultData.output?.image;

    if (!imageUrl) {
      throw new Error("No image URL found in RunComfy result");
    }

    // 6. Save image to Supabase
    const { error: saveError } = await supabaseAdmin
      .from('generated_images')
      .insert({
        clerk_id: userId,
        prompt: prompt,
        image_url: imageUrl,
        model: 'nano-banana-2'
      });

    if (saveError) throw saveError;

    // 7. Deduct 1 credit
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ credits: currentCredits - 1 })
      .eq('clerk_id', userId)
      .select('credits')
      .single();

    if (updateError) throw updateError;

    // Return response in the format expected by the frontend
    return NextResponse.json({
      images: [{ url: imageUrl }],
      prompt: prompt,
      remainingCredits: updatedUser.credits
    });

  } catch (error: any) {
    console.error("Generation error details:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate image" },
      { status: 500 }
    );
  }
}
