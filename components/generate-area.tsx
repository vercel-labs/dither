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
  onGenerate: (prompt: string, modelId: string) => void;
}

export function GenerateArea({ onGenerate }: GenerateAreaProps) {
  const [prompt, setPrompt] = useAtom(generatePromptAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
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
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  }, [prompt]);

  const handleGenerate = useCallback(() => {
    if (!prompt.trim() || isGenerating) return;
    setError(null);
    onGenerate(prompt.trim(), selectedModel);
    setPrompt("");
  }, [prompt, selectedModel, onGenerate, isGenerating, setError, setPrompt]);

  const selectedModelName =
    aiModels.find((m) => m.id === selectedModel)?.name || "Model";

  return (
    <div className="w-full">
      <div className="border border-black flex flex-col">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="DESCRIBE YOUR IMAGE..."
          rows={1}
          enterKeyHint="send"
          autoFocus
          className="w-full px-3 py-3 text-sm bg-transparent placeholder:text-black/30 focus:outline-none resize-none min-h-[44px] max-h-[120px] font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />

        <div className="flex items-center justify-between border-t border-black/20 px-3 py-2">
          <div className="relative">
            <button
              onClick={() => setShowModels(!showModels)}
              className="font-mono text-[10px] text-black/50"
            >
              MODEL: {selectedModelName.toUpperCase()}
            </button>

            {showModels && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModels(false)}
                />
                <div className="absolute left-0 bottom-full mb-1 bg-[#fafafa] border border-black z-50 min-w-[180px]">
                  {aiModels.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model.id);
                        setShowModels(false);
                      }}
                      className={`w-full px-3 py-2 text-left font-mono text-[10px] ${
                        selectedModel === model.id
                          ? "bg-black text-white"
                          : "hover:bg-black hover:text-white"
                      }`}
                    >
                      {model.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="font-mono text-xs px-4 py-1 bg-black text-white disabled:opacity-30"
          >
            {isGenerating ? "..." : "GENERATE"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-2 font-mono text-[10px] text-black/60">
          ERROR: {error}
        </div>
      )}
    </div>
  );
}
