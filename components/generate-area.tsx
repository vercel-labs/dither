"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useAtom } from "jotai";
import {
  aiModels,
  selectedModelAtom,
  generatePromptAtom,
  isGeneratingAtom,
  generateErrorAtom,
} from "@/lib/atoms";

interface GenerateAreaProps {
  onImageGenerated: (url: string, prompt?: string) => void;
}

export function GenerateArea({ onImageGenerated }: GenerateAreaProps) {
  const [prompt, setPrompt] = useAtom(generatePromptAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingAtom);
  const [error, setError] = useAtom(generateErrorAtom);
  const [showModels, setShowModels] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
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
        setPrompt("");
      } else {
        throw new Error("No image returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate");
    } finally {
      setIsGenerating(false);
    }
  }, [
    prompt,
    selectedModel,
    onImageGenerated,
    setIsGenerating,
    setError,
    setPrompt,
  ]);

  const selectedModelName =
    aiModels.find((m) => m.id === selectedModel)?.name || "Model";

  return (
    <div className="w-full max-w-xl">
      {/* Input */}
      <div className="border-2 border-black bg-white">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your image..."
          rows={1}
          enterKeyHint="send"
          autoFocus
          className="w-full px-4 py-3 text-sm bg-transparent placeholder:text-black/40 focus:outline-none focus:ring-0 resize-none min-h-[48px] max-h-[160px]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />

        {/* Bottom Bar */}
        <div className="flex items-center justify-between border-t-2 border-black px-2 py-2">
          {/* Model Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModels(!showModels)}
              className="text-xs uppercase tracking-wider px-2 py-1 hover:bg-black hover:text-white"
            >
              {selectedModelName} ↓
            </button>

            {showModels && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModels(false)}
                />
                <div className="absolute left-0 bottom-full mb-1 bg-white border-2 border-black z-50 min-w-[180px]">
                  {aiModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModels(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-xs uppercase tracking-wider ${
                        selectedModel === model.id
                          ? "bg-black text-white"
                          : "hover:bg-black hover:text-white"
                      }`}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="px-4 py-1 text-xs uppercase tracking-wider font-bold bg-black text-white border-2 border-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white hover:text-black"
          >
            {isGenerating ? "..." : "Generate"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 px-3 py-2 border-2 border-red-600 text-red-600 text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
