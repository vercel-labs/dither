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
  hasImageAtom,
  canDownloadAtom,
  canSaveAtom,
  resetImageAtom,
  resetOptionsAtom,
} from "@/lib/atoms";
import { Header } from "@/components/header";
import { ModeToggle } from "@/components/mode-toggle";
import { UploadArea } from "@/components/upload-area";
import { GenerateArea } from "@/components/generate-area";
import { ImagePreview } from "@/components/image-preview";
import { ControlsPanel } from "@/components/controls-panel";

export default function Home() {
  const router = useRouter();

  // Atoms
  const user = useAtomValue(userAtom);
  const [originalImage, setOriginalImage] = useAtom(originalImageAtom);
  const [originalDataUrl, setOriginalDataUrl] = useAtom(originalDataUrlAtom);
  const [processedDataUrl, setProcessedDataUrl] = useAtom(processedDataUrlAtom);
  const [options, setOptions] = useAtom(ditherOptionsAtom);
  const inputMode = useAtomValue(inputModeAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const [prompt, setPrompt] = useAtom(promptAtom);
  const hasImage = useAtomValue(hasImageAtom);
  const canDownload = useAtomValue(canDownloadAtom);
  const canSave = useAtomValue(canSaveAtom);
  const resetImage = useSetAtom(resetImageAtom);
  const resetOptions = useSetAtom(resetOptionsAtom);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isNewImageRef = useRef(false); // Track if we just loaded a new image

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
      isNewImageRef.current = false; // Reset flag before saving
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

        router.push(`/d/${id}`);
      } catch (error) {
        console.error("Error auto-saving dither:", error);
        setIsSaving(false);
      }
    };

    autoSave();
  }, [processedDataUrl, user, prompt, router, setIsSaving, isSaving]);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;

      isNewImageRef.current = true; // Mark as new image for auto-save

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
      isNewImageRef.current = true; // Mark as new image for auto-save

      setOriginalDataUrl(url);
      if (promptText) setPrompt(promptText);

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setOriginalImage(img);
      img.src = url;
    },
    [setOriginalDataUrl, setOriginalImage, setPrompt],
  );

  const handleDownload = useCallback(() => {
    if (!processedDataUrl) return;
    const link = document.createElement("a");
    link.download = "dithered.png";
    link.href = processedDataUrl;
    link.click();
  }, [processedDataUrl]);

  const handleReset = useCallback(() => {
    resetImage();
  }, [resetImage]);

  const handleSave = useCallback(async () => {
    if (!processedDataUrl || !user) return;

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

      router.push(`/d/${id}`);
    } catch (error) {
      console.error("Error saving dither:", error);
      setIsSaving(false);
    }
  }, [processedDataUrl, user, prompt, router, setIsSaving]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-[#0a0a0a] font-serif selection:bg-black selection:text-white">
      <canvas ref={canvasRef} className="hidden" />

      <Header />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Panel */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          {!hasImage ? (
            <div className="w-full max-w-lg flex flex-col items-center">
              <ModeToggle />

              <div className="w-full h-[280px] sm:h-[320px] flex flex-col">
                {inputMode === "upload" ? (
                  <UploadArea onFileSelect={handleFile} />
                ) : (
                  <GenerateArea onImageGenerated={handleImageUrl} />
                )}
              </div>
            </div>
          ) : (
            <ImagePreview />
          )}
        </div>

        {/* Controls Panel */}
        <ControlsPanel
          onDownload={handleDownload}
          onSave={handleSave}
          onReset={handleReset}
          onResetSettings={resetOptions}
        />
      </main>
    </div>
  );
}
