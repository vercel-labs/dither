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
  onSave: () => void;
  onResetSettings: () => void;
  canDownload: boolean;
  canSave: boolean;
  isSaving: boolean;
  visible: boolean;
}

export function ControlsPanel({
  options,
  onOptionsChange,
  onDownload,
  onSave,
  onResetSettings,
  canDownload,
  canSave,
  isSaving,
  visible,
}: ControlsPanelProps) {
  const showThreshold = ["floyd-steinberg", "atkinson", "threshold"].includes(
    options.algorithm,
  );

  if (!visible) return null;

  return (
    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-black/10 p-4 sm:p-8 flex-shrink-0">
      {/* Mobile: Horizontal layout for algorithm */}
      <div className="lg:hidden space-y-6">
        {/* Algorithm - horizontal scroll on mobile */}
        <div className="space-y-3">
          <h3 className="text-[10px] tracking-[0.3em] uppercase text-black/40">
            Algorithm
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:-mx-8 sm:px-8">
            {algorithms.map((algo) => (
              <button
                key={algo.value}
                onClick={() =>
                  onOptionsChange({ ...options, algorithm: algo.value })
                }
                className={`flex-shrink-0 text-[10px] tracking-[0.15em] uppercase px-3 py-2 border transition-colors ${
                  options.algorithm === algo.value
                    ? "border-black bg-black text-white"
                    : "border-black/20 text-black/40 active:border-black active:text-black"
                }`}
              >
                {algo.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders in 2-column grid on mobile */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
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

        {/* Actions - side by side on mobile */}
        <div className="flex gap-3 pt-4 border-t border-black/10">
          <button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="flex-1 text-[10px] tracking-[0.3em] uppercase py-3 border border-black 
              bg-black text-white active:bg-transparent active:text-black transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onDownload}
            disabled={!canDownload}
            className="text-[10px] tracking-[0.3em] uppercase px-4 py-3 
              text-black/40 active:text-black transition-colors"
          >
            Download
          </button>
          <button
            onClick={onResetSettings}
            className="text-[10px] tracking-[0.3em] uppercase px-4 py-3 
              text-black/40 active:text-black transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Desktop: Original vertical layout */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        <div className="flex-1 space-y-10 overflow-y-auto">
          {/* Algorithm */}
          <div className="space-y-4">
            <h3 className="text-[10px] tracking-[0.3em] uppercase text-black/40">
              Algorithm
            </h3>
            <div className="space-y-2">
              {algorithms.map((algo) => (
                <button
                  key={algo.value}
                  onClick={() =>
                    onOptionsChange({ ...options, algorithm: algo.value })
                  }
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
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="w-full text-[10px] tracking-[0.3em] uppercase py-3 border border-black 
              bg-black text-white hover:bg-transparent hover:text-black transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={onDownload}
            disabled={!canDownload}
            className="w-full text-[10px] tracking-[0.3em] uppercase py-3 border border-black/20
              text-black/60 hover:border-black hover:text-black transition-colors
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
    </div>
  );
}
