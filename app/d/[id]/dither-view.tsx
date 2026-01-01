"use client";

import { useRef, useCallback, useEffect } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { applyDither } from "@/lib/dither";
import {
  originalImageAtom,
  originalDataUrlAtom,
  processedDataUrlAtom,
  ditherOptionsAtom,
  isProcessingAtom,
  promptAtom,
  resetOptionsAtom,
} from "@/lib/atoms";
import { Header } from "@/components/header";
import { ImagePreview } from "@/components/image-preview";
import { ControlsPanel } from "@/components/controls-panel";

interface DitherViewProps {
  id: string;
  imageUrl: string;
  prompt: string | null;
}

export function DitherView({
  id,
  imageUrl,
  prompt: initialPrompt,
}: DitherViewProps) {
  // Atoms
  const [originalImage, setOriginalImage] = useAtom(originalImageAtom);
  const [originalDataUrl, setOriginalDataUrl] = useAtom(originalDataUrlAtom);
  const [processedDataUrl, setProcessedDataUrl] = useAtom(processedDataUrlAtom);
  const [options, setOptions] = useAtom(ditherOptionsAtom);
  const [isProcessing, setIsProcessing] = useAtom(isProcessingAtom);
  const [prompt, setPrompt] = useAtom(promptAtom);
  const resetOptions = useSetAtom(resetOptionsAtom);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load the saved image on mount
  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);

    // For a saved dither, the imageUrl IS already the processed image
    // So we just display it directly without re-processing
    setProcessedDataUrl(imageUrl);
    setOriginalDataUrl(imageUrl);

    // Also load it as an image element for potential re-processing
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOriginalImage(img);
    img.src = imageUrl;
  }, [
    imageUrl,
    initialPrompt,
    setPrompt,
    setProcessedDataUrl,
    setOriginalDataUrl,
    setOriginalImage,
  ]);

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

  // Re-process when options change (but not on initial load)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (originalImage) {
      processImage(originalImage, options);
    }
  }, [options, originalImage, processImage]);

  const handleDownload = useCallback(() => {
    if (!processedDataUrl) return;
    const link = document.createElement("a");
    link.download = `dither-${id}.png`;
    link.href = processedDataUrl;
    link.click();
  }, [processedDataUrl, id]);

  const handleReset = useCallback(() => {
    // Go back to home page
    window.location.href = "/";
  }, []);

  const handleSave = useCallback(() => {
    // Already saved - just download
    handleDownload();
  }, [handleDownload]);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-[#0a0a0a] font-serif selection:bg-black selection:text-white">
      <canvas ref={canvasRef} className="hidden" />

      <Header />

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Panel */}
        <div className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          <ImagePreview />
        </div>

        {/* Controls Panel */}
        <ControlsPanel
          onDownload={handleDownload}
          onSave={handleSave}
          onReset={handleReset}
          onResetSettings={resetOptions}
          saveLabel="Download"
          resetLabel="New Dither"
          alwaysEnableSave
        />
      </main>
    </div>
  );
}
