export type DitherAlgorithm = 'floyd-steinberg' | 'ordered' | 'atkinson' | 'bayer' | 'threshold';

export interface DitherOptions {
  algorithm: DitherAlgorithm;
  threshold: number;
  contrast: number;
  brightness: number;
  scale: number;
}

export const defaultOptions: DitherOptions = {
  algorithm: 'floyd-steinberg',
  threshold: 128,
  contrast: 1,
  brightness: 0,
  scale: 1,
};

// Bayer matrix for ordered dithering
const bayerMatrix4x4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

const bayerMatrix8x8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function applyContrastBrightness(
  value: number,
  contrast: number,
  brightness: number
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
  options: DitherOptions
): ImageData {
  const { algorithm, threshold, contrast, brightness, scale } = options;
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

  // Apply scaling for pixelated effect
  if (scale > 1) {
    const scaledWidth = Math.ceil(width / scale);
    const scaledHeight = Math.ceil(height / scale);
    
    for (let sy = 0; sy < scaledHeight; sy++) {
      for (let sx = 0; sx < scaledWidth; sx++) {
        let sum = 0;
        let count = 0;
        
        for (let dy = 0; dy < scale && sy * scale + dy < height; dy++) {
          for (let dx = 0; dx < scale && sx * scale + dx < width; dx++) {
            const idx = (sy * scale + dy) * width + (sx * scale + dx);
            sum += grayscale[idx];
            count++;
          }
        }
        
        const avg = sum / count;
        
        for (let dy = 0; dy < scale && sy * scale + dy < height; dy++) {
          for (let dx = 0; dx < scale && sx * scale + dx < width; dx++) {
            const idx = (sy * scale + dy) * width + (sx * scale + dx);
            grayscale[idx] = avg;
          }
        }
      }
    }
  }

  let output: Uint8ClampedArray;

  switch (algorithm) {
    case 'floyd-steinberg':
      output = floydSteinberg(grayscale, width, height, threshold);
      break;
    case 'atkinson':
      output = atkinson(grayscale, width, height, threshold);
      break;
    case 'ordered':
      output = orderedDither(grayscale, width, height, bayerMatrix4x4, 16);
      break;
    case 'bayer':
      output = orderedDither(grayscale, width, height, bayerMatrix8x8, 64);
      break;
    case 'threshold':
      output = thresholdDither(grayscale, width, height, threshold);
      break;
    default:
      output = floydSteinberg(grayscale, width, height, threshold);
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

function thresholdDither(
  grayscale: Float32Array,
  width: number,
  height: number,
  threshold: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height);
  
  for (let i = 0; i < grayscale.length; i++) {
    output[i] = grayscale[i] < threshold ? 0 : 255;
  }
  
  return output;
}

function floydSteinberg(
  grayscale: Float32Array,
  width: number,
  height: number,
  threshold: number
): Uint8ClampedArray {
  const errors = new Float32Array(grayscale);
  const output = new Uint8ClampedArray(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldPixel = errors[idx];
      const newPixel = oldPixel < threshold ? 0 : 255;
      output[idx] = newPixel;
      const error = oldPixel - newPixel;

      // Distribute error to neighboring pixels
      if (x + 1 < width) {
        errors[idx + 1] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (x > 0) {
          errors[idx + width - 1] += error * (3 / 16);
        }
        errors[idx + width] += error * (5 / 16);
        if (x + 1 < width) {
          errors[idx + width + 1] += error * (1 / 16);
        }
      }
    }
  }

  return output;
}

function atkinson(
  grayscale: Float32Array,
  width: number,
  height: number,
  threshold: number
): Uint8ClampedArray {
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

  return output;
}

function orderedDither(
  grayscale: Float32Array,
  width: number,
  height: number,
  matrix: number[][],
  matrixScale: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height);
  const matrixSize = matrix.length;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const matrixValue = matrix[y % matrixSize][x % matrixSize];
      const threshold = ((matrixValue + 0.5) / matrixScale) * 255;
      output[idx] = grayscale[idx] < threshold ? 0 : 255;
    }
  }

  return output;
}

