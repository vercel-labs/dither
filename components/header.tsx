"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { userAtom, providersAtom } from "@/lib/atoms";
import type { Visibility } from "@/lib/db/schema";

function DitherLoader({ size = 32 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalSize = size * 4;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const patterns: boolean[][] = [];
    for (let p = 0; p < 8; p++) {
      const pattern: boolean[] = [];
      const density = 0.3 + Math.random() * 0.4;
      for (let i = 0; i < internalSize * internalSize; i++) {
        pattern.push(Math.random() < density);
      }
      patterns.push(pattern);
    }

    let animationId: number;
    let lastUpdate = 0;
    const frameInterval = 100;

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdate >= frameInterval) {
        lastUpdate = timestamp;

        const imageData = ctx.createImageData(internalSize, internalSize);
        const data = imageData.data;

        const basePattern =
          patterns[Math.floor(Math.random() * patterns.length)];

        for (let i = 0; i < internalSize * internalSize; i++) {
          const idx = i * 4;
          const sparkle = Math.random() < 0.15;
          const isWhite = sparkle ? !basePattern[i] : basePattern[i];
          const value = isWhite ? 255 : 0;

          data[idx] = value;
          data[idx + 1] = value;
          data[idx + 2] = value;
          data[idx + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [internalSize]);

  return (
    <canvas
      ref={canvasRef}
      width={internalSize}
      height={internalSize}
      className="border-2 border-black"
      style={{ width: size, height: size }}
    />
  );
}

function DitheredAvatar({ src, size = 32 }: { src: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  const applyDither = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const internalSize = size * 2;
      canvas.width = internalSize;
      canvas.height = internalSize;

      ctx.drawImage(img, 0, 0, internalSize, internalSize);

      const imageData = ctx.getImageData(0, 0, internalSize, internalSize);
      const data = imageData.data;

      const grayscale = new Float32Array(internalSize * internalSize);
      const contrast = 1.3;
      const brightness = 5;

      for (let i = 0; i < internalSize * internalSize; i++) {
        const idx = i * 4;
        let gray =
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        gray = gray + brightness;
        gray = (gray - 128) * contrast + 128;
        grayscale[i] = Math.max(0, Math.min(255, gray));
      }

      const errors = new Float32Array(grayscale);
      const output = new Uint8ClampedArray(internalSize * internalSize);
      const threshold = 128;

      for (let y = 0; y < internalSize; y++) {
        for (let x = 0; x < internalSize; x++) {
          const idx = y * internalSize + x;
          const oldPixel = errors[idx];
          const newPixel = oldPixel < threshold ? 0 : 255;
          output[idx] = newPixel;
          const error = oldPixel - newPixel;

          if (x + 1 < internalSize) errors[idx + 1] += error * (7 / 16);
          if (y + 1 < internalSize) {
            if (x > 0) errors[idx + internalSize - 1] += error * (3 / 16);
            errors[idx + internalSize] += error * (5 / 16);
            if (x + 1 < internalSize)
              errors[idx + internalSize + 1] += error * (1 / 16);
          }
        }
      }

      for (let i = 0; i < internalSize * internalSize; i++) {
        const value = output[i];
        data[i * 4] = value;
        data[i * 4 + 1] = value;
        data[i * 4 + 2] = value;
      }

      ctx.putImageData(imageData, 0, 0);
      setLoaded(true);
    },
    [size],
  );

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => applyDither(img);
    img.src = src;
  }, [src, applyDither]);

  return (
    <canvas
      ref={canvasRef}
      className={`border-2 border-black ${loaded ? "opacity-100" : "opacity-0"}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  discord: "Discord",
  vercel: "Vercel",
};

interface HeaderProps {
  title?: string | null;
  visibility?: Visibility;
  isOwner?: boolean;
  isUpdatingVisibility?: boolean;
  onVisibilityChange?: (visibility: Visibility) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  isFavorited?: boolean;
  onFavoriteToggle?: () => void;
  showFavorite?: boolean;
}

export function Header({
  title,
  visibility,
  isOwner,
  isUpdatingVisibility,
  onVisibilityChange,
  onDelete,
  isDeleting,
  isFavorited,
  onFavoriteToggle,
  showFavorite,
}: HeaderProps = {}) {
  const [initialUser, setUser] = useAtom(userAtom);
  const providers = useAtomValue(providersAtom);
  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);

  const user = session?.user ?? initialUser;
  const isSignedIn = !!user;
  const isLoading = signingIn || (isPending && !initialUser);

  useEffect(() => {
    if (session?.user) {
      setUser({
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      });
    }
  }, [session, setUser]);

  const handleSignIn = (provider: string) => {
    setSigningIn(true);
    setProviderMenuOpen(false);
    signIn.social({ provider });
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    setUser(null);
  };

  useEffect(() => {
    const handleClickOutside = () => {
      setMenuOpen(false);
      setProviderMenuOpen(false);
    };
    if (menuOpen || providerMenuOpen) {
      document.addEventListener("click", handleClickOutside);
      return () => document.removeEventListener("click", handleClickOutside);
    }
  }, [menuOpen, providerMenuOpen]);

  return (
    <header className="border-b-2 border-black">
      <div className="px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <a href="/" className="text-sm font-bold uppercase tracking-wider">
            Dither
          </a>
          {title !== undefined && (
            <>
              <span className="text-black/30">/</span>
              <span className="text-sm truncate max-w-[180px]">
                {title || "Untitled"}
              </span>
            </>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          {showFavorite && onFavoriteToggle && (
            <button
              onClick={onFavoriteToggle}
              className="text-xs uppercase tracking-wider"
              title={isFavorited ? "Remove from favorites" : "Add to favorites"}
            >
              {isFavorited ? "♥" : "♡"}
            </button>
          )}

          {visibility && (
            <div className="flex items-center gap-3">
              {isOwner && onVisibilityChange ? (
                <button
                  onClick={() =>
                    onVisibilityChange(
                      visibility === "private" ? "public" : "private",
                    )
                  }
                  disabled={isUpdatingVisibility}
                  className="text-xs uppercase tracking-wider disabled:opacity-50"
                >
                  [{visibility}]
                </button>
              ) : (
                <span className="text-xs uppercase tracking-wider">
                  [{visibility}]
                </span>
              )}
              {isOwner && onDelete && (
                <button
                  onClick={onDelete}
                  disabled={isDeleting}
                  className="text-xs uppercase tracking-wider text-red-600 disabled:opacity-50"
                >
                  [Delete]
                </button>
              )}
            </div>
          )}

          <a
            href="https://github.com/vercel-labs/dither"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs uppercase tracking-wider hidden sm:block"
          >
            GitHub
          </a>

          {isLoading ? (
            <DitherLoader size={32} />
          ) : isSignedIn ? (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
              >
                {user?.image ? (
                  <DitheredAvatar src={user.image} size={32} />
                ) : (
                  <div className="w-8 h-8 bg-black text-white text-xs font-bold flex items-center justify-center border-2 border-black">
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black z-50">
                  <div className="px-3 py-2 border-b-2 border-black">
                    <p className="text-xs font-bold truncate">
                      {user?.name || "User"}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-3 py-2 text-left text-xs uppercase tracking-wider hover:bg-black hover:text-white"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : providers.length > 0 ? (
            providers.length === 1 ? (
              <button
                onClick={() => handleSignIn(providers[0])}
                className="text-xs uppercase tracking-wider font-bold"
              >
                Sign In
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProviderMenuOpen(!providerMenuOpen);
                  }}
                  className="text-xs uppercase tracking-wider font-bold"
                >
                  Sign In ↓
                </button>

                {providerMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border-2 border-black z-50">
                    {providers.map((provider) => (
                      <button
                        key={provider}
                        onClick={() => handleSignIn(provider)}
                        className="w-full px-3 py-2 text-left text-xs uppercase tracking-wider hover:bg-black hover:text-white"
                      >
                        {PROVIDER_NAMES[provider] || provider}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
}
