"use client";

import { useAtomValue } from "jotai";
import {
  processedDataUrlAtom,
  originalDataUrlAtom,
  isProcessingAtom,
} from "@/lib/atoms";

export function ImagePreview() {
  const processedDataUrl = useAtomValue(processedDataUrlAtom);
  const originalDataUrl = useAtomValue(originalDataUrlAtom);
  const isProcessing = useAtomValue(isProcessingAtom);

  const src = processedDataUrl || originalDataUrl || "";

  return (
    <div className="relative w-full h-full min-h-[200px] sm:min-h-[300px] flex items-center justify-center">
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fafafa]/80 z-10">
          <span className="text-[10px] tracking-[0.3em] uppercase text-black/40">
            Processing...
          </span>
        </div>
      )}
      <img
        src={src}
        alt="Dithered"
        className="max-w-full max-h-[50vh] lg:max-h-[70vh] object-contain"
      />
    </div>
  );
}
