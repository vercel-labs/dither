"use client";

import { useState, useEffect } from "react";
import { useAtom, useAtomValue } from "jotai";
import { signIn, signOut, useSession } from "@/lib/auth-client";
import { userAtom, providersAtom } from "@/lib/atoms";
import { ChevronDown, LogOut } from "lucide-react";

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
  const [initialUser, setUser] = useAtom(userAtom);
  const providers = useAtomValue(providersAtom);
  const { data: session, isPending } = useSession();
  const [signingIn, setSigningIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [providerMenuOpen, setProviderMenuOpen] = useState(false);

  // Use session data if available, otherwise fall back to initial user
  const user = session?.user ?? initialUser;
  const isSignedIn = !!user;

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
        <a
          href="/"
          className="text-xs tracking-[0.3em] hover:text-black/60 transition-colors"
        >
          Dither
        </a>

        <div className="flex items-center gap-4">
          <a
            href="https://github.com/vercel-labs/dither"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:text-black/60 transition-colors"
          >
            GitHub
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
                className="flex items-center gap-1 text-xs hover:text-black/60 transition-colors"
              >
                {user?.name || "User"}
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
