"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import {
  userAtom,
  providersAtom,
  currentUserIdAtom,
  currentUserCustomAvatarAtom,
  headerStateAtom,
  headerCallbacksAtom,
} from "@/lib/atoms";
import { AvatarEditor } from "./avatar-editor";
import type { Visibility } from "@/lib/atoms";

// 8x7 pixel heart pattern
const HEART_PATTERN = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

// 7x8 pixel lock pattern (private)
const LOCK_PATTERN = [
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
];

// 8x6 pixel eye pattern (public)
const EYE_PATTERN = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [1, 0, 0, 1, 1, 0, 0, 1],
  [0, 1, 0, 0, 0, 0, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
];

// 7x8 pixel trash pattern (delete)
const TRASH_PATTERN = [
  [0, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 1, 1, 1, 1, 1, 0],
];

// 7x7 pixel pencil/edit pattern
const PENCIL_PATTERN = [
  [0, 0, 0, 0, 0, 1, 1],
  [0, 0, 0, 0, 1, 1, 1],
  [0, 0, 0, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 0, 0, 0],
  [1, 1, 1, 0, 0, 0, 0],
  [1, 1, 0, 0, 0, 0, 0],
];

function PixelIcon({
  pattern,
  size = 12,
}: {
  pattern: number[][];
  size?: number;
}) {
  const height = pattern.length;
  const width = pattern[0].length;
  return (
    <svg
      width={size}
      height={(size * height) / width}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
    >
      {pattern.map((row, y) =>
        row.map((pixel, x) =>
          pixel ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="currentColor"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

function PixelHeart({
  filled,
  size = 12,
}: {
  filled?: boolean;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={(size * 7) / 8}
      viewBox="0 0 8 7"
      shapeRendering="crispEdges"
    >
      {HEART_PATTERN.map((row, y) =>
        row.map((pixel, x) =>
          pixel ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={filled ? "black" : "#ccc"}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

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
      className={loaded ? "opacity-100" : "opacity-0"}
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

export function Header() {
  // Get header state from atoms (set by pages)
  const headerState = useAtomValue(headerStateAtom);
  const headerCallbacks = useAtomValue(headerCallbacksAtom);

  const {
    title,
    visibility,
    isOwner,
    isUpdatingVisibility,
    isDeleting,
    isFavorited,
    showFavorite,
  } = headerState;

  const { onVisibilityChange, onDelete, onFavoriteToggle, onTitleEdit } =
    headerCallbacks;
  const [initialUser, setUser] = useAtom(userAtom);
  const providers = useAtomValue(providersAtom);
  const setCurrentUserId = useSetAtom(currentUserIdAtom);
  const setGlobalCustomAvatar = useSetAtom(currentUserCustomAvatarAtom);
  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [customAvatar, setCustomAvatarLocal] = useState<string | null>(null);
  const [avatarSettings, setAvatarSettings] = useState<{
    threshold: number;
    contrast: number;
    brightness: number;
  } | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  const setCustomAvatar = useCallback(
    (avatar: string | null) => {
      setCustomAvatarLocal(avatar);
      setGlobalCustomAvatar(avatar);
    },
    [setGlobalCustomAvatar],
  );

  const user = session?.user ?? initialUser;
  const isSignedIn = !!user;
  const isLoading = signingIn || (isPending && !initialUser);

  // Load custom avatar from database
  useEffect(() => {
    if (!isSignedIn) {
      setAvatarLoaded(false);
      setGlobalCustomAvatar(null);
      return;
    }

    const fetchAvatarSettings = async () => {
      try {
        const response = await fetch("/api/avatar");
        if (response.ok) {
          const data = await response.json();
          if (data.customAvatar) {
            setCustomAvatarLocal(data.customAvatar);
            setGlobalCustomAvatar(data.customAvatar);
          }
          if (data.settings) setAvatarSettings(data.settings);
        }
      } catch (error) {
        console.error("Error fetching avatar settings:", error);
      } finally {
        setAvatarLoaded(true);
      }
    };

    fetchAvatarSettings();
  }, [isSignedIn, setGlobalCustomAvatar]);

  useEffect(() => {
    if (session?.user) {
      setUser({
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      });
      setCurrentUserId(session.user.id);
    } else {
      setCurrentUserId(null);
    }
  }, [session, setUser, setCurrentUserId]);

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

  const handleAvatarSave = useCallback(
    async (
      dataUrl: string,
      settings: { threshold: number; contrast: number; brightness: number },
    ) => {
      setCustomAvatar(dataUrl);
      setAvatarSettings(settings);
      setShowAvatarEditor(false);

      try {
        await fetch("/api/avatar", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customAvatar: dataUrl, settings }),
        });
      } catch (error) {
        console.error("Error saving avatar:", error);
      }
    },
    [],
  );

  const handleResetAvatar = useCallback(async () => {
    setCustomAvatar(null);
    setAvatarSettings(null);
    setShowAvatarEditor(false);

    try {
      await fetch("/api/avatar", { method: "DELETE" });
    } catch (error) {
      console.error("Error resetting avatar:", error);
    }
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
      <header className="sticky top-0 z-40 border-b border-black bg-[#fafafa]">
        <div className="px-4 h-[52px] flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-4">
            <a href="/" className="font-mono text-xs tracking-wider">
              DITHER
            </a>
            {visibility && (
              <>
                <span className="text-black/20">/</span>
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={() => {
                      if (onTitleEdit && editedTitle !== title) {
                        onTitleEdit(editedTitle);
                      }
                      setIsEditingTitle(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (onTitleEdit && editedTitle !== title) {
                          onTitleEdit(editedTitle);
                        }
                        setIsEditingTitle(false);
                      } else if (e.key === "Escape") {
                        setEditedTitle(title || "");
                        setIsEditingTitle(false);
                      }
                    }}
                    className="font-mono text-xs text-black/60 bg-transparent border-b border-black/40 outline-none max-w-[200px] uppercase"
                    autoFocus
                  />
                ) : (
                  <div className="group flex items-center gap-1.5">
                    <span className="font-mono text-xs text-black/60 truncate max-w-[200px]">
                      {title?.toUpperCase() || "UNTITLED"}
                    </span>
                    {onTitleEdit && isOwner && (
                      <button
                        onClick={() => {
                          setEditedTitle(title || "");
                          setIsEditingTitle(true);
                          setTimeout(() => titleInputRef.current?.select(), 0);
                        }}
                        className="text-black/30 hover:text-black sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        title="Edit title"
                      >
                        <PixelIcon pattern={PENCIL_PATTERN} size={10} />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-4">
            {showFavorite && onFavoriteToggle && (
              <button
                onClick={onFavoriteToggle}
                title={
                  isFavorited ? "Remove from favorites" : "Add to favorites"
                }
              >
                <PixelHeart filled={isFavorited} size={12} />
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
                    className="text-black/60 disabled:opacity-50 hover:text-black"
                    title={
                      visibility === "public" ? "Make private" : "Make public"
                    }
                  >
                    <PixelIcon
                      pattern={
                        visibility === "public" ? EYE_PATTERN : LOCK_PATTERN
                      }
                      size={12}
                    />
                  </button>
                ) : (
                  <span className="text-black/40" title={visibility}>
                    <PixelIcon
                      pattern={
                        visibility === "public" ? EYE_PATTERN : LOCK_PATTERN
                      }
                      size={12}
                    />
                  </span>
                )}
                {isOwner && onDelete && (
                  <button
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="text-black/40 disabled:opacity-50 hover:text-black"
                    title="Delete"
                  >
                    <PixelIcon pattern={TRASH_PATTERN} size={12} />
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

            {isLoading || (isSignedIn && !avatarLoaded) ? (
              <DitherLoader size={32} />
            ) : isSignedIn ? (
              <div className="relative flex items-center">
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
          onReset={handleResetAvatar}
          hasCustomAvatar={!!customAvatar}
          initialSettings={avatarSettings}
        />
      )}
    </>
  );
}
