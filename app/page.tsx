"use client";

import { useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { applyDither } from "@/lib/dither";
import { generateId } from "@/lib/id";
import {
  userAtom,
  originalImageAtom,
  originalDataUrlAtom,
  processedDataUrlAtom,
  ditherOptionsAtom,
  isProcessingAtom,
  isSavingAtom,
  promptAtom,
  resetImageAtom,
  resetOptionsAtom,
} from "@/lib/atoms";
import { Header } from "@/components/header";
import { GenerateArea } from "@/components/generate-area";
import { DitherGallery } from "@/components/dither-gallery";

export default function Home() {
  const router = useRouter();

  const user = useAtomValue(userAtom);
  const [originalImage, setOriginalImage] = useAtom(originalImageAtom);
  const [originalDataUrl, setOriginalDataUrl] = useAtom(originalDataUrlAtom);
  const [processedDataUrl, setProcessedDataUrl] = useAtom(processedDataUrlAtom);
  const options = useAtomValue(ditherOptionsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [prompt, setPrompt] = useAtom(promptAtom);
  const resetImage = useSetAtom(resetImageAtom);
  const resetOptions = useSetAtom(resetOptionsAtom);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isNewImageRef = useRef(false);

  const processImage = useCallback(
    (img: HTMLImageElement, opts: typeof options) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsProcessing(true);

      requestAnimationFrame(() => {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dithered = applyDither(imageData, opts);
        ctx.putImageData(dithered, 0, 0);

        setProcessedDataUrl(canvas.toDataURL("image/png"));
        setIsProcessing(false);
      });
    },
    [setIsProcessing, setProcessedDataUrl],
  );

  useEffect(() => {
    if (originalImage) {
      processImage(originalImage, options);
    }
  }, [originalImage, options, processImage]);

  useEffect(() => {
    if (!isNewImageRef.current || !processedDataUrl || !user || isSaving)
      return;

    const autoSave = async () => {
      isNewImageRef.current = false;
      setIsSaving(true);
      const id = generateId();

      try {
        const response = await fetch("/api/dithers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            prompt,
            originalImageData: originalDataUrl,
            processedImageData: processedDataUrl,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save dither");
        }

        resetImage();
        router.push(`/d/${id}`);
      } catch (error) {
        console.error("Error auto-saving dither:", error);
        setIsSaving(false);
        resetImage();
      }
    };

    autoSave();
  }, [
    processedDataUrl,
    originalDataUrl,
    user,
    prompt,
    router,
    setIsSaving,
    isSaving,
    resetImage,
  ]);

  const handleImageUrl = useCallback(
    (url: string, promptText?: string) => {
      isNewImageRef.current = true;

      // Reset to default dither options for new images
      resetOptions();

      setOriginalDataUrl(url);
      if (promptText) setPrompt(promptText);

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setOriginalImage(img);
      img.src = url;
    },
    [setOriginalDataUrl, setOriginalImage, setPrompt, resetOptions],
  );

  const isWorking = isProcessing || isSaving;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white text-black">
      <canvas ref={canvasRef} className="hidden" />

      <Header />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Hero */}
        <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-3">
              Generate.
              <br />
              Dither.
              <br />
              Share.
            </h1>
            <p className="text-sm text-black/60 uppercase tracking-wider">
              AI images → 1-bit art
            </p>
          </div>

          <div className="w-full flex justify-center relative">
            <GenerateArea onImageGenerated={handleImageUrl} />

            {isWorking && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
                <div className="border-2 border-black px-4 py-2 bg-white">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    {isProcessing ? "Processing..." : "Saving..."}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Gallery */}
        <section className="px-4 pb-16 pt-12">
          <DitherGallery />
        </section>
      </main>
    </div>
  );
}
