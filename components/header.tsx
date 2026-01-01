"use client";

export function Header() {
  return (
    <header className="h-14 border-b border-black/10 flex-shrink-0">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-full flex items-center">
        <a href="/" className="text-xs tracking-[0.3em] uppercase hover:text-black/60 transition-colors">Dither</a>
      </div>
    </header>
  );
}
