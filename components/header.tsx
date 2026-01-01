"use client";

interface HeaderProps {
  showReset: boolean;
  onReset: () => void;
}

export function Header({ showReset, onReset }: HeaderProps) {
  return (
    <header className="h-14 border-b border-black/10 flex-shrink-0">
      <div className="max-w-[1400px] mx-auto px-8 h-full flex items-center justify-between">
        <h1 className="text-xs tracking-[0.3em] uppercase">Dither</h1>
        {showReset && (
          <button
            onClick={onReset}
            className="text-[10px] tracking-[0.2em] uppercase text-black/40 hover:text-black transition-colors"
          >
            Reset
          </button>
        )}
      </div>
    </header>
  );
}

