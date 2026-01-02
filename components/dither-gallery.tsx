"use client";

import { useState, useEffect } from "react";
import { useAtomValue } from "jotai";
import { userAtom } from "@/lib/atoms";
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
      className="group block aspect-square relative border-2 border-black bg-white overflow-hidden hover:translate-x-1 hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_#000]"
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

      {/* Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 bg-white border-t-2 border-black px-2 py-1.5 translate-y-full group-hover:translate-y-0">
        <p className="text-xs truncate font-bold">
          {dither.title || "Untitled"}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-black/60 truncate">
          {isOwn ? `[${dither.visibility}]` : dither.userName || "Anonymous"}
        </p>
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
    <section>
      <div className="flex items-center justify-between mb-4 pb-2 border-b-2 border-black">
        <h2 className="text-xs uppercase tracking-wider font-bold">{title}</h2>
        <span className="text-xs uppercase tracking-wider">
          {dithers.length}
        </span>
      </div>
      {dithers.length === 0 ? (
        <p className="text-xs text-black/50">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {dithers.map((dither) => (
            <DitherCard key={dither.id} dither={dither} isOwn={isOwn} />
          ))}
        </div>
      )}
    </section>
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
      <div className="max-w-4xl mx-auto py-12 text-center">
        <span className="text-xs uppercase tracking-wider">Loading...</span>
      </div>
    );
  }

  if (!data) return null;

  const hasAnyDithers =
    data.myDithers.length > 0 || data.publicDithers.length > 0;

  if (!hasAnyDithers) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      {user && data.myDithers.length > 0 && (
        <GallerySection
          title="Your Dithers"
          dithers={data.myDithers}
          isOwn={true}
        />
      )}
      {data.publicDithers.length > 0 && (
        <GallerySection
          title="Community"
          dithers={data.publicDithers}
          isOwn={false}
        />
      )}
    </div>
  );
}
