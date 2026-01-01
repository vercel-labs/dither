"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { useApp } from "@/components/app-provider";
import { ChevronDown, LogOut, User } from "lucide-react";

// Elegant loading indicator
function LoadingIndicator() {
  return (
    <div className="flex items-center gap-[3px]">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 bg-current rounded-full animate-pulse"
          style={{
            animationDelay: `${i * 150}ms`,
            animationDuration: "1s",
          }}
        />
      ))}
    </div>
  );
}

// Provider display names
const PROVIDER_NAMES: Record<string, string> = {
  github: "GitHub",
  google: "Google",
  discord: "Discord",
  vercel: "Vercel",
};

export function Header() {
  const { user: initialUser, providers } = useApp();
  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);

  // Use session data if available, otherwise fall back to initial user
  const user = session?.user ?? initialUser;
  const isSignedIn = !!user;

  const handleSignIn = (provider: string) => {
    setSigningIn(true);
    setProviderMenuOpen(false);
    signIn.social({ provider });
  };

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
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
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-full flex items-center justify-between">
        <a
          href="/"
          className="text-xs tracking-[0.3em] uppercase hover:text-black/60 transition-colors"
        >
          Dither
        </a>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/vercel-labs/dither"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs tracking-wide text-black/60 hover:text-black transition-colors"
          >
            GITHUB
          </a>
          {isPending || signingIn ? (
            <div className="text-black/40">
              <LoadingIndicator />
            </div>
          ) : isSignedIn ? (
            // User Menu
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="flex items-center gap-2 text-xs hover:text-black/60 transition-colors"
              >
                {user?.image ? (
                  <img
                    src={user.image}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-black/10 flex items-center justify-center">
                    <User className="w-3 h-3" />
                  </div>
                )}
                <span className="hidden sm:inline">{user?.name || "User"}</span>
                <ChevronDown className="w-3 h-3" />
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
                className="text-xs tracking-wide hover:text-black/60 transition-colors"
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
                  className="text-xs tracking-wide hover:text-black/60 transition-colors flex items-center gap-1"
                >
                  SIGN IN
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
