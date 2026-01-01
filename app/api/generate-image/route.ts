import { NextResponse } from "next/server";

const ANYTHING_TO_3D_URL = process.env.ANYTHING_TO_3D_URL || "http://localhost:3000";

export async function POST(request: Request) {
  try {
    const { prompt, modelId } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Call the anything-to-3d API
    const response = await fetch(`${ANYTHING_TO_3D_URL}/api/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        modelId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || "Failed to generate image" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error generating image:", error);
    return NextResponse.json(
      {
        error: `Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 }
    );
  }
}

