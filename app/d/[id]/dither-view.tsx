"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { applyDither } from "@/lib/dither";
import type { DitherOptions } from "@/lib/dither";
import {
  originalImageAtom,
  originalDataUrlAtom,
  processedDataUrlAtom,
  ditherOptionsAtom,
  isProcessingAtom,
  isSavingAtom,
  promptAtom,
} from "@/lib/atoms";
import { Header } from "@/components/header";
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
import { getOriginalImageUrl } from "@/lib/url";
import type { Visibility } from "@/lib/db/schema";

interface DitherViewProps {
  id: string;
  imageUrl: string;
  title: string | null;
  prompt: string | null;
  visibility: Visibility;
  isOwner: boolean;
  savedSettings: DitherOptions;
}

export function DitherView({
  id,
  imageUrl,
  title,
  prompt: initialPrompt,
  visibility: initialVisibility,
  isOwner,
  savedSettings,
}: DitherViewProps) {
  const router = useRouter();

  // Atoms
  const [originalImage, setOriginalImage] = useAtom(originalImageAtom);
  const setOriginalDataUrl = useSetAtom(originalDataUrlAtom);
  const [processedDataUrl, setProcessedDataUrl] = useAtom(processedDataUrlAtom);
  const [options, setOptions] = useAtom(ditherOptionsAtom);
  const setIsProcessing = useSetAtom(isProcessingAtom);
  const [isSaving, setIsSaving] = useAtom(isSavingAtom);
  const setPrompt = useSetAtom(promptAtom);

  // Visibility state
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load the saved image and settings on mount
  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);

    // Initialize with saved settings
    setOptions(savedSettings);

    // Display the processed image immediately
    setProcessedDataUrl(imageUrl);

    // Load the original image for re-processing
    const originalUrl = getOriginalImageUrl(imageUrl);
    setOriginalDataUrl(originalUrl);

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => setOriginalImage(img);
    img.src = originalUrl;
  }, [
    imageUrl,
    initialPrompt,
    savedSettings,
    setPrompt,
    setOptions,
    setProcessedDataUrl,
    setOriginalDataUrl,
    setOriginalImage,
  ]);

  const processImage = useCallback(
    (img: HTMLImageElement, opts: typeof options) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      setIsProcessing(true);

      requestAnimationFrame(() => {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dithered = applyDither(imageData, opts);
        ctx.putImageData(dithered, 0, 0);

        setProcessedDataUrl(canvas.toDataURL("image/png"));
        setIsProcessing(false);
      });
    },
    [setIsProcessing, setProcessedDataUrl],
  );

  // Re-process when options change (but not on initial load)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (originalImage) {
      processImage(originalImage, options);
    }
  }, [options, originalImage, processImage]);

  const handleDownload = useCallback(() => {
    if (!processedDataUrl) return;
    const link = document.createElement("a");
    link.download = `dither-${id}.png`;
    link.href = processedDataUrl;
    link.click();
  }, [processedDataUrl, id]);

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
      }
    } catch (error) {
      console.error("Error saving dither:", error);
    } finally {
      setIsSaving(false);
    }
  }, [processedDataUrl, id, options, isOwner, isSaving, setIsSaving]);

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
        } else {
          console.error("Failed to update visibility");
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

  const handleDeleteConfirm = useCallback(async () => {
    if (!isOwner || isDeleting) return;

    setIsDeleting(true);
    setShowDeleteDialog(false);
    try {
      const response = await fetch(`/api/dithers/${id}`, {
        method: "DELETE",
      });

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

  // Keyboard shortcut: Cmd+S / Ctrl+S to save
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

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-[#0a0a0a] font-serif selection:bg-black selection:text-white">
      <canvas ref={canvasRef} className="hidden" />

      <Header
        title={title}
        visibility={visibility}
        isOwner={isOwner}
        isUpdatingVisibility={isUpdatingVisibility}
        onVisibilityChange={handleVisibilityChange}
        onDelete={handleDeleteClick}
        isDeleting={isDeleting}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="font-serif">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this dither?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your
              dither.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700 text-xs"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* Main Panel */}
        <div className="flex-1 min-h-0 flex items-center justify-center px-4 sm:px-8 overflow-hidden">
          <ImagePreview />
        </div>

        {/* Controls Panel */}
        <ControlsPanel
          onSave={handleSave}
          onDownload={handleDownload}
          saveLabel="Save"
          alwaysEnableSave={isOwner}
        />
      </main>
    </div>
  );
}
