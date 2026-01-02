export interface DitherOptions {
  threshold: number;
  contrast: number;
  brightness: number;
}

export const defaultOptions: DitherOptions = {
  threshold: 255,
  contrast: 1,
  brightness: -100,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyContrastBrightness(
  value: number,
  contrast: number,
  brightness: number,
): number {
  // Apply brightness first, then contrast
  let result = value + brightness;
  result = (result - 128) * contrast + 128;
  return clamp(result, 0, 255);
}

function toGrayscale(r: number, g: number, b: number): number {
  // Luminosity method for perceptual grayscale
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

export function applyDither(
  imageData: ImageData,
  options: DitherOptions,
): ImageData {
  const { threshold, contrast, brightness } = options;
  const width = imageData.width;
  const height = imageData.height;
  const data = new Uint8ClampedArray(imageData.data);

  // Convert to grayscale and apply contrast/brightness
  const grayscale = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const gray = toGrayscale(data[idx], data[idx + 1], data[idx + 2]);
    grayscale[i] = applyContrastBrightness(gray, contrast, brightness);
  }

  // Atkinson dithering
  const errors = new Float32Array(grayscale);
  const output = new Uint8ClampedArray(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx];
      const newPixel = oldPixel < threshold ? 0 : 255;
      output[idx] = newPixel;
      const error = (oldPixel - newPixel) / 8;

      // Atkinson dithering distributes only 6/8 of the error
      if (x + 1 < width) errors[idx + 1] += error;
      if (x + 2 < width) errors[idx + 2] += error;
      if (y + 1 < height) {
        if (x > 0) errors[idx + width - 1] += error;
        errors[idx + width] += error;
        if (x + 1 < width) errors[idx + width + 1] += error;
      }
      if (y + 2 < height) {
        errors[idx + width * 2] += error;
      }
    }
  }

  // Create output ImageData
  const resultData = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const value = output[i];
    resultData[i * 4] = value;
    resultData[i * 4 + 1] = value;
    resultData[i * 4 + 2] = value;
    resultData[i * 4 + 3] = data[i * 4 + 3]; // Preserve alpha
  }

  return new ImageData(resultData, width, height);
}
