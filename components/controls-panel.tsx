"use client";

import { useAtom, useAtomValue } from "jotai";
import { Slider } from "./slider";
import {
  ditherOptionsAtom,
  hasImageAtom,
  canSaveAtom,
  isSavingAtom,
} from "@/lib/atoms";

interface ControlsPanelProps {
  onSave: () => void;
  onDownload: () => void;
  saveLabel?: string;
  alwaysEnableSave?: boolean;
}

export function ControlsPanel({
  onSave,
  onDownload,
  saveLabel = "Save",
  alwaysEnableSave = false,
}: ControlsPanelProps) {
  const [options, setOptions] = useAtom(ditherOptionsAtom);
  const hasImage = useAtomValue(hasImageAtom);
  const canSaveAtomValue = useAtomValue(canSaveAtom);
  const canSave = alwaysEnableSave || canSaveAtomValue;
  const isSaving = useAtomValue(isSavingAtom);

  if (!hasImage) return null;

  return (
    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-black/10 p-4 sm:p-8 shrink-0 overflow-y-auto">
      {/* Mobile layout */}
      <div className="lg:hidden space-y-6">
        {/* Sliders in 2-column grid on mobile */}
        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <Slider
            label="Threshold"
            value={options.threshold}
            onChange={(v) => setOptions({ ...options, threshold: v })}
            min={0}
            max={255}
          />

          <Slider
            label="Contrast"
            value={options.contrast}
            onChange={(v) => setOptions({ ...options, contrast: v })}
            min={0.5}
            max={2}
            step={0.05}
            formatValue={(v) => v.toFixed(2)}
          />

          <Slider
            label="Brightness"
            value={options.brightness}
            onChange={(v) => setOptions({ ...options, brightness: v })}
            min={-100}
            max={100}
          />
        </div>

        {/* Actions - side by side on mobile */}
        <div className="flex gap-3 pt-4 border-t border-black/10">
          <button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="flex-1 text-[10px] py-3 border border-black 
              bg-black text-white active:bg-transparent active:text-black transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : saveLabel}
          </button>
          <button
            onClick={onDownload}
            className="text-[10px] px-4 py-3 
              text-black/40 active:text-black transition-colors"
          >
            Download
          </button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex lg:flex-col lg:h-full">
        {/* Sliders */}
        <div className="flex-1 space-y-6 overflow-y-auto">
          <Slider
            label="Threshold"
            value={options.threshold}
            onChange={(v) => setOptions({ ...options, threshold: v })}
            min={0}
            max={255}
          />

          <Slider
            label="Contrast"
            value={options.contrast}
            onChange={(v) => setOptions({ ...options, contrast: v })}
            min={0.5}
            max={2}
            step={0.05}
            formatValue={(v) => v.toFixed(2)}
          />

          <Slider
            label="Brightness"
            value={options.brightness}
            onChange={(v) => setOptions({ ...options, brightness: v })}
            min={-100}
            max={100}
          />
        </div>

        {/* Actions */}
        <div className="pt-8 border-t border-black/10 space-y-3 flex-shrink-0">
          <button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="w-full text-[10px] py-3 border border-black 
              bg-black text-white hover:bg-transparent hover:text-black transition-colors
              disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSaving ? "Saving..." : saveLabel}
          </button>
          <button
            onClick={onDownload}
            className="w-full text-[10px] py-3 border border-black/20
              text-black/60 hover:border-black hover:text-black transition-colors"
          >
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
