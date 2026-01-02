import { generateText } from "ai";

/**
 * Generate a 2-3 word title from a prompt
 */
export async function generateTitleFromPrompt(prompt: string): Promise<string> {
  try {
    const result = await generateText({
      model: "openai/gpt-4o-mini",
      prompt: `Generate a creative 2-3 word title for an image with this description: "${prompt}". 
Only respond with the title, nothing else. No quotes, no punctuation, just 2-3 words.`,
      maxOutputTokens: 20,
    });

    return result.text.trim();
  } catch (error) {
    console.error("Error generating title from prompt:", error);
    // Fallback: extract first 2-3 meaningful words from prompt
    return extractTitleFromPrompt(prompt);
  }
}

/**
 * Fallback: extract a simple title from the prompt
 */
function extractTitleFromPrompt(prompt: string): string {
  // Remove common filler words and get first few meaningful words
  const fillerWords = new Set([
    "a",
    "an",
    "the",
    "of",
    "in",
    "on",
    "at",
    "to",
    "for",
    "with",
    "and",
    "or",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "could",
    "should",
    "may",
    "might",
    "must",
    "that",
    "this",
    "these",
    "those",
    "i",
    "you",
    "he",
    "she",
    "it",
    "we",
    "they",
    "my",
    "your",
    "his",
    "her",
    "its",
    "our",
    "their",
    "generate",
    "create",
    "make",
    "show",
    "draw",
    "render",
    "picture",
    "image",
  ]);

  const words = prompt
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !fillerWords.has(word))
    .slice(0, 3);

  if (words.length === 0) {
    return "Untitled Dither";
  }

  // Capitalize first letter of each word
  return words
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
