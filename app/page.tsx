"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { applyDither, defaultOptions, type DitherOptions } from "@/lib/dither";
import { Header } from "@/components/header";
import { ModeToggle, type InputMode } from "@/components/mode-toggle";
import { UploadArea } from "@/components/upload-area";
import { GenerateArea } from "@/components/generate-area";
import { ImagePreview } from "@/components/image-preview";
import { ControlsPanel } from "@/components/controls-panel";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<DitherOptions>(defaultOptions);
  const [inputMode, setInputMode] = useState<InputMode>("upload");

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const processImage = useCallback(
    (img: HTMLImageElement, opts: DitherOptions) => {
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
    [],
  );

  useEffect(() => {
    if (originalImage) {
      processImage(originalImage, options);
    }
  }, [originalImage, options, processImage]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalDataUrl(dataUrl);

      const img = new window.Image();
      img.onload = () => setOriginalImage(img);
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUrl = useCallback((url: string) => {
    setOriginalDataUrl(url);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOriginalImage(img);
    img.src = url;
  }, []);

  const handleDownload = useCallback(() => {
    if (!processedDataUrl) return;
    const link = document.createElement("a");
    link.download = "dithered.png";
    link.href = processedDataUrl;
    link.click();
  }, [processedDataUrl]);

  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setOriginalDataUrl(null);
    setProcessedDataUrl(null);
    setOptions(defaultOptions);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#0a0a0a] font-serif selection:bg-black selection:text-white">
      <canvas ref={canvasRef} className="hidden" />

      <Header />

      <main className="min-h-[calc(100vh-56px)] flex flex-col lg:flex-row">
        {/* Main Panel */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          {!originalImage ? (
            <div className="w-full max-w-lg flex flex-col items-center">
              <ModeToggle mode={inputMode} onModeChange={setInputMode} />

              <div className="w-full h-[280px] sm:h-[320px] flex flex-col">
                {inputMode === "upload" ? (
                  <UploadArea onFileSelect={handleFile} />
                ) : (
                  <GenerateArea onImageGenerated={handleImageUrl} />
                )}
              </div>
            </div>
          ) : (
            <ImagePreview
              src={processedDataUrl || originalDataUrl || ""}
              isProcessing={isProcessing}
            />
          )}
        </div>

        {/* Controls Panel */}
        <ControlsPanel
          options={options}
          onOptionsChange={setOptions}
          onDownload={handleDownload}
          onResetSettings={() => setOptions(defaultOptions)}
          canDownload={!!processedDataUrl}
          visible={!!originalImage}
        />
      </main>
    </div>
  );
}
