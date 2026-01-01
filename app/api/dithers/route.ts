import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dithers, users } from "@/lib/db/schema";
import { uploadImage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
  generateTitleFromPrompt,
  generateTitleFromImage,
} from "@/lib/generate-title";
import { eq, or, desc } from "drizzle-orm";

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

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const userId = session?.user?.id;

    // Build where clause: public dithers OR user's own dithers (if signed in)
    const whereClause = userId
      ? or(eq(dithers.visibility, "public"), eq(dithers.userId, userId))
      : eq(dithers.visibility, "public");

    // Fetch dithers with user info
    const results = await db
      .select({
        id: dithers.id,
        title: dithers.title,
        imageUrl: dithers.imageUrl,
        visibility: dithers.visibility,
        createdAt: dithers.createdAt,
        userId: dithers.userId,
        userName: users.name,
        userImage: users.image,
      })
      .from(dithers)
      .leftJoin(users, eq(dithers.userId, users.id))
      .where(whereClause)
      .orderBy(desc(dithers.createdAt))
      .limit(50);

    // Separate into user's dithers and public dithers
    const myDithers = userId ? results.filter((d) => d.userId === userId) : [];
    const publicDithers = results.filter(
      (d) => d.visibility === "public" && d.userId !== userId,
    );

    return NextResponse.json({
      myDithers,
      publicDithers,
    });
  } catch (error) {
    console.error("Error fetching dithers:", error);
    return NextResponse.json(
      { error: "Failed to fetch dithers" },
      { status: 500 },
    );
  }
}
