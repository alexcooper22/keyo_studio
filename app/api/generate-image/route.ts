import { fal } from "@fal-ai/client";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in to generate images." },
        { status: 401 }
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

    // Call fal-ai/flux-pro with the prompt
    const result: any = await fal.subscribe("fal-ai/flux-pro", {
      input: {
        prompt: prompt,
        image_size: "landscape_4_3",
        num_images: 1,
        enable_safety_checker: true,
      },
    });

    return NextResponse.json({
      images: result.data.images,
      prompt: prompt,
    });

  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate image" },
      { status: 500 }
    );
  }
}
