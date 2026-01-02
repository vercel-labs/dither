import type { DownloadOptions } from "@/components/download-dialog";

/**
 * Simple GIF encoder for 1-bit (black and white) images
 */
export async function createGIF(canvas: HTMLCanvasElement): Promise<string> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/png");

  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;

  // Build GIF binary data
  const gif: number[] = [];

  // GIF Header
  gif.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a

  // Logical Screen Descriptor
  gif.push(width & 0xff, (width >> 8) & 0xff); // Width
  gif.push(height & 0xff, (height >> 8) & 0xff); // Height
  gif.push(0x80); // Global color table flag, 1 bit color resolution, sorted flag, size of global color table (2 colors)
  gif.push(0x00); // Background color index
  gif.push(0x00); // Pixel aspect ratio

  // Global Color Table (2 colors: black and white)
  gif.push(0x00, 0x00, 0x00); // Index 0: Black
  gif.push(0xff, 0xff, 0xff); // Index 1: White

  // Image Descriptor
  gif.push(0x2c); // Image separator
  gif.push(0x00, 0x00); // Left position
  gif.push(0x00, 0x00); // Top position
  gif.push(width & 0xff, (width >> 8) & 0xff); // Width
  gif.push(height & 0xff, (height >> 8) & 0xff); // Height
  gif.push(0x00); // Local color table flag

  // Image Data using LZW compression
  const minCodeSize = 2; // Minimum LZW code size
  gif.push(minCodeSize);

  // Convert pixels to indices (0 = black, 1 = white)
  const indices: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    indices.push(pixels[i] === 0 ? 0 : 1);
  }

  // Simple LZW encoding
  const lzwEncode = (indices: number[], minCodeSize: number): number[] => {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;

    let codeSize = minCodeSize + 1;
    let nextCode = eoiCode + 1;
    const maxCode = 4096;

    const dictionary = new Map<string, number>();
    for (let i = 0; i < clearCode; i++) {
      dictionary.set(String(i), i);
    }

    const output: number[] = [];
    let bitBuffer = 0;
    let bitCount = 0;

    const writeBits = (code: number, bits: number) => {
      bitBuffer |= code << bitCount;
      bitCount += bits;
      while (bitCount >= 8) {
        output.push(bitBuffer & 0xff);
        bitBuffer >>= 8;
        bitCount -= 8;
      }
    };

    writeBits(clearCode, codeSize);

    let current = String(indices[0]);
    for (let i = 1; i < indices.length; i++) {
      const next = current + "," + indices[i];
      if (dictionary.has(next)) {
        current = next;
      } else {
        writeBits(dictionary.get(current)!, codeSize);

        if (nextCode < maxCode) {
          dictionary.set(next, nextCode++);
          if (nextCode > 1 << codeSize && codeSize < 12) {
            codeSize++;
          }
        }

        current = String(indices[i]);
      }
    }

    writeBits(dictionary.get(current)!, codeSize);
    writeBits(eoiCode, codeSize);

    if (bitCount > 0) {
      output.push(bitBuffer & 0xff);
    }

    return output;
  };

  const lzwData = lzwEncode(indices, minCodeSize);

  // Write sub-blocks
  let offset = 0;
  while (offset < lzwData.length) {
    const chunkSize = Math.min(255, lzwData.length - offset);
    gif.push(chunkSize);
    for (let i = 0; i < chunkSize; i++) {
      gif.push(lzwData[offset + i]);
    }
    offset += chunkSize;
  }
  gif.push(0x00); // Block terminator

  // GIF Trailer
  gif.push(0x3b);

  // Convert to base64
  const binary = String.fromCharCode(...gif);
  return "data:image/gif;base64," + btoa(binary);
}

/**
 * Apply transparency to a canvas by converting white pixels to transparent
 */
export function applyTransparency(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    // If pixel is white (255, 255, 255), make it transparent
    if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
      data[i + 3] = 0; // Set alpha to 0
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Download a canvas as an image file with the specified options
 */
export async function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  options: DownloadOptions,
): Promise<void> {
  const link = document.createElement("a");

  if (options.format === "gif") {
    const gifDataUrl = await createGIF(canvas);
    link.download = `${filename}.gif`;
    link.href = gifDataUrl;
  } else {
    if (options.transparent) {
      applyTransparency(canvas);
    }
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL("image/png");
  }

  link.click();
}

/**
 * Download an image from URL with the specified options
 */
export async function downloadImageFromUrl(
  imageUrl: string,
  filename: string,
  options: DownloadOptions,
): Promise<void> {
  // For PNG without transparency, we can direct download
  if (options.format === "png" && !options.transparent) {
    const link = document.createElement("a");
    link.download = `${filename}.png`;
    link.href = imageUrl;
    link.click();
    return;
  }

  // Otherwise, load image into canvas for processing
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      await downloadCanvas(canvas, filename, options);
      resolve();
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageUrl;
  });
}
