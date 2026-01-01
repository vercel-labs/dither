// Get the base URL for the application (used for OAuth callbacks)
export function getBaseUrl(): string {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL;
  }
  // Development fallback
  return "http://localhost:3000";
}
