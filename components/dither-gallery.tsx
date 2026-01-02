"use client";

import Link from "next/link";
import { useRef, useEffect, useState } from "react";
import type { DitherItem } from "@/app/page";

function SmallDitheredAvatar({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const size = 32;
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      // Simple threshold dithering for small size
      for (let i = 0; i < size * size; i++) {
        const idx = i * 4;
        const gray =
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        const value = gray < 128 ? 0 : 255;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
      }

      ctx.putImageData(imageData, 0, 0);
      setLoaded(true);
    };
    img.src = src;
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className={`border border-black ${loaded ? "opacity-100" : "opacity-0"}`}
      style={{ width: 16, height: 16, imageRendering: "pixelated" }}
    />
  );
}

function DitherCard({
  dither,
  showUser,
}: {
  dither: DitherItem;
  showUser: boolean;
}) {
  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        {showUser && (
          <Link href={`/u/${dither.userId}`}>
            {dither.userImage ? (
              <SmallDitheredAvatar src={dither.userImage} />
            ) : (
              <div className="w-4 h-4 border border-black flex items-center justify-center bg-black text-white font-mono text-[8px]">
                {dither.userName?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
          </Link>
        )}

        <Link
          href={`/d/${dither.id}`}
          className="font-mono text-[10px] text-black truncate flex-1"
        >
          {dither.title?.toUpperCase() || "UNTITLED"}
        </Link>

        {!showUser && (
          <span className="font-mono text-[10px] text-black/30">
            {dither.visibility.toUpperCase()}
          </span>
        )}

        {dither.imageUrl && (
          <a
            href={dither.imageUrl}
            download={`${dither.title || "dither"}.png`}
            className="font-mono text-[10px] text-black/30"
            onClick={(e) => e.stopPropagation()}
          >
            ↓
          </a>
        )}
      </div>

      {/* Image */}
      <Link
        href={`/d/${dither.id}`}
        className="block aspect-square relative bg-white border border-black overflow-hidden"
      >
        {dither.imageUrl && (
          <img
            src={dither.imageUrl}
            alt={dither.title || "Dither"}
            className="w-full h-full object-cover"
            style={{ imageRendering: "pixelated" }}
            loading="lazy"
          />
        )}
      </Link>
    </div>
  );
}

interface DitherGalleryProps {
  dithers: DitherItem[];
  showUser: boolean;
}

export function DitherGallery({ dithers, showUser }: DitherGalleryProps) {
  if (dithers.length === 0) {
    return (
      <p className="font-mono text-[10px] text-black/30 text-center py-8">
        NO DITHERS YET
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {dithers.map((dither) => (
        <DitherCard key={dither.id} dither={dither} showUser={showUser} />
      ))}
    </div>
  );
}
