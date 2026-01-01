"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { userAtom, providersAtom } from "@/lib/atoms";
import { ChevronDown, LogOut } from "lucide-react";

// Animated dither loading indicator - sparkling effect
function DitherLoader({ size = 32 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalSize = size * 4; // 4x resolution for fine pixels

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Pre-generate base patterns for variety
    const patterns: boolean[][] = [];
    for (let p = 0; p < 8; p++) {
      const pattern: boolean[] = [];
      const density = 0.3 + Math.random() * 0.4; // Varying densities
      for (let i = 0; i < internalSize * internalSize; i++) {
        pattern.push(Math.random() < density);
      }
      patterns.push(pattern);
    }

    let animationId: number;
    let lastUpdate = 0;
    const frameInterval = 120; // Update every 120ms for sparkle effect

    const animate = (timestamp: number) => {
      if (timestamp - lastUpdate >= frameInterval) {
        lastUpdate = timestamp;

        const imageData = ctx.createImageData(internalSize, internalSize);
        const data = imageData.data;

        // Pick a random base pattern and add sparkle variation
        const basePattern =
          patterns[Math.floor(Math.random() * patterns.length)];

        for (let i = 0; i < internalSize * internalSize; i++) {
          const idx = i * 4;
          // Base pattern with random sparkle flips
          const sparkle = Math.random() < 0.15; // 15% chance to flip
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
      style={{ width: size, height: size }}
    />
  );
}

// Dithered avatar component - uses higher internal resolution for better dithering
function DitheredAvatar({ src, size = 32 }: { src: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  const applyDither = useCallback(
    (img: HTMLImageElement) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Use higher internal resolution for better dithering detail
      const internalSize = size * 2;
      canvas.width = internalSize;
      canvas.height = internalSize;

      // Draw image at higher resolution
      ctx.drawImage(img, 0, 0, internalSize, internalSize);

      // Get image data
      const imageData = ctx.getImageData(0, 0, internalSize, internalSize);
      const data = imageData.data;

      // Convert to grayscale with contrast boost
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

      // Floyd-Steinberg dithering - better for faces
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

          if (x + 1 < internalSize) {
            errors[idx + 1] += error * (7 / 16);
          }
          if (y + 1 < internalSize) {
            if (x > 0) errors[idx + internalSize - 1] += error * (3 / 16);
            errors[idx + internalSize] += error * (5 / 16);
            if (x + 1 < internalSize)
              errors[idx + internalSize + 1] += error * (1 / 16);
          }
        }
      }

      // Write back to image data
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
      className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  discord: "Discord",
  vercel: "Vercel",
};

interface HeaderProps {
  title?: string | null;
}

export function Header({ title }: HeaderProps = {}) {
  const [initialUser, setUser] = useAtom(userAtom);
  const providers = useAtomValue(providersAtom);
  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);

  // Use session data if available, otherwise fall back to server-provided initial user
  const user = session?.user ?? initialUser;
  const isSignedIn = !!user;

  // Only show loading when actively signing in, or when pending AND no initial user
  // (initial user from server means we already know the auth state)
  const isLoading = signingIn || (isPending && !initialUser);

  // Update user atom when session changes
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

  // Close menus when clicking outside
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
    <header className="h-14 border-b border-black/10 shrink-0">
      <div className="px-4 sm:px-8 h-full flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/"
            className="text-xs tracking-[0.3em] hover:text-black/60 transition-colors shrink-0"
          >
            Dither
          </a>
          {title && (
            <>
              <span className="text-black/20">/</span>
              <span className="text-xs text-black/60 truncate">{title}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <a
            href="https://github.com/vercel-labs/dither"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:text-black/60 transition-colors"
          >
            GitHub
          </a>
          {isLoading ? (
            <DitherLoader size={32} />
          ) : isSignedIn ? (
            // User Menu
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="flex items-center hover:opacity-60 transition-opacity"
              >
                {user?.image ? (
                  <DitheredAvatar src={user.image} size={32} />
                ) : (
                  <div
                    className="bg-black text-white text-[11px] font-medium flex items-center justify-center"
                    style={{ width: 32, height: 32 }}
                  >
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                )}
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-black/10">
                    <p className="text-xs font-medium truncate">
                      {user?.name || "User"}
                    </p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full px-4 py-3 text-left text-xs hover:bg-black/5 transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-3 h-3" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : providers.length > 0 ? (
            // Sign In Button
            providers.length === 1 ? (
              <button
                onClick={() => handleSignIn(providers[0])}
                className="text-xs hover:text-black/60 transition-colors"
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
                  className="text-xs hover:text-black/60 transition-colors flex items-center gap-1"
                >
                  Sign In
                  <ChevronDown className="w-3 h-3" />
                </button>

                {providerMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-black/10 shadow-lg z-50">
                    {providers.map((provider) => (
                      <button
                        key={provider}
                        onClick={() => handleSignIn(provider)}
                        className="w-full px-4 py-3 text-left text-xs hover:bg-black/5 transition-colors"
                      >
                        Continue with {PROVIDER_NAMES[provider] || provider}
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
