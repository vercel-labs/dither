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
import { downloadCanvas } from "@/lib/download";
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
  const hasInitializedRef = useRef(false);

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

  const handleTitleEdit = useCallback(
    async (newTitle: string) => {
      if (!isOwner) return;

      // Optimistically update
      setTitle(newTitle);

      try {
        const response = await fetch(`/api/dithers/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: newTitle }),
        });

        if (!response.ok) {
          // Revert on error
          setTitle(title);
          console.error("Error updating title");
        }
      } catch (error) {
        // Revert on error
        setTitle(title);
        console.error("Error updating title:", error);
      }
    },
    [id, isOwner, title],
  );

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
      onTitleEdit: handleTitleEdit,
    });
  }, [
    handleVisibilityChange,
    handleDeleteClick,
    handleFavoriteToggle,
    handleTitleEdit,
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

  // Initialize state on mount (only once per dither)
  useEffect(() => {
    if (status !== "ready") return;
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    if (initialPrompt) setPrompt(initialPrompt);
    setOptions(savedSettings);

    const loadOriginalImage = (originalUrl: string) => {
      setOriginalDataUrl(originalUrl);
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => setOriginalImage(img);
      img.src = originalUrl;
    };

    if (initialImageUrl) {
      setProcessedDataUrl(initialImageUrl);
      setProcessedDitherId(id);
      const originalUrl = getOriginalImageUrl(initialImageUrl);
      loadOriginalImage(originalUrl);
    } else {
      const originalUrl = getOriginalUrlFromId(id);
      loadOriginalImage(originalUrl);
    }
  }, [
    status,
    id,
    initialPrompt,
    initialImageUrl,
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

      const filename = title || `dither-${id}`;
      await downloadCanvas(canvas, filename, downloadOptions);
    },
    [originalImage, options, id, title],
  );

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
