"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAtomValue, useSetAtom } from "jotai";
import { generateId } from "@/lib/id";
import { userAtom, generateErrorAtom } from "@/lib/atoms";
import { Header } from "@/components/header";
import { GenerateArea } from "@/components/generate-area";
import { DitherGallery } from "@/components/dither-gallery";

export default function Home() {
  const router = useRouter();
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

        // Redirect immediately - generation happens in background
        router.push(`/d/${id}`);
      } catch (error) {
        console.error("Error starting generation:", error);
        setError(error instanceof Error ? error.message : "Failed to generate");
        setIsCreating(false);
      }
    },
    [user, router, setError],
  );

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white text-black">
      <Header />

      <main className="flex-1 min-h-0 overflow-y-auto">
        {/* Hero */}
        <section className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-16">
          <div className="w-full max-w-xl text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight mb-3">
              Generate.
              <br />
              Dither.
              <br />
              Share.
            </h1>
            <p className="text-sm text-black/60 uppercase tracking-wider">
              AI images → 1-bit art
            </p>
          </div>

          <div className="w-full flex justify-center relative">
            <GenerateArea onGenerate={handleGenerate} />

            {isCreating && (
              <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-20">
                <div className="border-2 border-black px-4 py-2 bg-white">
                  <span className="text-xs uppercase tracking-wider font-bold">
                    Starting...
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Gallery */}
        <section className="px-4 pb-16 pt-12">
          <DitherGallery />
        </section>
      </main>
    </div>
  );
}
