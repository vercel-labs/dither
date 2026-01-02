"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { signIn } from "@/lib/auth-client";
import {
  aiModels,
  selectedModelAtom,
  generatePromptAtom,
  isGeneratingAtom,
  generateErrorAtom,
  userAtom,
  providersAtom,
} from "@/lib/atoms";

interface GenerateAreaProps {
  onGenerate: (
    prompt: string,
    modelId: string,
    visibility: "public" | "private",
  ) => void;
}

export function GenerateArea({ onGenerate }: GenerateAreaProps) {
  const [prompt, setPrompt] = useAtom(generatePromptAtom);
  const [selectedModel, setSelectedModel] = useAtom(selectedModelAtom);
  const [isGenerating] = useAtom(isGeneratingAtom);
  const [error, setError] = useAtom(generateErrorAtom);
  const [showModels, setShowModels] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const user = useAtomValue(userAtom);
  const providers = useAtomValue(providersAtom);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialMount = useRef(true);

  // Focus textarea and move cursor to end on mount
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }, []);

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

    if (!user) {
      setShowSignIn(true);
      return;
    }

    setError(null);
    onGenerate(prompt.trim(), selectedModel, visibility);
    setPrompt("");
  }, [
    prompt,
    selectedModel,
    onGenerate,
    isGenerating,
    setError,
    setPrompt,
    user,
  ]);

  const handleSignIn = (provider: string) => {
    setShowSignIn(false);
    signIn.social({ provider });
  };

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
          className="w-full px-3 py-3 text-sm bg-transparent placeholder:text-black/30 focus:outline-none resize-none min-h-[44px] max-h-[120px] font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
              e.preventDefault();
              handleGenerate();
            }
          }}
        />

        <div className="flex items-start justify-between border-t border-black/20 px-3 py-2">
          <div className="flex items-baseline gap-4 -mt-0.5">
            <div className="relative">
              <button
                onClick={() => setShowModels(!showModels)}
                className="font-mono text-[10px] text-black/50 leading-none"
              >
                {selectedModelName.toUpperCase()}
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
              onClick={() =>
                setVisibility(visibility === "public" ? "private" : "public")
              }
              className="font-mono text-[10px] text-black/50 leading-none"
            >
              {visibility.toUpperCase()}
            </button>
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

      {/* Sign In Modal */}
      {showSignIn && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowSignIn(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#fafafa] border border-black p-6 z-50 min-w-[280px]">
            <div className="text-center mb-4">
              <p className="font-mono text-xs mb-1">SIGN IN TO GENERATE</p>
              <p className="font-mono text-[10px] text-black/50">
                Create an account to start making dithers
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {providers.map((provider) => (
                <button
                  key={provider}
                  onClick={() => handleSignIn(provider)}
                  className="w-full px-4 py-2 font-mono text-xs bg-black text-white hover:bg-black/80"
                >
                  CONTINUE WITH {provider.toUpperCase()}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowSignIn(false)}
              className="w-full mt-4 font-mono text-[10px] text-black/50"
            >
              CANCEL
            </button>
          </div>
        </>
      )}
    </div>
  );
}
