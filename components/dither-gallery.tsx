"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { userAtom } from "@/lib/atoms";
import { Globe, Lock } from "lucide-react";
import Link from "next/link";

interface DitherItem {
  id: string;
  title: string | null;
  imageUrl: string | null;
  visibility: string;
  createdAt: string;
  userId: string;
  userName: string | null;
  userImage: string | null;
}

interface GalleryData {
  myDithers: DitherItem[];
  publicDithers: DitherItem[];
}

function DitherCard({ dither, isOwn }: { dither: DitherItem; isOwn: boolean }) {
  return (
    <Link
      href={`/d/${dither.id}`}
      className="group block aspect-square relative bg-black/5 overflow-hidden hover:ring-2 hover:ring-black/20 transition-all"
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
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="absolute bottom-0 left-0 right-0 p-2 translate-y-full group-hover:translate-y-0 transition-transform">
        <p className="text-[10px] text-white truncate font-medium">
          {dither.title || "Untitled"}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {isOwn ? (
            dither.visibility === "private" ? (
              <Lock className="w-2.5 h-2.5 text-white/60" />
            ) : (
              <Globe className="w-2.5 h-2.5 text-white/60" />
            )
          ) : (
            <span className="text-[9px] text-white/60 truncate">
              {dither.userName || "Anonymous"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function GallerySection({
  title,
  dithers,
  isOwn,
  emptyMessage,
}: {
  title: string;
  dithers: DitherItem[];
  isOwn: boolean;
  emptyMessage?: string;
}) {
  if (dithers.length === 0 && !emptyMessage) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-[10px] text-black/40 tracking-[0.2em]">{title}</h2>
      {dithers.length === 0 ? (
        <p className="text-xs text-black/30">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {dithers.map((dither) => (
            <DitherCard key={dither.id} dither={dither} isOwn={isOwn} />
          ))}
        </div>
      )}
    </div>
  );
}

export function DitherGallery() {
  const user = useAtomValue(userAtom);
  const [data, setData] = useState<GalleryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDithers = async () => {
      try {
        const response = await fetch("/api/dithers");
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error("Error fetching dithers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDithers();
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8 text-center">
        <div className="inline-block w-4 h-4 border border-black/20 border-t-black/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const hasAnyDithers =
    data.myDithers.length > 0 || data.publicDithers.length > 0;

  if (!hasAnyDithers) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {user && data.myDithers.length > 0 && (
        <GallerySection
          title="My Dithers"
          dithers={data.myDithers}
          isOwn={true}
        />
      )}
      {data.publicDithers.length > 0 && (
        <GallerySection
          title="Public Dithers"
          dithers={data.publicDithers}
          isOwn={false}
        />
      )}
    </div>
  );
}
