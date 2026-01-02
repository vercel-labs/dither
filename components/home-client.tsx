"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { generateId } from "@/lib/id";
import { userAtom, generateErrorAtom } from "@/lib/atoms";
import { Header } from "@/components/header";
import { GenerateArea } from "@/components/generate-area";
import { DitherGallery } from "@/components/dither-gallery";
import type { DitherItem } from "@/app/page";

type Tab = "popular" | "favorites" | "yours";

interface HomeClientProps {
  myDithers: DitherItem[];
  publicDithers: DitherItem[];
  favoriteDithers: DitherItem[];
  isSignedIn: boolean;
}

export function HomeClient({
  myDithers,
  publicDithers,
  favoriteDithers,
  isSignedIn,
}: HomeClientProps) {
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const setError = useSetAtom(generateErrorAtom);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("popular");

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

  const getDisplayedDithers = () => {
    switch (activeTab) {
      case "popular":
        return publicDithers;
      case "favorites":
        return favoriteDithers;
      case "yours":
        return myDithers;
      default:
        return publicDithers;
    }
  };

  const tabs: { id: Tab; label: string; requiresAuth: boolean }[] = [
    { id: "popular", label: "Popular", requiresAuth: false },
    { id: "favorites", label: "Favorites", requiresAuth: true },
    { id: "yours", label: "Yours", requiresAuth: true },
  ];

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#fafafa] text-black">
      <Header />

      <main className="flex-1 min-h-0 overflow-y-auto">
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
                // Hide auth-required tabs if not signed in
                if (tab.requiresAuth && !isSignedIn) return null;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`font-mono text-xs pb-2 -mb-2 border-b ${
                      activeTab === tab.id
                        ? "text-black border-black"
                        : "text-black/40 border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Gallery content */}
            <DitherGallery
              dithers={getDisplayedDithers()}
              showUser={activeTab !== "yours"}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
