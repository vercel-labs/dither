import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { dithers, VISIBILITY_OPTIONS, type Visibility } from "@/lib/db/schema";
import { uploadImage, deleteImage } from "@/lib/storage";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

/**
 * Generate a short hash for cache busting
 */
function generateHash(): string {
  return Date.now().toString(36);
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid ID pattern (alphanumeric only, matching nanoid output)
const VALID_ID_PATTERN = /^[a-zA-Z0-9]+$/;

function isValidId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && VALID_ID_PATTERN.test(id);
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

    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const body = await request.json();

    // Build update object from allowed fields
    const updates: Partial<{
      visibility: Visibility;
      imageUrl: string;
      threshold: string;
      contrast: string;
      brightness: string;
      title: string;
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

    // Handle image upload - delete old processed image and create new one with hash for cache busting
    if (body.imageData) {
      // Get existing dither to find old image URL
      const existingDither = await db.query.dithers.findFirst({
        where: and(eq(dithers.id, id), eq(dithers.userId, session.user.id)),
      });

      // Delete old processed image if it exists (only dither images, not originals)
      if (existingDither?.imageUrl) {
        await deleteImage(existingDither.imageUrl);
      }

      // Upload new processed image: dithers/{id}-{hash}-dither.png
      const hash = generateHash();
      const imageUrl = await uploadImage(
        body.imageData,
        `dithers/${id}-${hash}-dither.png`,
      );
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

    // Handle title update
    if (body.title !== undefined) {
      updates.title = String(body.title).slice(0, 100); // Limit title length
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

    // Revalidate caches
    revalidatePath("/");
    revalidatePath("/my");

    return NextResponse.json({ dither });
  } catch (error) {
    console.error("Error updating dither:", error);
    return NextResponse.json(
      { error: "Failed to update dither" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

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

    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Get the dither first to find associated images
    const existingDither = await db.query.dithers.findFirst({
      where: and(eq(dithers.id, id), eq(dithers.userId, session.user.id)),
    });

    if (!existingDither) {
      return NextResponse.json(
        { error: "Dither not found or not authorized" },
        { status: 404 },
      );
    }

    // Delete associated images from storage
    const deletePromises: Promise<void>[] = [];

    // Delete processed image if it exists
    if (existingDither.imageUrl) {
      deletePromises.push(deleteImage(existingDither.imageUrl));

      // Delete original image (derive URL from processed image URL)
      const originalUrl = existingDither.imageUrl.replace(
        /-[a-z0-9]+-dither\.png$/i,
        "-original.png",
      );
      deletePromises.push(deleteImage(originalUrl));
    }

    // Wait for all image deletions (don't fail if some don't exist)
    await Promise.allSettled(deletePromises);

    // Delete the dither from database
    await db
      .delete(dithers)
      .where(and(eq(dithers.id, id), eq(dithers.userId, session.user.id)));

    // Revalidate caches
    revalidatePath("/");
    revalidatePath("/my");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting dither:", error);
    return NextResponse.json(
      { error: "Failed to delete dither" },
      { status: 500 },
    );
  }
}
