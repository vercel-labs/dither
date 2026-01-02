"use client";

import { useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type DownloadFormat = "png" | "gif";

export interface DownloadOptions {
  format: DownloadFormat;
  transparent: boolean;
}

interface DownloadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDownload: (options: DownloadOptions) => void;
}

export function DownloadDialog({
  open,
  onOpenChange,
  onDownload,
}: DownloadDialogProps) {
  const [format, setFormat] = useState<DownloadFormat>("png");
  const [transparent, setTransparent] = useState(false);

  const handleDownload = useCallback(() => {
    onDownload({ format, transparent });
    onOpenChange(false);
  }, [format, transparent, onDownload, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-[#fafafa] border border-black max-w-xs">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-mono text-xs">
            DOWNLOAD
          </AlertDialogTitle>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {/* Format selection */}
          <div>
            <label className="font-mono text-[10px] text-black/60 block mb-2">
              FORMAT
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat("png")}
                className={`flex-1 font-mono text-[10px] py-2 border ${
                  format === "png"
                    ? "bg-black text-white border-black"
                    : "bg-transparent text-black border-black/20 hover:border-black/40"
                }`}
              >
                PNG
              </button>
              <button
                onClick={() => {
                  setFormat("gif");
                  setTransparent(false);
                }}
                className={`flex-1 font-mono text-[10px] py-2 border ${
                  format === "gif"
                    ? "bg-black text-white border-black"
                    : "bg-transparent text-black border-black/20 hover:border-black/40"
                }`}
              >
                GIF
              </button>
            </div>
          </div>

          {/* Transparency toggle - only for PNG */}
          {format === "png" && (
            <div>
              <button
                onClick={() => setTransparent(!transparent)}
                className="flex items-center gap-2 w-full"
              >
                <div
                  className={`w-4 h-4 border flex items-center justify-center ${
                    transparent ? "bg-black border-black" : "border-black/20"
                  }`}
                >
                  {transparent && (
                    <svg
                      width="10"
                      height="8"
                      viewBox="0 0 10 8"
                      fill="none"
                      shapeRendering="crispEdges"
                    >
                      <path
                        d="M1 4L4 7L9 1"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="square"
                      />
                    </svg>
                  )}
                </div>
                <span className="font-mono text-[10px] text-black/60">
                  TRANSPARENT BACKGROUND
                </span>
              </button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel className="font-mono text-[10px] border border-black/20">
            CANCEL
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDownload}
            className="font-mono text-[10px] bg-black text-white"
          >
            DOWNLOAD
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
