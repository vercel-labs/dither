"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import { userAtom } from "@/lib/atoms";
import type { DitherItem } from "@/lib/types";

// 8x7 pixel heart pattern
const HEART_PATTERN = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

function PixelIcon({
  pattern,
  size = 10,
}: {
  pattern: number[][];
  size?: number;
}) {
  const height = pattern.length;
  const width = pattern[0].length;
  return (
    <svg
      width={size}
      height={(size * height) / width}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
    >
      {pattern.map((row, y) =>
        row.map((pixel, x) =>
          pixel ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="black"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

function PixelHeart({
  filled,
  size = 10,
}: {
  filled?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={(size * 7) / 8}
      viewBox="0 0 8 7"
      shapeRendering="crispEdges"
    >
      {HEART_PATTERN.map((row, y) =>
        row.map((pixel, x) =>
          pixel ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={filled ? "black" : "#ccc"}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

// 7x8 pixel lock pattern (private)
const LOCK_PATTERN = [
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

// 8x6 pixel eye pattern (public)
const EYE_PATTERN = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

// 7x8 pixel download icon (arrow down + tray)
const DOWNLOAD_PATTERN = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
];

function VisibilityToggle({
  ditherId,
  initialVisibility,
}: {
  ditherId: string;
  initialVisibility: string;
}) {
  const [visibility, setVisibility] = useState(initialVisibility);
  const [isUpdating, setIsUpdating] = useState(false);
  const isPublic = visibility === "public";

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isUpdating) return;

      const newVisibility = isPublic ? "private" : "public";
      setIsUpdating(true);

      try {
        const res = await fetch(`/api/dithers/${ditherId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: newVisibility }),
        });

        if (res.ok) {
          setVisibility(newVisibility);
        }
      } catch (error) {
        console.error("Error toggling visibility:", error);
      } finally {
        setIsUpdating(false);
      }
    },
    [ditherId, isPublic, isUpdating],
  );

  return (
    <button
      onClick={handleToggle}
      title={isPublic ? "Make private" : "Make public"}
      className={isUpdating ? "opacity-10" : "opacity-30 hover:opacity-60"}
      disabled={isUpdating}
    >
      <PixelIcon pattern={isPublic ? EYE_PATTERN : LOCK_PATTERN} size={10} />
    </button>
  );
}

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

function FavoriteButton({
  ditherId,
  initialFavorited,
}: {
  ditherId: string;
  initialFavorited: boolean;
}) {
  const user = useAtomValue(userAtom);
  const [isFavorited, setIsFavorited] = useState(initialFavorited);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) return;

      try {
        if (isFavorited) {
          await fetch(`/api/favorites/${ditherId}`, { method: "DELETE" });
          setIsFavorited(false);
        } else {
          await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ditherId }),
          });
          setIsFavorited(true);
        }
      } catch (error) {
        console.error("Error toggling favorite:", error);
      }
    },
    [ditherId, user, isFavorited],
  );

  if (!user) return null;

  return (
    <button
      onClick={handleToggle}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <PixelHeart filled={isFavorited} size={10} />
    </button>
  );
}

function DitherCard({
  dither,
  showUser,
  isFavorited,
  isOwnDither,
}: {
  dither: DitherItem;
  showUser: boolean;
  isFavorited: boolean;
  isOwnDither: boolean;
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

        {isOwnDither && (
          <VisibilityToggle
            ditherId={dither.id}
            initialVisibility={dither.visibility}
          />
        )}

        {dither.imageUrl && (
          <a
            href={dither.imageUrl}
            download={`${dither.title || "dither"}.png`}
            className="opacity-30"
            onClick={(e) => e.stopPropagation()}
            title="Download"
          >
            <PixelIcon pattern={DOWNLOAD_PATTERN} size={10} />
          </a>
        )}

        <FavoriteButton ditherId={dither.id} initialFavorited={isFavorited} />
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
  favoritedIds?: string[];
  isOwnDithers?: boolean;
}

export function DitherGallery({
  dithers,
  showUser,
  favoritedIds = [],
  isOwnDithers = false,
}: DitherGalleryProps) {
  if (dithers.length === 0) {
    return (
      <p className="font-mono text-[10px] text-black/30 text-center py-8">
        NO DITHERS YET
      </p>
    );
  }

  const favoritedSet = new Set(favoritedIds);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {dithers.map((dither) => (
        <DitherCard
          key={dither.id}
          dither={dither}
          showUser={showUser}
          isFavorited={favoritedSet.has(dither.id)}
          isOwnDither={isOwnDithers}
        />
      ))}
    </div>
  );
}
