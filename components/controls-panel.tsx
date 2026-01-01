"use client";

import { Slider } from "./slider";
import type { DitherOptions, DitherAlgorithm } from "@/lib/dither";

const algorithms: { value: DitherAlgorithm; label: string }[] = [
  { value: "floyd-steinberg", label: "FLOYD-STEINBERG" },
  { value: "atkinson", label: "ATKINSON" },
  { value: "ordered", label: "ORDERED" },
  { value: "bayer", label: "BAYER" },
  { value: "threshold", label: "THRESHOLD" },
];

interface ControlsPanelProps {
  options: DitherOptions;
  onOptionsChange: (options: DitherOptions) => void;
  onDownload: () => void;
  onResetSettings: () => void;
  canDownload: boolean;
  visible: boolean;
}

export function ControlsPanel({ 
  options, 
  onOptionsChange, 
  onDownload, 
  onResetSettings,
  canDownload,
  visible 
}: ControlsPanelProps) {
  const showThreshold = ["floyd-steinberg", "atkinson", "threshold"].includes(options.algorithm);

  return (
    <div 
      className={`w-72 border-l border-black/10 p-8 flex flex-col flex-shrink-0 transition-opacity ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none absolute right-0 top-14 bottom-0"
      }`}
    >
      <div className="flex-1 space-y-10 overflow-y-auto">
        {/* Algorithm */}
        <div className="space-y-4">
          <h3 className="text-[10px] tracking-[0.3em] uppercase text-black/40">Algorithm</h3>
          <div className="space-y-2">
            {algorithms.map((algo) => (
              <button
                key={algo.value}
                onClick={() => onOptionsChange({ ...options, algorithm: algo.value })}
                className={`block w-full text-left text-xs tracking-[0.15em] py-2 transition-colors ${
                  options.algorithm === algo.value
                    ? "text-black"
                    : "text-black/30 hover:text-black/60"
                }`}
              >
                {algo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-6">
          {showThreshold && (
            <Slider
              label="Threshold"
              value={options.threshold}
              onChange={(v) => onOptionsChange({ ...options, threshold: v })}
              min={0}
              max={255}
            />
          )}

          <Slider
            label="Contrast"
            value={options.contrast}
            onChange={(v) => onOptionsChange({ ...options, contrast: v })}
            min={0.5}
            max={2}
            step={0.05}
            formatValue={(v) => v.toFixed(2)}
          />

          <Slider
            label="Brightness"
            value={options.brightness}
            onChange={(v) => onOptionsChange({ ...options, brightness: v })}
            min={-100}
            max={100}
          />

          <Slider
            label="Scale"
            value={options.scale}
            onChange={(v) => onOptionsChange({ ...options, scale: v })}
            min={1}
            max={8}
            formatValue={(v) => `${v}×`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="pt-8 border-t border-black/10 space-y-3 flex-shrink-0">
        <button
          onClick={onDownload}
          disabled={!canDownload}
          className="w-full text-[10px] tracking-[0.3em] uppercase py-3 border border-black 
            bg-black text-white hover:bg-transparent hover:text-black transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Download
        </button>
        <button
          onClick={onResetSettings}
          className="w-full text-[10px] tracking-[0.3em] uppercase py-3 
            text-black/40 hover:text-black transition-colors"
        >
          Reset Settings
        </button>
      </div>
    </div>
  );
}

