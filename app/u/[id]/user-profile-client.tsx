"use client";

import { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/header";

interface DitherItem {
  id: string;
  title: string | null;
  imageUrl: string | null;
  visibility: string;
  status: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
  userImage: string | null;
}

interface User {
  id: string;
  name: string | null;
  image: string | null;
}

function LargeDitheredAvatar({ src }: { src: string }) {
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

      const size = 128;
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(img, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;

      const grayscale = new Float32Array(size * size);

      for (let i = 0; i < size * size; i++) {
        const idx = i * 4;
        const gray =
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        grayscale[i] = Math.max(0, Math.min(255, (gray - 128) * 1.3 + 128));
      }

      // Floyd-Steinberg dithering
      const errors = new Float32Array(grayscale);
      const output = new Uint8ClampedArray(size * size);

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = y * size + x;
          const oldPixel = errors[idx];
          const newPixel = oldPixel < 128 ? 0 : 255;
          output[idx] = newPixel;
          const error = oldPixel - newPixel;

          if (x + 1 < size) errors[idx + 1] += error * (7 / 16);
          if (y + 1 < size) {
            if (x > 0) errors[idx + size - 1] += error * (3 / 16);
            errors[idx + size] += error * (5 / 16);
            if (x + 1 < size) errors[idx + size + 1] += error * (1 / 16);
          }
        }
      }

      for (let i = 0; i < size * size; i++) {
        data[i * 4] = output[i];
        data[i * 4 + 1] = output[i];
        data[i * 4 + 2] = output[i];
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
      style={{ width: 64, height: 64, imageRendering: "pixelated" }}
    />
  );
}

function DitherCard({ dither }: { dither: DitherItem }) {
  return (
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
  );
}

interface UserProfileClientProps {
  user: User;
  dithers: DitherItem[];
}

export function UserProfileClient({ user, dithers }: UserProfileClientProps) {
  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
      <Header />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Profile header */}
        <section className="py-8 px-4 border-b border-black/10">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            {user.image ? (
              <LargeDitheredAvatar src={user.image} />
            ) : (
              <div className="w-16 h-16 bg-black text-white text-xl flex items-center justify-center font-mono border border-black">
                {user.name?.charAt(0).toUpperCase() || "?"}
              </div>
            )}
            <div>
              <h1 className="font-mono text-sm">
                {user.name?.toUpperCase() || "USER"}
              </h1>
              <p className="font-mono text-[10px] text-black/40">
                {dithers.length} PUBLIC DITHER{dithers.length !== 1 ? "S" : ""}
              </p>
            </div>
          </div>
        </section>

        {/* Dithers grid */}
        <section className="px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {dithers.length === 0 ? (
              <p className="font-mono text-[10px] text-black/30 text-center py-8">
                NO PUBLIC DITHERS YET
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {dithers.map((dither) => (
                  <DitherCard key={dither.id} dither={dither} />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
