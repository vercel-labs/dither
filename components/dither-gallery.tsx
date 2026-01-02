import Link from "next/link";
import type { DitherItem } from "@/app/page";

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
          <div className="w-4 h-4 border border-black flex items-center justify-center bg-black text-white font-mono text-[8px]">
            {dither.userName?.charAt(0).toUpperCase() || "?"}
          </div>
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
