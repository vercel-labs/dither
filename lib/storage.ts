import { put } from "@vercel/blob";
import { writeFile, mkdir } from "fs/promises";
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
