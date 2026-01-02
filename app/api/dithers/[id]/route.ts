import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dithers, VISIBILITY_OPTIONS, type Visibility } from "@/lib/db/schema";
import { uploadImage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Build update object from allowed fields
    const updates: Partial<{
      visibility: Visibility;
      imageUrl: string;
      threshold: string;
      contrast: string;
      brightness: string;
    }> = {};

    if (body.visibility !== undefined) {
      if (!VISIBILITY_OPTIONS.includes(body.visibility)) {
        return NextResponse.json(
          {
            error: `Invalid visibility. Must be one of: ${VISIBILITY_OPTIONS.join(", ")}`,
          },
          { status: 400 },
        );
      }
      updates.visibility = body.visibility;
    }

    // Handle image upload
    if (body.imageData) {
      const imageUrl = await uploadImage(body.imageData, `${id}.png`);
      updates.imageUrl = imageUrl;
    }

    // Handle dither settings
    if (body.threshold !== undefined) {
      updates.threshold = String(body.threshold);
    }
    if (body.contrast !== undefined) {
      updates.contrast = String(body.contrast);
    }
    if (body.brightness !== undefined) {
      updates.brightness = String(body.brightness);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 },
      );
    }

    // Update the dither (only if owned by user)
    const [dither] = await db
      .update(dithers)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(dithers.id, id), eq(dithers.userId, session.user.id)))
      .returning();

    if (!dither) {
      return NextResponse.json(
        { error: "Dither not found or not authorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ dither });
  } catch (error) {
    console.error("Error updating dither:", error);
    return NextResponse.json(
      {
        error: `Failed to update dither: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const dither = await db.query.dithers.findFirst({
      where: eq(dithers.id, id),
    });

    if (!dither) {
      return NextResponse.json({ error: "Dither not found" }, { status: 404 });
    }

    // Check if the dither is private
    if (dither.visibility === "private") {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user || session.user.id !== dither.userId) {
        return NextResponse.json(
          { error: "Not authorized to view this dither" },
          { status: 403 },
        );
      }
    }

    return NextResponse.json({ dither });
  } catch (error) {
    console.error("Error fetching dither:", error);
    return NextResponse.json(
      { error: "Failed to fetch dither" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Delete the dither (only if owned by user)
    const [deleted] = await db
      .delete(dithers)
      .where(and(eq(dithers.id, id), eq(dithers.userId, session.user.id)))
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Dither not found or not authorized" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dither:", error);
    return NextResponse.json(
      {
        error: `Failed to delete dither: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
