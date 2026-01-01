import { nanoid } from "nanoid";

/**
 * Generate a unique ID using nanoid
 * Safe to use on both frontend and backend
 * @param size - Length of the ID (default: 21)
 */
export function generateId(size = 21): string {
  return nanoid(size);
}
