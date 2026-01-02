"use client";

import {
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import {
  userAtom,
  originalImageAtom,
  originalDataUrlAtom,
  processedDataUrlAtom,
  processedDitherIdAtom,
  ditherOptionsAtom,
  isProcessingAtom,
  isSavingAtom,
  promptAtom,
  resetImageAtom,
  headerStateAtom,
  headerCallbacksAtom,
  resetHeaderAtom,
  type Visibility,
} from "@/lib/atoms";
import { applyDither } from "@/lib/dither";
import type { DitherOptions } from "@/lib/dither";
import { ImagePreview } from "@/components/image-preview";
import { ControlsPanel } from "@/components/controls-panel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DownloadDialog,
  type DownloadOptions,
} from "@/components/download-dialog";
import { getOriginalImageUrl } from "@/lib/url";
import type { DitherStatus } from "@/lib/db/schema";

interface DitherViewProps {
  id: string;
  imageUrl: string | null;
  title: string | null;
  prompt: string | null;
  visibility: Visibility;
  status: DitherStatus;
  errorMessage?: string | null;
  isOwner: boolean;
  savedSettings: DitherOptions;
}

function getOriginalUrlFromId(id: string): string {
  return `/api/dithers/${id}/original`;
}

export function DitherView({
  id,
  imageUrl: initialImageUrl,
  title: initialTitle,
  prompt: initialPrompt,
  visibility: initialVisibility,
  status: initialStatus,
  errorMessage: initialErrorMessage,
  isOwner,
  savedSettings,
}: DitherViewProps) {
  const router = useRouter();

  const [status, setStatus] = useState<DitherStatus>(initialStatus);
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl);
  const [title, setTitle] = useState<string | null>(initialTitle);
  const [errorMessage, setErrorMessage] = useState<string | null | undefined>(
    initialErrorMessage,
  );

  const needsAutoSaveRef = useRef(
    !initialImageUrl && initialStatus === "ready",
  );
  const hasAutoSavedRef = useRef(false);

  const [originalImage, setOriginalImage] = useAtom(originalImageAtom);
  const setOriginalDataUrl = useSetAtom(originalDataUrlAtom);
  const [processedDataUrl, setProcessedDataUrl] = useAtom(processedDataUrlAtom);
  const [options, setOptions] = useAtom(ditherOptionsAtom);
  const setIsProcessing = useSetAtom(isProcessingAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const setPrompt = useSetAtom(promptAtom);
  const resetImage = useSetAtom(resetImageAtom);
  const [processedDitherId, setProcessedDitherId] = useAtom(
    processedDitherIdAtom,
  );

  // Track which dither ID we've initialized for
  const initializedIdRef = useRef<string | null>(null);
  // Local state to prevent showing stale processedDataUrl from atom
  const [safeImageUrl, setSafeImageUrl] = useState<string | null>(null);

  // Reset image state when navigating to a new dither (useLayoutEffect to prevent flash)
  useLayoutEffect(() => {
    if (initializedIdRef.current !== id) {
      // Check if the current processedDataUrl is actually for THIS dither
      const isCurrentDataForThisDither = processedDitherId === id;

      if (isCurrentDataForThisDither && processedDataUrl) {
        // The atom already has valid data for this dither, use it directly
        setSafeImageUrl(processedDataUrl);
      } else {
        // Data is for a different dither, reset
        setSafeImageUrl(null);
        resetImage();
      }
      initializedIdRef.current = id;
    }
  }, [id, resetImage, processedDataUrl, processedDitherId]);

  // Update safe URL when processedDataUrl changes (only if it's for this dither)
  useEffect(() => {
    if (initializedIdRef.current !== id) return;
    // Only accept data that's tagged for this dither
    if (processedDitherId !== id) return;
    if (!processedDataUrl) return;

    setSafeImageUrl(processedDataUrl);
  }, [id, processedDataUrl, processedDitherId]);

  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDownloadDialog, setShowDownloadDialog] = useState(false);

  const user = useAtomValue(userAtom);
  const [isFavorited, setIsFavorited] = useState(false);

  // Header state atoms
  const setHeaderState = useSetAtom(headerStateAtom);
  const setHeaderCallbacks = useSetAtom(headerCallbacksAtom);
  const resetHeader = useSetAtom(resetHeaderAtom);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!user) return;

    const checkFavorite = async () => {
      try {
        const response = await fetch(`/api/favorites/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIsFavorited(data.isFavorited);
        }
      } catch (error) {
        console.error("Error checking favorite status:", error);
      }
    };

    checkFavorite();
  }, [id, user]);

  // Sync header state with atoms
  useEffect(() => {
    setHeaderState({
      title,
      visibility,
      isOwner,
      isUpdatingVisibility,
      isDeleting,
      isFavorited,
      showFavorite: !!user,
    });
  }, [
    title,
    visibility,
    isOwner,
    isUpdatingVisibility,
    isDeleting,
    isFavorited,
    user,
    setHeaderState,
  ]);

  // Reset header on unmount
  useEffect(() => {
    return () => {
      resetHeader();
    };
  }, [resetHeader]);

  const handleFavoriteToggle = useCallback(async () => {
    if (!user) return;

    try {
      if (isFavorited) {
        await fetch(`/api/favorites/${id}`, { method: "DELETE" });
        setIsFavorited(false);
      } else {
        await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ditherId: id }),
        });
        setIsFavorited(true);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    }
  }, [id, user, isFavorited]);

  const handleVisibilityChange = useCallback(
    async (newVisibility: Visibility) => {
      if (!isOwner || isUpdatingVisibility) return;

      setIsUpdatingVisibility(true);
      try {
        const response = await fetch(`/api/dithers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visibility: newVisibility }),
        });

        if (response.ok) {
          setVisibility(newVisibility);
        }
      } catch (error) {
        console.error("Error updating visibility:", error);
      } finally {
        setIsUpdatingVisibility(false);
      }
    },
    [id, isOwner, isUpdatingVisibility],
  );

  const handleDeleteClick = useCallback(() => {
    if (!isOwner || isDeleting) return;
    setShowDeleteDialog(true);
  }, [isOwner, isDeleting]);

  // Sync header callbacks with atoms
  useEffect(() => {
    setHeaderCallbacks({
      onVisibilityChange: handleVisibilityChange,
      onDelete: handleDeleteClick,
      onFavoriteToggle: handleFavoriteToggle,
    });
  }, [
    handleVisibilityChange,
    handleDeleteClick,
    handleFavoriteToggle,
    setHeaderCallbacks,
  ]);

  useEffect(() => {
    if (status === "ready" || status === "failed") return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/dithers/${id}`);
        if (!response.ok) return;

        const data = await response.json();
        const dither = data.dither;

        setStatus(dither.status);
        setTitle(dither.title);
        setErrorMessage(dither.errorMessage);

        if (dither.status === "ready") {
          if (dither.imageUrl) {
            setImageUrl(dither.imageUrl);
          } else {
            needsAutoSaveRef.current = true;
          }
          clearInterval(pollInterval);
        } else if (dither.status === "failed") {
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error("Error polling dither status:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [id, status]);

  useEffect(() => {
    if (status !== "ready") return;

    if (initialPrompt) setPrompt(initialPrompt);
    setOptions(savedSettings);

    if (imageUrl) {
      setProcessedDataUrl(imageUrl);
      setProcessedDitherId(id);
      const originalUrl = getOriginalImageUrl(imageUrl);
      setOriginalDataUrl(originalUrl);

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setOriginalImage(img);
      img.src = originalUrl;
    } else {
      const originalUrl = getOriginalUrlFromId(id);
      setOriginalDataUrl(originalUrl);

      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setOriginalImage(img);
      img.src = originalUrl;
    }
  }, [
    status,
    imageUrl,
    id,
    initialPrompt,
    savedSettings,
    setPrompt,
    setOptions,
    setProcessedDataUrl,
    setProcessedDitherId,
    setOriginalDataUrl,
    setOriginalImage,
  ]);

  const processImage = useCallback(
    (img: HTMLImageElement, opts: typeof options): string | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      setIsProcessing(true);

      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setIsProcessing(false);
        return null;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dithered = applyDither(imageData, opts);
      ctx.putImageData(dithered, 0, 0);

      const dataUrl = canvas.toDataURL("image/png");
      setProcessedDataUrl(dataUrl);
      setProcessedDitherId(id);
      setIsProcessing(false);

      return dataUrl;
    },
    [id, setIsProcessing, setProcessedDataUrl, setProcessedDitherId],
  );

  const autoSave = useCallback(
    async (dataUrl: string) => {
      if (!isOwner || hasAutoSavedRef.current) return;
      hasAutoSavedRef.current = true;

      try {
        const response = await fetch(`/api/dithers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData: dataUrl,
            threshold: options.threshold,
            contrast: options.contrast,
            brightness: options.brightness,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.dither?.imageUrl) {
            setImageUrl(data.dither.imageUrl);
          }
        }
      } catch (error) {
        console.error("Error auto-saving dither:", error);
      }
    },
    [id, options, isOwner],
  );

  // Read originalDataUrl to check if originalImage is for current dither
  const originalDataUrl = useAtomValue(originalDataUrlAtom);

  // Helper to check if originalImage is for the current dither
  const isOriginalImageForCurrentDither = useCallback(() => {
    if (!originalDataUrl) return false;
    // originalDataUrl contains the dither id, e.g. /api/dithers/ZA8TU.../original or /uploads/ZA8TU...
    return originalDataUrl.includes(id);
  }, [originalDataUrl, id]);

  useEffect(() => {
    if (!originalImage || status !== "ready") return;
    // Guard: don't process if originalImage is from a different dither
    if (!isOriginalImageForCurrentDither()) {
      return;
    }

    const dataUrl = processImage(originalImage, options);

    if (dataUrl && needsAutoSaveRef.current && !hasAutoSavedRef.current) {
      autoSave(dataUrl);
    }
  }, [
    originalImage,
    status,
    options,
    processImage,
    autoSave,
    isOriginalImageForCurrentDither,
  ]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    // Guard: don't process if originalImage is from a different dither
    if (!isOriginalImageForCurrentDither()) {
      return;
    }
    if (originalImage && status === "ready") {
      processImage(originalImage, options);
    }
  }, [
    options,
    originalImage,
    processImage,
    status,
    isOriginalImageForCurrentDither,
  ]);

  const handleDownloadClick = useCallback(() => {
    if (!processedDataUrl) return;
    setShowDownloadDialog(true);
  }, [processedDataUrl]);

  const handleDownload = useCallback(
    async (downloadOptions: DownloadOptions) => {
      if (!originalImage) return;

      const canvas = document.createElement("canvas");
      canvas.width = originalImage.width;
      canvas.height = originalImage.height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      // Draw and dither the image using current dither options
      ctx.drawImage(originalImage, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dithered = applyDither(imageData, options);
      ctx.putImageData(dithered, 0, 0);

      // Apply transparency if selected (convert white pixels to transparent)
      if (downloadOptions.transparent) {
        const transparentData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );
        const data = transparentData.data;
        for (let i = 0; i < data.length; i += 4) {
          // If pixel is white (255, 255, 255), make it transparent
          if (data[i] === 255 && data[i + 1] === 255 && data[i + 2] === 255) {
            data[i + 3] = 0; // Set alpha to 0
          }
        }
        ctx.putImageData(transparentData, 0, 0);
      }

      const filename = title || `dither-${id}`;
      const link = document.createElement("a");

      if (downloadOptions.format === "gif") {
        // Create GIF (no transparency support)
        const gifDataUrl = await createGIF(canvas);
        link.download = `${filename}.gif`;
        link.href = gifDataUrl;
      } else {
        // PNG format
        link.download = `${filename}.png`;
        link.href = canvas.toDataURL("image/png");
      }

      link.click();
    },
    [originalImage, options, id, title],
  );

  // Simple GIF encoder for 1-bit images
  async function createGIF(canvas: HTMLCanvasElement): Promise<string> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas.toDataURL("image/png");

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Build GIF binary data
    const gif: number[] = [];

    // GIF Header
    gif.push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); // GIF89a

    // Logical Screen Descriptor
    gif.push(width & 0xff, (width >> 8) & 0xff); // Width
    gif.push(height & 0xff, (height >> 8) & 0xff); // Height
    gif.push(0x80); // Global color table flag, 1 bit color resolution, sorted flag, size of global color table (2 colors)
    gif.push(0x00); // Background color index
    gif.push(0x00); // Pixel aspect ratio

    // Global Color Table (2 colors: black and white)
    gif.push(0x00, 0x00, 0x00); // Index 0: Black
    gif.push(0xff, 0xff, 0xff); // Index 1: White

    // Image Descriptor
    gif.push(0x2c); // Image separator
    gif.push(0x00, 0x00); // Left position
    gif.push(0x00, 0x00); // Top position
    gif.push(width & 0xff, (width >> 8) & 0xff); // Width
    gif.push(height & 0xff, (height >> 8) & 0xff); // Height
    gif.push(0x00); // Local color table flag

    // Image Data using LZW compression
    const minCodeSize = 2; // Minimum LZW code size
    gif.push(minCodeSize);

    // Convert pixels to indices (0 = black, 1 = white)
    const indices: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      indices.push(pixels[i] === 0 ? 0 : 1);
    }

    // Simple LZW encoding
    const lzwEncode = (indices: number[], minCodeSize: number): number[] => {
      const clearCode = 1 << minCodeSize;
      const eoiCode = clearCode + 1;

      let codeSize = minCodeSize + 1;
      let nextCode = eoiCode + 1;
      const maxCode = 4096;

      const dictionary = new Map<string, number>();
      for (let i = 0; i < clearCode; i++) {
        dictionary.set(String(i), i);
      }

      const output: number[] = [];
      let bitBuffer = 0;
      let bitCount = 0;

      const writeBits = (code: number, bits: number) => {
        bitBuffer |= code << bitCount;
        bitCount += bits;
        while (bitCount >= 8) {
          output.push(bitBuffer & 0xff);
          bitBuffer >>= 8;
          bitCount -= 8;
        }
      };

      writeBits(clearCode, codeSize);

      let current = String(indices[0]);
      for (let i = 1; i < indices.length; i++) {
        const next = current + "," + indices[i];
        if (dictionary.has(next)) {
          current = next;
        } else {
          writeBits(dictionary.get(current)!, codeSize);

          if (nextCode < maxCode) {
            dictionary.set(next, nextCode++);
            if (nextCode > 1 << codeSize && codeSize < 12) {
              codeSize++;
            }
          }

          current = String(indices[i]);
        }
      }

      writeBits(dictionary.get(current)!, codeSize);
      writeBits(eoiCode, codeSize);

      if (bitCount > 0) {
        output.push(bitBuffer & 0xff);
      }

      return output;
    };

    const lzwData = lzwEncode(indices, minCodeSize);

    // Write sub-blocks
    let offset = 0;
    while (offset < lzwData.length) {
      const chunkSize = Math.min(255, lzwData.length - offset);
      gif.push(chunkSize);
      for (let i = 0; i < chunkSize; i++) {
        gif.push(lzwData[offset + i]);
      }
      offset += chunkSize;
    }
    gif.push(0x00); // Block terminator

    // GIF Trailer
    gif.push(0x3b);

    // Convert to base64
    const binary = String.fromCharCode(...gif);
    return "data:image/gif;base64," + btoa(binary);
  }

  const handleSave = useCallback(async () => {
    if (!processedDataUrl || !isOwner || isSaving) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/dithers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageData: processedDataUrl,
          threshold: options.threshold,
          contrast: options.contrast,
          brightness: options.brightness,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      } else {
        const data = await response.json();
        if (data.dither?.imageUrl) {
          setImageUrl(data.dither.imageUrl);
        }
      }
    } catch (error) {
      console.error("Error saving dither:", error);
    } finally {
      setIsSaving(false);
    }
  }, [processedDataUrl, id, options, isOwner, isSaving, setIsSaving]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!isOwner || isDeleting) return;

    setIsDeleting(true);
    setShowDeleteDialog(false);
    try {
      const response = await fetch(`/api/dithers/${id}`, { method: "DELETE" });

      if (response.ok) {
        router.push("/");
      } else {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
    } catch (error) {
      console.error("Error deleting dither:", error);
      setIsDeleting(false);
    }
  }, [id, isOwner, isDeleting, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  if (status === "pending" || status === "generating") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa] text-black">
        <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <div className="text-center">
              <p className="font-mono text-xs mb-2">
                {status === "pending" ? "STARTING..." : "GENERATING..."}
              </p>
              {initialPrompt && (
                <p className="font-mono text-[10px] text-black/40 max-w-xs">
                  {initialPrompt}
                </p>
              )}
            </div>
          </div>

          {isOwner && (
            <ControlsPanel onSave={() => {}} onDownload={() => {}} forceShow />
          )}
        </main>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa] text-black">
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="bg-[#fafafa] border border-black">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-mono text-xs">
                DELETE?
              </AlertDialogTitle>
              <AlertDialogDescription className="font-mono text-[10px] text-black/60">
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="font-mono text-[10px] border border-black/20">
                CANCEL
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteConfirm}
                className="font-mono text-[10px] bg-black text-white"
              >
                DELETE
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <main className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-center">
            <p className="font-mono text-xs mb-2">ERROR</p>
            <p className="font-mono text-[10px] text-black/40 mb-4">
              {errorMessage || "Unknown error"}
            </p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => router.push("/")}
                className="font-mono text-[10px] px-4 py-2 bg-black text-white"
              >
                RETRY
              </button>
              {isOwner && (
                <button
                  onClick={handleDeleteClick}
                  className="font-mono text-[10px] px-4 py-2 border border-black"
                >
                  DELETE
                </button>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#fafafa] text-black">
      <canvas ref={canvasRef} className="hidden" />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#fafafa] border border-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-xs">
              DELETE?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-[10px] text-black/60">
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono text-[10px] border border-black/20">
              CANCEL
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="font-mono text-[10px] bg-black text-white"
            >
              DELETE
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 min-h-0 flex items-center justify-center p-4">
          <ImagePreview key={id} imageUrl={safeImageUrl} />
        </div>

        {isOwner && (
          <ControlsPanel
            onSave={handleSave}
            onDownload={handleDownloadClick}
            saveLabel="Save"
            alwaysEnableSave={isOwner}
          />
        )}

        <DownloadDialog
          open={showDownloadDialog}
          onOpenChange={setShowDownloadDialog}
          onDownload={handleDownload}
        />
      </main>
    </div>
  );
}
