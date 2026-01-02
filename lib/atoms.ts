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
  id?: string;
}

export const userAtom = atom<User | null>(null);
export const providersAtom = atom<string[]>([]);
export const currentUserIdAtom = atom<string | null>(null);
export const currentUserCustomAvatarAtom = atom<string | null>(null);

// =============================================================================
// Image State Atoms
// =============================================================================

export const originalImageAtom = atom<HTMLImageElement | null>(null);
export const originalDataUrlAtom = atom<string | null>(null);
export const processedDataUrlAtom = atom<string | null>(null);
// Track which dither the processedDataUrl belongs to
export const processedDitherIdAtom = atom<string | null>(null);

// Derived atom: has image (check original URL, original image element, or processed)
export const hasImageAtom = atom(
  (get) =>
    get(originalDataUrlAtom) !== null ||
    get(originalImageAtom) !== null ||
    get(processedDataUrlAtom) !== null,
);

// =============================================================================
// Dither Options Atoms
// =============================================================================

export const ditherOptionsAtom = atom<DitherOptions>(defaultOptions);

// Individual option atoms for fine-grained updates
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

// =============================================================================
// UI State Atoms
// =============================================================================

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

export const selectedModelAtom = atomWithStorage<AiModelId>(
  "selected-model",
  aiModels[0].id,
  createCookieStorage<AiModelId>(),
);
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

// =============================================================================
// Header State Atoms (for page-specific header content)
// =============================================================================

export type Visibility = "public" | "private";

export interface HeaderState {
  title: string | null;
  visibility: Visibility | null;
  isOwner: boolean;
  isUpdatingVisibility: boolean;
  isDeleting: boolean;
  isFavorited: boolean;
  showFavorite: boolean;
}

const defaultHeaderState: HeaderState = {
  title: null,
  visibility: null,
  isOwner: false,
  isUpdatingVisibility: false,
  isDeleting: false,
  isFavorited: false,
  showFavorite: false,
};

export const headerStateAtom = atom<HeaderState>(defaultHeaderState);

// Callbacks for header actions (set by pages)
export const headerCallbacksAtom = atom<{
  onVisibilityChange: ((visibility: Visibility) => void) | null;
  onDelete: (() => void) | null;
  onFavoriteToggle: (() => void) | null;
  onTitleEdit: ((newTitle: string) => void) | null;
}>({
  onVisibilityChange: null,
  onDelete: null,
  onFavoriteToggle: null,
  onTitleEdit: null,
});

// Reset header to default state (used when navigating away from pages with header content)
export const resetHeaderAtom = atom(null, (get, set) => {
  set(headerStateAtom, defaultHeaderState);
  set(headerCallbacksAtom, {
    onVisibilityChange: null,
    onDelete: null,
    onFavoriteToggle: null,
    onTitleEdit: null,
  });
});

// =============================================================================
// Actions (write-only atoms for complex operations)
// =============================================================================

// Reset all image state
export const resetImageAtom = atom(null, (get, set) => {
  set(originalImageAtom, null);
  set(originalDataUrlAtom, null);
  set(processedDataUrlAtom, null);
  set(processedDitherIdAtom, null);
  set(ditherOptionsAtom, defaultOptions);
  set(promptAtom, null);
});

// Reset only dither options
export const resetOptionsAtom = atom(null, (get, set) => {
  set(ditherOptionsAtom, defaultOptions);
});
