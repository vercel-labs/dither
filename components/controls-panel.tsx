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
  forceShow?: boolean;
}

export function ControlsPanel({
  onSave,
  onDownload,
  saveLabel = "Save",
  alwaysEnableSave = false,
  forceShow = false,
}: ControlsPanelProps) {
  const [options, setOptions] = useAtom(ditherOptionsAtom);
  const hasImage = useAtomValue(hasImageAtom);
  const canSaveAtomValue = useAtomValue(canSaveAtom);
  const canSave = alwaysEnableSave || canSaveAtomValue;
  const isSaving = useAtomValue(isSavingAtom);

  if (!hasImage && !forceShow) return null;

  return (
    <div className="w-full lg:w-56 border-t lg:border-t-0 lg:border-l border-black/20 bg-[#fafafa] p-4 shrink-0">
      <div className="mb-4 pb-2 border-b border-black/10">
        <span className="font-mono text-[10px] text-black/40">CONTROLS</span>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden space-y-4">
        <div className="grid grid-cols-3 gap-4">
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

        <div className="flex gap-2 pt-2">
          <button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="flex-1 font-mono text-[10px] py-2 bg-black text-white disabled:opacity-30"
          >
            {isSaving ? "..." : saveLabel.toUpperCase()}
          </button>
          <button
            onClick={onDownload}
            className="font-mono text-[10px] px-3 py-2 border border-black/20 text-black/60"
          >
            ↓
          </button>
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:block">
        <div className="space-y-6">
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

        <div className="pt-6 space-y-2 mt-6 border-t border-black/10">
          <button
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="w-full font-mono text-[10px] py-2 bg-black text-white disabled:opacity-30"
          >
            {isSaving ? "..." : saveLabel.toUpperCase()}
          </button>
          <button
            onClick={onDownload}
            className="w-full font-mono text-[10px] py-2 border border-black/20 text-black/60"
          >
            DOWNLOAD
          </button>
        </div>
      </div>
    </div>
  );
}
