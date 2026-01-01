"use client";

interface ImagePreviewProps {
  src: string;
  isProcessing: boolean;
}

export function ImagePreview({ src, isProcessing }: ImagePreviewProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
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
        className="max-w-full max-h-full object-contain"
      />
    </div>
  );
}

