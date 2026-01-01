"use client";

export type InputMode = "upload" | "generate";

interface ModeToggleProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="h-8 flex items-center gap-8 mb-16">
      <button
        onClick={() => onModeChange("upload")}
        className={`text-[10px] tracking-[0.3em] uppercase transition-colors ${
          mode === "upload" ? "text-black" : "text-black/30 hover:text-black/60"
        }`}
      >
        Upload
      </button>
      <span className="text-black/20">|</span>
      <button
        onClick={() => onModeChange("generate")}
        className={`text-[10px] tracking-[0.3em] uppercase transition-colors ${
          mode === "generate"
            ? "text-black"
            : "text-black/30 hover:text-black/60"
        }`}
      >
        Generate
      </button>
    </div>
  );
}
