"use client";

import { useAtomValue } from "jotai";
import { useRef, useState, useCallback, useEffect } from "react";
import {
  processedDataUrlAtom,
  originalDataUrlAtom,
  isProcessingAtom,
} from "@/lib/atoms";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;

export function ImagePreview() {
  const processedDataUrl = useAtomValue(processedDataUrlAtom);
  const originalDataUrl = useAtomValue(originalDataUrlAtom);
  const isProcessing = useAtomValue(isProcessingAtom);

  const src = processedDataUrl || originalDataUrl;

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  // Reset zoom/pan when image changes
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

  // Get distance between two touch points
  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Get center point between two touches
  const getTouchCenter = (touches: TouchList) => {
    if (touches.length < 2)
      return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  // Handle wheel event (trackpad pinch + mouse wheel zoom)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Point relative to center
    const pointX = e.clientX - centerX;
    const pointY = e.clientY - centerY;

    // Determine zoom delta
    let delta: number;
    if (e.ctrlKey) {
      // Trackpad pinch gesture
      delta = -e.deltaY * 0.01;
    } else {
      // Mouse wheel
      delta = -e.deltaY * 0.002;
    }

    setZoom((prevZoom) => {
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prevZoom + delta * prevZoom),
      );
      const zoomRatio = newZoom / prevZoom;

      // Adjust pan to zoom toward cursor position
      setPan((prevPan) => ({
        x: pointX - (pointX - prevPan.x) * zoomRatio,
        y: pointY - (pointY - prevPan.y) * zoomRatio,
      }));

      return newZoom;
    });
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        lastTouchDistance.current = getTouchDistance(e.touches);
        lastTouchCenter.current = getTouchCenter(e.touches);
      } else if (e.touches.length === 1 && zoom > 1) {
        setIsPanning(true);
        lastPanPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [zoom],
  );

  // Handle touch move
  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        e.preventDefault();

        const container = containerRef.current;
        if (!container) return;

        const currentDistance = getTouchDistance(e.touches);
        const currentCenter = getTouchCenter(e.touches);
        const rect = container.getBoundingClientRect();
        const containerCenterX = rect.left + rect.width / 2;
        const containerCenterY = rect.top + rect.height / 2;

        // Point relative to center
        const pointX = currentCenter.x - containerCenterX;
        const pointY = currentCenter.y - containerCenterY;

        const scale = currentDistance / lastTouchDistance.current;

        setZoom((prevZoom) => {
          const newZoom = Math.min(
            MAX_ZOOM,
            Math.max(MIN_ZOOM, prevZoom * scale),
          );
          const zoomRatio = newZoom / prevZoom;

          // Adjust pan to zoom toward pinch center
          setPan((prevPan) => {
            // Also account for pinch center movement
            const dx = lastTouchCenter.current
              ? currentCenter.x - lastTouchCenter.current.x
              : 0;
            const dy = lastTouchCenter.current
              ? currentCenter.y - lastTouchCenter.current.y
              : 0;

            return {
              x: pointX - (pointX - prevPan.x) * zoomRatio + dx,
              y: pointY - (pointY - prevPan.y) * zoomRatio + dy,
            };
          });

          return newZoom;
        });

        lastTouchDistance.current = currentDistance;
        lastTouchCenter.current = currentCenter;
      } else if (e.touches.length === 1 && isPanning) {
        e.preventDefault();
        const dx = e.touches[0].clientX - lastPanPoint.current.x;
        const dy = e.touches[0].clientY - lastPanPoint.current.y;

        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPoint.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        };
      }
    },
    [isPanning],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsPanning(false);
  }, []);

  // Double tap to reset
  const lastTapTime = useRef(0);
  const handleDoubleTap = useCallback((e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTapTime.current < 300 && e.touches.length === 1) {
      e.preventDefault();
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
    lastTapTime.current = now;
  }, []);

  // Attach event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("wheel", handleWheel, { passive: false });
    container.addEventListener("touchstart", handleTouchStart, {
      passive: false,
    });
    container.addEventListener("touchstart", handleDoubleTap, {
      passive: false,
    });
    container.addEventListener("touchmove", handleTouchMove, {
      passive: false,
    });
    container.addEventListener("touchend", handleTouchEnd);
    container.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      container.removeEventListener("wheel", handleWheel);
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchstart", handleDoubleTap);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
      container.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleDoubleTap,
  ]);

  // Mouse drag for panning when zoomed
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (zoom > 1) {
        setIsPanning(true);
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
      }
    },
    [zoom],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - lastPanPoint.current.x;
        const dy = e.clientY - lastPanPoint.current.y;
        setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        lastPanPoint.current = { x: e.clientX, y: e.clientY };
      }
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fafafa]/80 z-10">
          <span className="text-[10px] text-black/40">Processing...</span>
        </div>
      )}
      {src && (
        <img
          src={src}
          alt="Dithered"
          className="max-w-full max-h-[50vh] lg:max-h-[70vh] object-contain select-none"
          draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
            transition: isPanning ? "none" : "transform 0.1s ease-out",
          }}
        />
      )}
      {/* Zoom indicator */}
      {zoom !== 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full pointer-events-none">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
