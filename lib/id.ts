import { customAlphabet } from "nanoid";

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const nanoid = customAlphabet(alphabet);

/**
 * Generate a unique ID using nanoid
 * Only uses alphanumeric characters (a-zA-Z0-9)
 * @param size - Length of the ID (default: 21)
 */
export function generateId(size = 21): string {
  return nanoid(size);
}
