"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const aiModels = [
  { id: "bfl/flux-kontext-max", name: "FLUX MAX" },
  { id: "bfl/flux-kontext-pro", name: "FLUX PRO" },
  { id: "google/gemini-2.5-flash-image", name: "GEMINI FLASH" },
  { id: "google/gemini-3-pro-image", name: "GEMINI PRO" },
];

interface GenerateAreaProps {
  onImageGenerated: (url: string, prompt?: string) => void;
}

export function GenerateArea({ onImageGenerated }: GenerateAreaProps) {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(aiModels[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-expand textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [prompt]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), modelId: selectedModel }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate image");
      }

      const data = await response.json();
      if (data.image?.url) {
        onImageGenerated(data.image.url, prompt.trim());
      } else {
        throw new Error("No image returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedModel, onImageGenerated]);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Model Selection */}
      <div className="min-h-10 flex flex-wrap justify-center items-center gap-2 sm:gap-4">
        {aiModels.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            className={`text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase px-3 sm:px-4 py-2 border transition-colors ${
              selectedModel === model.id
                ? "border-black bg-black text-white"
                : "border-black/20 text-black/40 hover:border-black/40 hover:text-black/60 active:border-black active:text-black"
            }`}
          >
            {model.name}
          </button>
        ))}
      </div>

      {/* Prompt */}
      <div className="flex-1 flex flex-col justify-center">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          rows={1}
          className="w-full px-3 py-4 bg-transparent border-0 border-b border-black/20 
            text-base font-serif placeholder:text-black/30 focus:outline-none focus:border-black
            resize-none text-left overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.metaKey && !isGenerating)
              handleGenerate();
          }}
        />

        {/* Error - fixed height container */}
        <div className="h-6 flex items-center justify-center mt-4">
          {error && (
            <p className="text-[10px] tracking-[0.2em] uppercase text-red-600 px-4 text-center">
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="h-12 flex justify-center items-center">
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          className="text-[10px] tracking-[0.3em] uppercase px-8 py-3 border border-black 
            bg-black text-white hover:bg-transparent hover:text-black active:bg-transparent active:text-black transition-colors
            disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isGenerating ? "Generating..." : "Generate"}
        </button>
      </div>
    </div>
  );
}
