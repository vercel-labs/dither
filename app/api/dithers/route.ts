import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dithers } from "@/lib/db/schema";
import { uploadImage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  generateTitleFromPrompt,
  generateTitleFromImage,
} from "@/lib/generate-title";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, prompt, imageData } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!imageData) {
      return NextResponse.json(
        { error: "Image data is required" },
        { status: 400 },
      );
    }

    // Upload the image to storage
    const imageUrl = await uploadImage(imageData, `${id}.png`);

    // Generate title based on whether we have a prompt (generated) or not (uploaded)
    let title: string;
    if (prompt) {
      title = await generateTitleFromPrompt(prompt);
    } else {
      title = await generateTitleFromImage(imageData);
    }

    // Create the dither record
    const [dither] = await db
      .insert(dithers)
      .values({
        id,
        userId: session.user.id,
        title,
        prompt: prompt || null,
        imageUrl,
      })
      .returning();

    return NextResponse.json({ dither });
  } catch (error) {
    console.error("Error creating dither:", error);
    return NextResponse.json(
      {
        error: `Failed to create dither: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
