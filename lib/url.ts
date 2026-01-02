// Get the base URL for the application (used for OAuth callbacks)
export function getBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  // Development fallback
  return "http://localhost:3000";
}

// Convert processed image URL to original image URL
// {id}-{hash}-dither.png -> {id}-original.png
export function getOriginalImageUrl(processedUrl: string): string {
  return processedUrl.replace(/-[a-z0-9]+-dither\.png$/i, "-original.png");
}
