import { generateText } from "ai";

export interface GeminiImageResult {
  image: {
    base64: string;
    mimeType: string;
  } | null;
  text: string;
}

/**
 * Generate an image using Gemini's text-to-image capability.
 * These models use generateText under the hood and extract the generated image.
 */
export async function generateGeminiImage(
  prompt: string,
  modelId: string = "google/gemini-2.5-flash-image",
): Promise<GeminiImageResult> {
  // Append instruction to ensure image generation
  const enhancedPrompt = `${prompt}\n\nGenerate an image based on this description. Only output the image, no text.`;

  const result = await generateText({
    model: modelId,
    prompt: enhancedPrompt,
  });

  // Extract the first image from files
  // Note: Gemini returns files with `base64Data` and `mediaType` properties
  const imageFile = result.files?.find((file) =>
    (file as { mediaType?: string }).mediaType?.startsWith("image/"),
  );

  const fileWithData = imageFile as
    | { base64Data?: string; mediaType?: string }
    | undefined;

  return {
    image:
      fileWithData?.base64Data && fileWithData?.mediaType
        ? {
            base64: fileWithData.base64Data,
            mimeType: fileWithData.mediaType,
          }
        : null,
    text: result.text,
  };
}

/**
 * Generate an image and return it as a data URL ready for display.
 */
export async function generateGeminiImageUrl(
  prompt: string,
  modelId: string = "google/gemini-2.5-flash-image",
): Promise<string | null> {
  const result = await generateGeminiImage(prompt, modelId);

  if (!result.image) {
    return null;
  }

  return `data:${result.image.mimeType};base64,${result.image.base64}`;
}

