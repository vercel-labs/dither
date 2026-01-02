"use client";

import { useAtomValue } from "jotai";
import { useRef, useState, useCallback, useEffect } from "react";
import { processedDataUrlAtom, isProcessingAtom } from "@/lib/atoms";

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

interface ImagePreviewProps {
  /** Optional URL override - if provided, uses this instead of the atom value */
  imageUrl?: string | null;
}

export function ImagePreview({ imageUrl }: ImagePreviewProps = {}) {
  const processedDataUrlFromAtom = useAtomValue(processedDataUrlAtom);
  const isProcessing = useAtomValue(isProcessingAtom);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use prop if provided, otherwise fall back to atom value
  const src = imageUrl !== undefined ? imageUrl : processedDataUrlFromAtom;

  // DEBUG
  console.log("[ImagePreview RENDER]", {
    imageUrlProp: imageUrl?.slice(0, 50),
    atomValue: processedDataUrlFromAtom?.slice(0, 50),
    src: src?.slice(0, 50),
  });

  // Reset loaded state when src changes, but check if already complete
  useEffect(() => {
    setImageLoaded(false);
    // Check after a microtask if image is already complete (for data URLs)
    const timer = setTimeout(() => {
      if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
        setImageLoaded(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [src]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastPanPoint = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);
  const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [src]);

  const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches: TouchList) => {
    if (touches.length < 2)
      return { x: touches[0].clientX, y: touches[0].clientY };
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  };

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const pointX = e.clientX - centerX;
    const pointY = e.clientY - centerY;

    let delta: number;
    if (e.ctrlKey) {
      delta = -e.deltaY * 0.01;
    } else {
      delta = -e.deltaY * 0.002;
    }

    setZoom((prevZoom) => {
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prevZoom + delta * prevZoom),
      );

      if (newZoom === 1) {
        setPan({ x: 0, y: 0 });
      } else {
        const zoomRatio = newZoom / prevZoom;
        setPan((prevPan) => ({
          x: pointX - (pointX - prevPan.x) * zoomRatio,
          y: pointY - (pointY - prevPan.y) * zoomRatio,
        }));
      }

      return newZoom;
    });
  }, []);

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

        const pointX = currentCenter.x - containerCenterX;
        const pointY = currentCenter.y - containerCenterY;

        const scale = currentDistance / lastTouchDistance.current;

        setZoom((prevZoom) => {
          const newZoom = Math.min(
            MAX_ZOOM,
            Math.max(MIN_ZOOM, prevZoom * scale),
          );

          if (newZoom === 1) {
            setPan({ x: 0, y: 0 });
          } else {
            const zoomRatio = newZoom / prevZoom;
            setPan((prevPan) => {
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
          }

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

  const handleTouchEnd = useCallback(() => {
    lastTouchDistance.current = null;
    lastTouchCenter.current = null;
    setIsPanning(false);
  }, []);

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
      style={{
        cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {isProcessing && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#fafafa]/80 z-10">
          <span className="font-mono text-[10px] text-black/40 animate-blink">
            PROCESSING...
          </span>
        </div>
      )}
      {(!src || !imageLoaded) && !isProcessing && (
        <div className="bg-black border border-black max-w-full max-h-[50vh] lg:max-h-[70vh] w-[50vh] lg:w-[70vh] aspect-square" />
      )}
      {src && imageLoaded && (
        <img
          ref={imgRef}
          src={src}
          alt="Dithered"
          className="max-w-full max-h-[50vh] lg:max-h-[70vh] object-contain select-none pointer-events-none border border-black"
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            imageRendering: "pixelated",
          }}
        />
      )}
      {/* Hidden image to trigger onLoad */}
      {src && !imageLoaded && (
        <img
          ref={imgRef}
          src={src}
          alt=""
          className="absolute opacity-0 pointer-events-none"
          onLoad={() => setImageLoaded(true)}
        />
      )}
      {zoom !== 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] text-black/40">
          {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
