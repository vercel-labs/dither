"use client";

import Link from "next/link";
import { useRef, useEffect, useState, useCallback } from "react";
import { useAtomValue } from "jotai";
import {
  userAtom,
  currentUserIdAtom,
  currentUserCustomAvatarAtom,
} from "@/lib/atoms";
import type { DitherItem } from "@/lib/types";
import {
  DownloadDialog,
  type DownloadOptions,
} from "@/components/download-dialog";
import { downloadImageFromUrl } from "@/lib/download";
import { Heart, Lock, Eye, Download } from "lucide-react";

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
      {isPublic ? (
        <Eye size={12} strokeWidth={1.5} />
      ) : (
        <Lock size={12} strokeWidth={1.5} />
      )}
    </button>
  );
}

function SmallDitheredAvatar({
  src,
  customSrc,
}: {
  src: string;
  customSrc?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 32;
      canvas.width = size;
      canvas.height = size;

      // If we have a custom avatar, just draw it
      if (customSrc) {
        ctx.drawImage(img, 0, 0, size, size);
        setLoaded(true);
        return;
      }

      // Otherwise apply default dithering
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
    img.src = customSrc || src;
  }, [src, customSrc]);

  return (
    <canvas
      ref={canvasRef}
      className={loaded ? "opacity-100" : "opacity-0"}
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
      className={isFavorited ? "text-black" : "text-black/30"}
    >
      <Heart
        size={12}
        strokeWidth={1.5}
        fill={isFavorited ? "currentColor" : "none"}
      />
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
  const currentUserId = useAtomValue(currentUserIdAtom);
  const currentUserCustomAvatar = useAtomValue(currentUserCustomAvatarAtom);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  // Use the global custom avatar for the current user's dithers
  const customAvatar =
    dither.userId === currentUserId
      ? currentUserCustomAvatar
      : dither.userCustomAvatar;

  const handleDownloadClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDownloadDialog(true);
  }, []);

  const handleDownload = useCallback(
    async (options: DownloadOptions) => {
      if (!dither.imageUrl) return;
      const filename = dither.title || `dither-${dither.id}`;
      await downloadImageFromUrl(dither.imageUrl, filename, options);
    },
    [dither.imageUrl, dither.title, dither.id],
  );

  return (
    <div className="flex flex-col">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-1">
        {showUser && (
          <Link href={`/u/${dither.userId}`}>
            {dither.userImage ? (
              <SmallDitheredAvatar
                src={dither.userImage}
                customSrc={customAvatar}
              />
            ) : (
              <div className="w-4 h-4 flex items-center justify-center bg-black text-white font-mono text-[8px]">
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
          <button
            onClick={handleDownloadClick}
            className="opacity-30 hover:opacity-60"
            title="Download"
          >
            <Download size={12} strokeWidth={1.5} />
          </button>
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

      <DownloadDialog
        open={showDownloadDialog}
        onOpenChange={setShowDownloadDialog}
        onDownload={handleDownload}
      />
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
