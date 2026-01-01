"use client";

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { defaultOptions, type DitherOptions } from "./dither";
import { createCookieStorage } from "./cookie-storage";

// =============================================================================
// User & Auth Atoms
// =============================================================================

export interface User {
  name: string | null;
  image: string | null;
}

export const userAtom = atom<User | null>(null);
export const providersAtom = atom<string[]>([]);

// =============================================================================
// Image State Atoms
// =============================================================================

export const originalImageAtom = atom<HTMLImageElement | null>(null);
export const originalDataUrlAtom = atom<string | null>(null);
export const processedDataUrlAtom = atom<string | null>(null);

// Derived atom: has image loaded
export const hasImageAtom = atom((get) => get(originalImageAtom) !== null);

// =============================================================================
// Dither Options Atoms
// =============================================================================

export const ditherOptionsAtom = atom<DitherOptions>(defaultOptions);

// Individual option atoms for fine-grained updates
export const algorithmAtom = atom(
  (get) => get(ditherOptionsAtom).algorithm,
  (get, set, algorithm: DitherOptions["algorithm"]) => {
    set(ditherOptionsAtom, { ...get(ditherOptionsAtom), algorithm });
  },
);

export const thresholdAtom = atom(
  (get) => get(ditherOptionsAtom).threshold,
  (get, set, threshold: number) => {
    set(ditherOptionsAtom, { ...get(ditherOptionsAtom), threshold });
  },
);

export const contrastAtom = atom(
  (get) => get(ditherOptionsAtom).contrast,
  (get, set, contrast: number) => {
    set(ditherOptionsAtom, { ...get(ditherOptionsAtom), contrast });
  },
);

export const brightnessAtom = atom(
  (get) => get(ditherOptionsAtom).brightness,
  (get, set, brightness: number) => {
    set(ditherOptionsAtom, { ...get(ditherOptionsAtom), brightness });
  },
);

export const scaleAtom = atom(
  (get) => get(ditherOptionsAtom).scale,
  (get, set, scale: number) => {
    set(ditherOptionsAtom, { ...get(ditherOptionsAtom), scale });
  },
);

// =============================================================================
// UI State Atoms
// =============================================================================

export type InputMode = "upload" | "generate";

export const inputModeAtom = atomWithStorage<InputMode>(
  "input-mode",
  "upload",
  createCookieStorage<InputMode>(),
);
export const isProcessingAtom = atom(false);
export const isSavingAtom = atom(false);
export const promptAtom = atom<string | null>(null);

// =============================================================================
// Generate Area Atoms
// =============================================================================

export const aiModels = [
  { id: "bfl/flux-kontext-max", name: "FLUX MAX" },
  { id: "bfl/flux-kontext-pro", name: "FLUX PRO" },
  { id: "google/gemini-2.5-flash-image", name: "GEMINI FLASH" },
  { id: "google/gemini-3-pro-image", name: "GEMINI PRO" },
] as const;

export type AiModelId = (typeof aiModels)[number]["id"];

export const selectedModelAtom = atom<AiModelId>(aiModels[0].id);
export const generatePromptAtom = atomWithStorage<string>(
  "generate-prompt",
  "",
  createCookieStorage<string>(),
);
export const isGeneratingAtom = atom(false);
export const generateErrorAtom = atom<string | null>(null);

// =============================================================================
// Derived / Computed Atoms
// =============================================================================

// Can download when there's a processed image
export const canDownloadAtom = atom(
  (get) => get(processedDataUrlAtom) !== null,
);

// Can save when there's a processed image AND user is signed in
export const canSaveAtom = atom(
  (get) => get(processedDataUrlAtom) !== null && get(userAtom) !== null,
);

// Show threshold slider for certain algorithms
export const showThresholdAtom = atom((get) => {
  const algorithm = get(algorithmAtom);
  return ["floyd-steinberg", "atkinson", "threshold"].includes(algorithm);
});

// =============================================================================
// Actions (write-only atoms for complex operations)
// =============================================================================

// Reset all image state
export const resetImageAtom = atom(null, (get, set) => {
  set(originalImageAtom, null);
  set(originalDataUrlAtom, null);
  set(processedDataUrlAtom, null);
  set(ditherOptionsAtom, defaultOptions);
  set(promptAtom, null);
});

// Reset only dither options
export const resetOptionsAtom = atom(null, (get, set) => {
  set(ditherOptionsAtom, defaultOptions);
});
