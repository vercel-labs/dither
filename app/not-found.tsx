import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
      {/* Header */}
      <header className="border-b border-black">
        <div className="px-4 h-10 flex items-center">
          <Link href="/" className="font-mono text-xs">
            DITHER
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center">
        <div className="text-center px-4">
          <div className="mb-8">
            {/* Pixel 404 */}
            <svg
              width="120"
              height="40"
              viewBox="0 0 30 10"
              shapeRendering="crispEdges"
              className="mx-auto"
            >
              {/* 4 */}
              <rect x="0" y="0" width="1" height="1" fill="black" />
              <rect x="0" y="1" width="1" height="1" fill="black" />
              <rect x="0" y="2" width="1" height="1" fill="black" />
              <rect x="0" y="3" width="1" height="1" fill="black" />
              <rect x="0" y="4" width="1" height="1" fill="black" />
              <rect x="1" y="4" width="1" height="1" fill="black" />
              <rect x="2" y="4" width="1" height="1" fill="black" />
              <rect x="3" y="4" width="1" height="1" fill="black" />
              <rect x="3" y="0" width="1" height="1" fill="black" />
              <rect x="3" y="1" width="1" height="1" fill="black" />
              <rect x="3" y="2" width="1" height="1" fill="black" />
              <rect x="3" y="3" width="1" height="1" fill="black" />
              <rect x="3" y="5" width="1" height="1" fill="black" />
              <rect x="3" y="6" width="1" height="1" fill="black" />
              <rect x="3" y="7" width="1" height="1" fill="black" />
              <rect x="3" y="8" width="1" height="1" fill="black" />
              <rect x="3" y="9" width="1" height="1" fill="black" />

              {/* 0 */}
              <rect x="6" y="0" width="1" height="1" fill="black" />
              <rect x="7" y="0" width="1" height="1" fill="black" />
              <rect x="8" y="0" width="1" height="1" fill="black" />
              <rect x="5" y="1" width="1" height="1" fill="black" />
              <rect x="9" y="1" width="1" height="1" fill="black" />
              <rect x="5" y="2" width="1" height="1" fill="black" />
              <rect x="9" y="2" width="1" height="1" fill="black" />
              <rect x="5" y="3" width="1" height="1" fill="black" />
              <rect x="9" y="3" width="1" height="1" fill="black" />
              <rect x="5" y="4" width="1" height="1" fill="black" />
              <rect x="9" y="4" width="1" height="1" fill="black" />
              <rect x="5" y="5" width="1" height="1" fill="black" />
              <rect x="9" y="5" width="1" height="1" fill="black" />
              <rect x="5" y="6" width="1" height="1" fill="black" />
              <rect x="9" y="6" width="1" height="1" fill="black" />
              <rect x="5" y="7" width="1" height="1" fill="black" />
              <rect x="9" y="7" width="1" height="1" fill="black" />
              <rect x="5" y="8" width="1" height="1" fill="black" />
              <rect x="9" y="8" width="1" height="1" fill="black" />
              <rect x="6" y="9" width="1" height="1" fill="black" />
              <rect x="7" y="9" width="1" height="1" fill="black" />
              <rect x="8" y="9" width="1" height="1" fill="black" />

              {/* 4 */}
              <rect x="11" y="0" width="1" height="1" fill="black" />
              <rect x="11" y="1" width="1" height="1" fill="black" />
              <rect x="11" y="2" width="1" height="1" fill="black" />
              <rect x="11" y="3" width="1" height="1" fill="black" />
              <rect x="11" y="4" width="1" height="1" fill="black" />
              <rect x="12" y="4" width="1" height="1" fill="black" />
              <rect x="13" y="4" width="1" height="1" fill="black" />
              <rect x="14" y="4" width="1" height="1" fill="black" />
              <rect x="14" y="0" width="1" height="1" fill="black" />
              <rect x="14" y="1" width="1" height="1" fill="black" />
              <rect x="14" y="2" width="1" height="1" fill="black" />
              <rect x="14" y="3" width="1" height="1" fill="black" />
              <rect x="14" y="5" width="1" height="1" fill="black" />
              <rect x="14" y="6" width="1" height="1" fill="black" />
              <rect x="14" y="7" width="1" height="1" fill="black" />
              <rect x="14" y="8" width="1" height="1" fill="black" />
              <rect x="14" y="9" width="1" height="1" fill="black" />
            </svg>
          </div>

          <p className="font-mono text-xs text-black/50 mb-8">PAGE NOT FOUND</p>

          <Link
            href="/"
            className="inline-block font-mono text-xs px-4 py-2 bg-black text-white"
          >
            GO HOME
          </Link>
        </div>
      </main>
    </div>
  );
}
