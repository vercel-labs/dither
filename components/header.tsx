"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAtom, useAtomValue } from "jotai";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { userAtom, providersAtom } from "@/lib/atoms";
import { AvatarEditor } from "./avatar-editor";
import type { Visibility } from "@/lib/db/schema";

function DitherLoader({ size = 24 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const internalSize = size * 4;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let frame = 0;

    const animate = () => {
      frame++;
      if (frame % 6 === 0) {
        const imageData = ctx.createImageData(internalSize, internalSize);
        const data = imageData.data;

        for (let i = 0; i < internalSize * internalSize; i++) {
          const isOn = Math.random() < 0.5;
          const value = isOn ? 0 : 250;
          data[i * 4] = value;
          data[i * 4 + 1] = value;
          data[i * 4 + 2] = value;
          data[i * 4 + 3] = 255;
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
      className="border border-black"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

function DitheredAvatar({
  src,
  customSrc,
  size = 24,
}: {
  src: string;
  customSrc?: string | null;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  // If we have a custom dithered avatar, just display it
  useEffect(() => {
    if (customSrc) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const img = new Image();
      img.onload = () => {
        const internalSize = size * 2;
        canvas.width = internalSize;
        canvas.height = internalSize;
        ctx.drawImage(img, 0, 0, internalSize, internalSize);
        setLoaded(true);
      };
      img.src = customSrc;
      return;
    }

    // Otherwise apply default dithering
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
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

      for (let i = 0; i < internalSize * internalSize; i++) {
        const idx = i * 4;
        const gray =
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
        grayscale[i] = Math.max(0, Math.min(255, (gray - 128) * 1.3 + 128));
      }

      const errors = new Float32Array(grayscale);
      const output = new Uint8ClampedArray(internalSize * internalSize);

      for (let y = 0; y < internalSize; y++) {
        for (let x = 0; x < internalSize; x++) {
          const idx = y * internalSize + x;
          const oldPixel = errors[idx];
          const newPixel = oldPixel < 128 ? 0 : 255;
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
        data[i * 4] = output[i];
        data[i * 4 + 1] = output[i];
        data[i * 4 + 2] = output[i];
      }

      ctx.putImageData(imageData, 0, 0);
      setLoaded(true);
    };
    img.src = src;
  }, [src, customSrc, size]);

  return (
    <canvas
      ref={canvasRef}
      className={`border border-black ${loaded ? "opacity-100" : "opacity-0"}`}
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}

const PROVIDER_NAMES: Record<string, string> = {
  github: "GITHUB",
  google: "GOOGLE",
  discord: "DISCORD",
  vercel: "VERCEL",
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
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [customAvatar, setCustomAvatar] = useState<string | null>(null);

  const user = session?.user ?? initialUser;
  const isSignedIn = !!user;
  const isLoading = signingIn || (isPending && !initialUser);

  // Load custom avatar from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dither-avatar");
      if (saved) setCustomAvatar(saved);
    }
  }, []);

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

  const handleAvatarSave = useCallback((dataUrl: string) => {
    setCustomAvatar(dataUrl);
    localStorage.setItem("dither-avatar", dataUrl);
    setShowAvatarEditor(false);
  }, []);

  const handleResetAvatar = useCallback(() => {
    setCustomAvatar(null);
    localStorage.removeItem("dither-avatar");
    setMenuOpen(false);
  }, []);

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
    <>
      <header className="border-b border-black bg-[#fafafa]">
        <div className="px-4 h-10 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <a href="/" className="font-mono text-xs tracking-wider">
              DITHER
            </a>
            {title !== undefined && (
              <>
                <span className="text-black/20">/</span>
                <span className="font-mono text-xs text-black/60 truncate max-w-[200px]">
                  {title?.toUpperCase() || "UNTITLED"}
                </span>
              </>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {showFavorite && onFavoriteToggle && (
              <button onClick={onFavoriteToggle} className="font-mono text-xs">
                {isFavorited ? "★" : "☆"}
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
                    className="font-mono text-xs text-black/60 disabled:opacity-50"
                  >
                    {visibility.toUpperCase()}
                  </button>
                ) : (
                  <span className="font-mono text-xs text-black/40">
                    {visibility.toUpperCase()}
                  </span>
                )}
                {isOwner && onDelete && (
                  <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="font-mono text-xs text-black/40 disabled:opacity-50"
                  >
                    DELETE
                  </button>
                )}
              </div>
            )}

            <a
              href="https://github.com/vercel-labs/dither"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-black/40 hidden sm:block"
            >
              GITHUB
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
                    <DitheredAvatar
                      src={user.image}
                      customSrc={customAvatar}
                      size={32}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-black text-white text-xs flex items-center justify-center font-mono">
                      {user?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 w-40 bg-[#fafafa] border border-black z-50">
                    <div className="px-3 py-2 border-b border-black/20">
                      <p className="font-mono text-[10px] text-black/60 truncate">
                        {user?.name?.toUpperCase()}
                      </p>
                    </div>
                    {user?.image && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          setShowAvatarEditor(true);
                        }}
                        className="w-full px-3 py-2 text-left font-mono text-xs hover:bg-black hover:text-white"
                      >
                        EDIT AVATAR
                      </button>
                    )}
                    {customAvatar && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetAvatar();
                        }}
                        className="w-full px-3 py-2 text-left font-mono text-xs text-black/50 hover:bg-black hover:text-white"
                      >
                        RESET AVATAR
                      </button>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="w-full px-3 py-2 text-left font-mono text-xs hover:bg-black hover:text-white"
                    >
                      SIGN OUT
                    </button>
                  </div>
                )}
              </div>
            ) : providers.length > 0 ? (
              providers.length === 1 ? (
                <button
                  onClick={() => handleSignIn(providers[0])}
                  className="font-mono text-xs"
                >
                  SIGN IN
                </button>
              ) : (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setProviderMenuOpen(!providerMenuOpen);
                    }}
                    className="font-mono text-xs"
                  >
                    SIGN IN
                  </button>

                  {providerMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 bg-[#fafafa] border border-black z-50">
                      {providers.map((provider) => (
                        <button
                          key={provider}
                          onClick={() => handleSignIn(provider)}
                          className="w-full px-3 py-2 text-left font-mono text-xs hover:bg-black hover:text-white"
                        >
                          {PROVIDER_NAMES[provider] || provider.toUpperCase()}
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

      {/* Avatar Editor Modal */}
      {showAvatarEditor && user?.image && (
        <AvatarEditor
          src={user.image}
          onClose={() => setShowAvatarEditor(false)}
          onSave={handleAvatarSave}
        />
      )}
    </>
  );
}
