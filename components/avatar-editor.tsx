"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { applyDither } from "@/lib/dither";
import { Slider } from "./slider";

interface AvatarEditorProps {
  src: string;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export function AvatarEditor({ src, onClose, onSave }: AvatarEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(
    null,
  );
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [options, setOptions] = useState({
    threshold: 128,
    contrast: 1.3,
    brightness: 5,
  });

  // Load the original image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOriginalImage(img);
    img.src = src;
  }, [src]);

  // Process image when options change
  useEffect(() => {
    if (!originalImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const size = 128;
    canvas.width = size;
    canvas.height = size;

    ctx.drawImage(originalImage, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const dithered = applyDither(imageData, options);
    ctx.putImageData(dithered, 0, 0);

    setProcessedDataUrl(canvas.toDataURL("image/png"));
  }, [originalImage, options]);

  const handleSave = useCallback(() => {
    if (processedDataUrl) {
      onSave(processedDataUrl);
    }
  }, [processedDataUrl, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#fafafa] border border-black p-4 w-full max-w-xs">
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] text-black/50">AVATAR</span>
          <button onClick={onClose} className="font-mono text-xs">
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="flex justify-center mb-4">
          <canvas
            ref={canvasRef}
            className="border border-black"
            style={{ width: 96, height: 96, imageRendering: "pixelated" }}
          />
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-4">
          <Slider
            label="Threshold"
            value={options.threshold}
            onChange={(v) => setOptions({ ...options, threshold: v })}
            min={0}
            max={255}
          />
          <Slider
            label="Contrast"
            value={options.contrast}
            onChange={(v) => setOptions({ ...options, contrast: v })}
            min={0.5}
            max={2}
            step={0.05}
            formatValue={(v) => v.toFixed(2)}
          />
          <Slider
            label="Brightness"
            value={options.brightness}
            onChange={(v) => setOptions({ ...options, brightness: v })}
            min={-100}
            max={100}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 font-mono text-[10px] py-2 border border-black/20 text-black/60"
          >
            CANCEL
          </button>
          <button
            onClick={handleSave}
            className="flex-1 font-mono text-[10px] py-2 bg-black text-white"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}
