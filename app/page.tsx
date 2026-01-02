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
  inputModeAtom,
  isProcessingAtom,
  isSavingAtom,
  promptAtom,
  resetImageAtom,
} from "@/lib/atoms";
import { Header } from "@/components/header";
import { ModeToggle } from "@/components/mode-toggle";
import { UploadArea } from "@/components/upload-area";
import { GenerateArea } from "@/components/generate-area";
import { DitherGallery } from "@/components/dither-gallery";

export default function Home() {
  const router = useRouter();

  // Atoms
  const user = useAtomValue(userAtom);
  const [originalImage, setOriginalImage] = useAtom(originalImageAtom);
  const setOriginalDataUrl = useSetAtom(originalDataUrlAtom);
  const [processedDataUrl, setProcessedDataUrl] = useAtom(processedDataUrlAtom);
  const options = useAtomValue(ditherOptionsAtom);
  const inputMode = useAtomValue(inputModeAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [prompt, setPrompt] = useAtom(promptAtom);
  const resetImage = useSetAtom(resetImageAtom);

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

  // Auto-save and redirect when a new image is processed
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
            imageData: processedDataUrl,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to save dither");
        }

        // Reset state before navigating
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
    user,
    prompt,
    router,
    setIsSaving,
    isSaving,
    resetImage,
  ]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      isNewImageRef.current = true;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setOriginalDataUrl(dataUrl);

        const img = new window.Image();
        img.onload = () => setOriginalImage(img);
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    },
    [setOriginalDataUrl, setOriginalImage],
  );

  const handleImageUrl = useCallback(
    (url: string, promptText?: string) => {
      isNewImageRef.current = true;

      setOriginalDataUrl(url);
      if (promptText) setPrompt(promptText);

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setOriginalImage(img);
      img.src = url;
    },
    [setOriginalDataUrl, setOriginalImage, setPrompt],
  );

  const isWorking = isProcessing || isSaving;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-[#0a0a0a] font-serif selection:bg-black selection:text-white">
      <canvas ref={canvasRef} className="hidden" />

      <Header />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Upload/Generate Area */}
        <div className="flex items-center justify-center p-4 sm:p-8 pt-8 sm:pt-12 max-h-[80vh]">
          <div className="w-full max-w-lg flex flex-col items-center">
            <ModeToggle />

            <div className="w-full h-[280px] sm:h-[320px] flex flex-col relative">
              {inputMode === "upload" ? (
                <UploadArea onFileSelect={handleFile} disabled={isWorking} />
              ) : (
                <GenerateArea onImageGenerated={handleImageUrl} />
              )}

              {/* Processing/Saving overlay */}
              {isWorking && (
                <div className="absolute inset-0 bg-[#fafafa]/90 flex items-center justify-center z-10">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-6 h-6 border-2 border-black/20 border-t-black/60 rounded-full animate-spin" />
                    <span className="text-xs text-black/60">
                      {isProcessing ? "Processing..." : "Saving..."}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Gallery Section */}
        <div className="px-4 sm:px-8 pb-8">
          <DitherGallery />
        </div>
      </main>
    </div>
  );
}
