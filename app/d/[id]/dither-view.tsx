"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtom, useSetAtom, useAtomValue } from "jotai";
import { userAtom } from "@/lib/atoms";
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
import type { Visibility, DitherStatus } from "@/lib/db/schema";

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

  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [isUpdatingVisibility, setIsUpdatingVisibility] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const user = useAtomValue(userAtom);
  const [isFavorited, setIsFavorited] = useState(false);

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
      setIsProcessing(false);

      return dataUrl;
    },
    [setIsProcessing, setProcessedDataUrl],
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

  useEffect(() => {
    if (!originalImage || status !== "ready") return;

    const dataUrl = processImage(originalImage, options);

    if (dataUrl && needsAutoSaveRef.current && !hasAutoSavedRef.current) {
      autoSave(dataUrl);
    }
  }, [originalImage, status, options, processImage, autoSave]);

  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (originalImage && status === "ready") {
      processImage(originalImage, options);
    }
  }, [options, originalImage, processImage, status]);

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
      <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
        <Header
          title={null}
          visibility={visibility}
          isOwner={isOwner}
          isUpdatingVisibility={false}
          onVisibilityChange={() => {}}
          onDelete={handleDeleteClick}
          isDeleting={isDeleting}
        />

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

          {isOwner && <ControlsPanel onSave={() => {}} onDownload={() => {}} />}
        </main>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
        <Header
          title={null}
          visibility={visibility}
          isOwner={isOwner}
          isUpdatingVisibility={false}
          onVisibilityChange={() => {}}
          onDelete={handleDeleteClick}
          isDeleting={isDeleting}
        />

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
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
      <canvas ref={canvasRef} className="hidden" />

      <Header
        title={title}
        visibility={visibility}
        isOwner={isOwner}
        isUpdatingVisibility={isUpdatingVisibility}
        onVisibilityChange={handleVisibilityChange}
        onDelete={handleDeleteClick}
        isDeleting={isDeleting}
        isFavorited={isFavorited}
        onFavoriteToggle={handleFavoriteToggle}
        showFavorite={!!user}
      />

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
          <ImagePreview />
        </div>

        {isOwner && (
          <ControlsPanel
            onSave={handleSave}
            onDownload={handleDownload}
            saveLabel="Save"
            alwaysEnableSave={isOwner}
          />
        )}
      </main>
    </div>
  );
}
