import Link from "next/link";

export default function Loading() {
  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
      {/* Header */}
      <header className="border-b border-black">
        <div className="px-4 h-10 flex items-center justify-between">
          <Link href="/" className="font-mono text-xs">
            DITHER
          </Link>
          <div className="w-8 h-8 bg-black/10 border border-black/10" />
        </div>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-mono text-sm tracking-wider mb-2">
                GENERATE. DITHER. SHARE.
              </h1>
              <p className="font-mono text-xs text-black/40">
                AI IMAGES → 1-BIT ART
              </p>
            </div>

            <div className="w-full">
              <div className="border border-black flex flex-col">
                <textarea
                  placeholder="DESCRIBE YOUR IMAGE..."
                  rows={1}
                  disabled
                  className="w-full px-3 py-3 text-sm bg-transparent placeholder:text-black/30 focus:outline-none resize-none min-h-[44px] max-h-[120px] font-mono"
                />
                <div className="flex items-center justify-between border-t border-black/20 px-3 py-2">
                  <div className="relative">
                    <button
                      className="font-mono text-[10px] text-black/50"
                      disabled
                    >
                      GEMINI FLASH
                    </button>
                  </div>
                  <button
                    disabled
                    className="font-mono text-xs px-4 py-1 bg-black text-white disabled:opacity-30"
                  >
                    GENERATE
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="px-4 pb-16">
          <div className="max-w-2xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-black/10 pb-2">
              <Link
                href="/"
                className="font-mono text-xs pb-2 -mb-2 border-b text-black/40 border-transparent"
              >
                Popular
              </Link>
              <span className="font-mono text-xs pb-2 -mb-2 border-b text-black border-black">
                Favorites
              </span>
              <Link
                href="/my"
                className="font-mono text-xs pb-2 -mb-2 border-b text-black/40 border-transparent"
              >
                My Dithers
              </Link>
            </div>

            {/* Gallery grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 border border-black/10 bg-black/5" />
                    <div className="h-2 flex-1 bg-black/10" />
                    <div className="w-3 h-3 bg-black/10" />
                    <div className="w-3 h-3 bg-black/10" />
                  </div>
                  <div className="aspect-square bg-black/5 border border-black/10" />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
