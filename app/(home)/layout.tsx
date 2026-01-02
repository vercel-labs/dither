"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import Link from "next/link";
import { generateId } from "@/lib/id";
import { userAtom, generateErrorAtom } from "@/lib/atoms";
import { Header } from "@/components/header";
import { GenerateArea } from "@/components/generate-area";

const tabs = [
  { path: "/", label: "Popular", requiresAuth: false },
  { path: "/fav", label: "Favorites", requiresAuth: true },
  { path: "/my", label: "My Dithers", requiresAuth: true },
];

export default function HomeLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAtomValue(userAtom);
  const setError = useSetAtom(generateErrorAtom);
  const [isCreating, setIsCreating] = useState(false);

  const handleGenerate = useCallback(
    async (prompt: string, modelId: string) => {
      if (!user) {
        setError("Please sign in to generate images");
        return;
      }

      setIsCreating(true);
      const id = generateId();

      try {
        const response = await fetch("/api/dithers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id,
            prompt,
            modelId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Failed to start generation");
        }

        router.push(`/d/${id}`);
      } catch (error) {
        console.error("Error starting generation:", error);
        setError(error instanceof Error ? error.message : "Failed to generate");
        setIsCreating(false);
      }
    },
    [user, router, setError],
  );

  const isSignedIn = !!user;

  return (
    <div className="min-h-dvh flex flex-col bg-[#fafafa] text-black">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="py-16 px-4">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="font-mono text-sm tracking-wider mb-2">
                GENERATE. DITHER. SHARE.
              </h1>
              <p className="font-mono text-xs text-black/40">
                AI IMAGES → 1-BIT ART
              </p>
            </div>

            <div className="relative">
              <GenerateArea onGenerate={handleGenerate} />

              {isCreating && (
                <div className="absolute inset-0 bg-[#fafafa]/95 flex items-center justify-center z-20">
                  <span className="font-mono text-xs animate-blink">
                    INITIALIZING...
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Gallery */}
        <section className="px-4 pb-16">
          <div className="max-w-2xl mx-auto">
            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-black/10 pb-2">
              {tabs.map((tab) => {
                if (tab.requiresAuth && !isSignedIn) return null;

                const isActive = pathname === tab.path;

                return (
                  <Link
                    key={tab.path}
                    href={tab.path}
                    className={`font-mono text-xs pb-2 -mb-2 border-b ${
                      isActive
                        ? "text-black border-black"
                        : "text-black/40 border-transparent hover:text-black/60"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>

            {/* Gallery content from page */}
            {children}
          </div>
        </section>
      </main>
    </div>
  );
}
