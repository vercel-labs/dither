"use client";

import { useAtom } from "jotai";
import { inputModeAtom, type InputMode } from "@/lib/atoms";

export type { InputMode };

export function ModeToggle() {
  const [mode, setMode] = useAtom(inputModeAtom);

  return (
    <div className="h-8 flex items-center gap-8 mb-16">
      <button
        onClick={() => setMode("upload")}
        className={`text-[10px] tracking-[0.3em] uppercase transition-colors ${
          mode === "upload" ? "text-black" : "text-black/30 hover:text-black/60"
        }`}
      >
        Upload
      </button>
      <span className="text-black/20">|</span>
      <button
        onClick={() => setMode("generate")}
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
