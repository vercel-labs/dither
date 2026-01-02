import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dithers } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { list } from "@vercel/blob";
import { readFile } from "fs/promises";
import { join } from "path";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Valid ID pattern (alphanumeric only, matching nanoid output)
const VALID_ID_PATTERN = /^[a-zA-Z0-9]+$/;

function isValidId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && VALID_ID_PATTERN.test(id);
}

const isVercelBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!isValidId(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    // Check if dither exists and user has access
    const dither = await db.query.dithers.findFirst({
      where: eq(dithers.id, id),
    });

    if (!dither) {
      return NextResponse.json({ error: "Dither not found" }, { status: 404 });
    }

    // Check visibility
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

    const originalFilename = `dithers/${id}-original.png`;

    if (isVercelBlobConfigured) {
      // Find the original in Vercel Blob
      const { blobs } = await list({ prefix: originalFilename });
      const originalBlob = blobs.find((b) => b.pathname === originalFilename);

      if (originalBlob) {
        // Redirect to the blob URL
        return NextResponse.redirect(originalBlob.url);
      }
    } else {
      // Local development - serve from public/uploads
      try {
        const localFilename = `${id}-original.png`;
        const filePath = join(
          process.cwd(),
          "public",
          "uploads",
          "dithers",
          localFilename,
        );
        const fileBuffer = await readFile(filePath);

        return new NextResponse(fileBuffer, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        });
      } catch {
        // File not found
      }
    }

    return NextResponse.json(
      { error: "Original image not found" },
      { status: 404 },
    );
  } catch (error) {
    console.error("Error fetching original image:", error);
    return NextResponse.json(
      { error: "Failed to fetch original image" },
      { status: 500 },
    );
  }
}
