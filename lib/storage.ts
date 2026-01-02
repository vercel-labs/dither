import { put, del } from "@vercel/blob";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join } from "path";
import { generateId } from "./id";

const isVercelBlobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Upload an image to storage (Vercel Blob or local filesystem)
 * @param data - Base64 data URL or raw base64 string
 * @param filename - Optional filename (will generate one if not provided)
 * @returns Public URL of the uploaded image
 */
export async function uploadImage(
  data: string,
  filename?: string,
): Promise<string> {
  // Extract base64 data and mime type
  let base64Data: string;
  let mimeType = "image/png";

  if (data.startsWith("data:")) {
    const matches = data.match(/^data:([^;]+);base64,(.+)$/);
    if (matches) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      throw new Error("Invalid data URL format");
    }
  } else {
    base64Data = data;
  }

  const buffer = Buffer.from(base64Data, "base64");
  const extension = mimeType.split("/")[1] || "png";
  const finalFilename = filename || `${generateId()}.${extension}`;

  if (isVercelBlobConfigured) {
    // Upload to Vercel Blob
    const blob = await put(finalFilename, buffer, {
      access: "public",
      contentType: mimeType,
      addRandomSuffix: false,
    });
    return blob.url;
  } else {
    // Store locally for development
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = join(uploadDir, finalFilename);
    await writeFile(filePath, buffer);

    // Return a URL that works in development
    return `/uploads/${finalFilename}`;
  }
}

/**
 * Delete an image from storage
 * @param url - The URL of the image to delete
 */
export async function deleteImage(url: string): Promise<void> {
  if (!url) return;

  if (isVercelBlobConfigured) {
    // Delete from Vercel Blob
    try {
      await del(url);
    } catch (error) {
      // Ignore errors if blob doesn't exist
      console.warn("Failed to delete blob:", error);
    }
  } else {
    // Delete from local filesystem
    if (url.startsWith("/uploads/")) {
      const filename = url.replace("/uploads/", "");
      const filePath = join(process.cwd(), "public", "uploads", filename);
      try {
        await unlink(filePath);
      } catch (error) {
        // Ignore errors if file doesn't exist
        console.warn("Failed to delete local file:", error);
      }
    }
  }
}
