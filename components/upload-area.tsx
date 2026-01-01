"use client";

import { useRef, useState, useCallback } from "react";

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
}

export function UploadArea({ onFileSelect }: UploadAreaProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      className={`
        w-full h-full border cursor-pointer
        flex items-center justify-center transition-colors
        ${isDragging ? "border-black bg-black/[0.02]" : "border-black/20 hover:border-black/40"}
      `}
    >
      <span className="text-[10px] tracking-[0.3em] uppercase text-black/40">
        {isDragging ? "Drop" : "Select Image"}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        className="hidden"
      />
    </div>
  );
}

