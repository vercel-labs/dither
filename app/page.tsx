"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Download, RotateCcw, Sliders, Image as ImageIcon, Sparkles, Wand2, Loader2 } from "lucide-react";
import { applyDither, defaultOptions, type DitherOptions, type DitherAlgorithm } from "@/lib/dither";

const algorithms: { value: DitherAlgorithm; label: string; description: string }[] = [
  { value: "floyd-steinberg", label: "Floyd-Steinberg", description: "Classic error diffusion" },
  { value: "atkinson", label: "Atkinson", description: "Mac-style, high contrast" },
  { value: "ordered", label: "Ordered 4×4", description: "Crosshatch pattern" },
  { value: "bayer", label: "Bayer 8×8", description: "Fine ordered pattern" },
  { value: "threshold", label: "Threshold", description: "Simple b&w cutoff" },
];

const aiModels = [
  { id: "bfl/flux-kontext-max", name: "Flux Kontext Max", description: "Highest quality generation", quality: "high" },
  { id: "bfl/flux-kontext-pro", name: "Flux Kontext Pro", description: "Fast, high quality", quality: "medium" },
  { id: "google/gemini-2.5-flash-image", name: "Gemini Flash", description: "Quick generation", quality: "medium" },
  { id: "google/gemini-3-pro-image", name: "Gemini Pro", description: "Google's best image model", quality: "high" },
];

type InputMode = "upload" | "generate";

export default function Home() {
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [originalDataUrl, setOriginalDataUrl] = useState<string | null>(null);
  const [processedDataUrl, setProcessedDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [options, setOptions] = useState<DitherOptions>(defaultOptions);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonPosition, setComparisonPosition] = useState(50);
  
  // Generate mode state
  const [inputMode, setInputMode] = useState<InputMode>("upload");
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState(aiModels[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const comparisonRef = useRef<HTMLDivElement>(null);

  const processImage = useCallback((img: HTMLImageElement, opts: DitherOptions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);

    // Use requestAnimationFrame to not block UI
    requestAnimationFrame(() => {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const dithered = applyDither(imageData, opts);
      ctx.putImageData(dithered, 0, 0);

      setProcessedDataUrl(canvas.toDataURL("image/png"));
      setIsProcessing(false);
    });
  }, []);

  useEffect(() => {
    if (originalImage) {
      processImage(originalImage, options);
    }
  }, [originalImage, options, processImage]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setOriginalDataUrl(dataUrl);
      
      const img = new window.Image();
      img.onload = () => {
        setOriginalImage(img);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUrl = useCallback((url: string) => {
    setOriginalDataUrl(url);
    
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      setOriginalImage(img);
    };
    img.onerror = () => {
      // If direct load fails, it might be a data URL that needs different handling
      setOriginalImage(img);
    };
    img.src = url;
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setGenerateError(null);
    
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          modelId: selectedModel,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate image");
      }
      
      const data = await response.json();
      if (data.image?.url) {
        handleImageUrl(data.image.url);
      } else {
        throw new Error("No image returned from API");
      }
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedModel, handleImageUrl]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDownload = useCallback(() => {
    if (!processedDataUrl) return;
    const link = document.createElement("a");
    link.download = "dithered-image.png";
    link.href = processedDataUrl;
    link.click();
  }, [processedDataUrl]);

  const handleReset = useCallback(() => {
    setOriginalImage(null);
    setOriginalDataUrl(null);
    setProcessedDataUrl(null);
    setOptions(defaultOptions);
    setPrompt("");
    setGenerateError(null);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!showComparison || !comparisonRef.current) return;
    const rect = comparisonRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setComparisonPosition(Math.max(0, Math.min(100, x)));
  }, [showComparison]);

  return (
    <div className="dark min-h-screen bg-[#0a0a0a] text-white font-sans">
      {/* Subtle gradient background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#0a0a0a]" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.03),transparent_50%)]" />
      
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-white/[0.08] backdrop-blur-sm bg-[#0a0a0a]/80">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-black" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Dither</span>
            </div>
            {originalImage && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                New Image
              </button>
            )}
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-6 py-12">
          {!originalImage ? (
            /* Upload/Generate State */
            <div className="flex flex-col items-center justify-center min-h-[70vh]">
              <div className="text-center mb-12">
                <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  Image Dithering
                </h1>
                <p className="text-lg text-white/40 max-w-md">
                  Transform your images into stunning black & white dithered artwork
                </p>
              </div>

              {/* Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white/[0.05] rounded-xl mb-8">
                <button
                  onClick={() => setInputMode("upload")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === "upload"
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </button>
                <button
                  onClick={() => setInputMode("generate")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    inputMode === "generate"
                      ? "bg-white text-black"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  <Wand2 className="w-4 h-4" />
                  Generate
                </button>
              </div>

              {inputMode === "upload" ? (
                /* Upload Mode */
                <>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    className={`
                      relative w-full max-w-xl aspect-[4/3] rounded-2xl border-2 border-dashed 
                      transition-all duration-300 cursor-pointer group
                      ${isDragging 
                        ? "border-white bg-white/[0.05] scale-[1.02]" 
                        : "border-white/20 hover:border-white/40 hover:bg-white/[0.02]"
                      }
                    `}
                  >
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <div className={`
                        w-16 h-16 rounded-2xl bg-white/[0.05] flex items-center justify-center
                        transition-all duration-300 group-hover:scale-110 group-hover:bg-white/10
                        ${isDragging ? "scale-110 bg-white/10" : ""}
                      `}>
                        <Upload className={`w-7 h-7 transition-colors ${isDragging ? "text-white" : "text-white/40 group-hover:text-white/60"}`} />
                      </div>
                      <div className="text-center">
                        <p className={`text-lg font-medium transition-colors ${isDragging ? "text-white" : "text-white/60"}`}>
                          Drop your image here
                        </p>
                        <p className="text-sm text-white/30 mt-1">
                          or click to browse
                        </p>
                      </div>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                      className="hidden"
                    />
                  </div>
                  <p className="text-sm text-white/20 mt-6">
                    Supports PNG, JPG, WebP, GIF
                  </p>
                </>
              ) : (
                /* Generate Mode */
                <div className="w-full max-w-xl space-y-6">
                  {/* Model Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/60">AI Model</label>
                    <div className="grid grid-cols-2 gap-2">
                      {aiModels.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className={`
                            p-3 rounded-xl text-left transition-all border
                            ${selectedModel === model.id
                              ? "bg-white text-black border-white"
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.08] hover:border-white/20 text-white"
                            }
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{model.name}</span>
                            <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              selectedModel === model.id
                                ? model.quality === "high" ? "bg-black/10 text-black/70" : "bg-black/10 text-black/50"
                                : model.quality === "high" ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-white/40"
                            }`}>
                              {model.quality}
                            </span>
                          </div>
                          <p className={`text-xs mt-1 ${selectedModel === model.id ? "text-black/50" : "text-white/30"}`}>
                            {model.description}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Prompt Input */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/60">Prompt</label>
                    <div className="relative">
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the image you want to generate..."
                        rows={3}
                        className="w-full px-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.08] transition-all resize-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.metaKey && !isGenerating) {
                            handleGenerate();
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Error Message */}
                  {generateError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      {generateError}
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isGenerating}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-black font-medium rounded-xl hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-5 h-5" />
                        Generate Image
                      </>
                    )}
                  </button>

                  <p className="text-xs text-white/20 text-center">
                    Press ⌘ + Enter to generate • Powered by AI Gateway
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Editor State */
            <div className="grid lg:grid-cols-[1fr,320px] gap-8">
              {/* Image Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-semibold">Preview</h2>
                    {isProcessing && (
                      <span className="text-sm text-white/40 animate-pulse">Processing...</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowComparison(!showComparison)}
                      className={`
                        px-4 py-2 text-sm rounded-lg transition-all
                        ${showComparison 
                          ? "bg-white text-black" 
                          : "bg-white/[0.05] text-white/60 hover:bg-white/10 hover:text-white"
                        }
                      `}
                    >
                      Compare
                    </button>
                    <button
                      onClick={handleDownload}
                      disabled={!processedDataUrl}
                      className="flex items-center gap-2 px-4 py-2 text-sm bg-white text-black rounded-lg hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                <div 
                  ref={comparisonRef}
                  onMouseMove={handleMouseMove}
                  className="relative bg-[#111] rounded-xl overflow-hidden border border-white/[0.08]"
                  style={{ aspectRatio: originalImage ? `${originalImage.width}/${originalImage.height}` : "auto" }}
                >
                  {showComparison && originalDataUrl ? (
                    <>
                      {/* Original image (background) */}
                      <img
                        src={originalDataUrl}
                        alt="Original"
                        className="absolute inset-0 w-full h-full object-contain"
                      />
                      {/* Processed image (clipped) */}
                      <div 
                        className="absolute inset-0 overflow-hidden"
                        style={{ clipPath: `inset(0 ${100 - comparisonPosition}% 0 0)` }}
                      >
                        <img
                          src={processedDataUrl || ""}
                          alt="Dithered"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      {/* Slider line */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                        style={{ left: `${comparisonPosition}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/40 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      {/* Labels */}
                      <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-xs text-white/80">
                        Original
                      </div>
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 backdrop-blur rounded-lg text-xs text-white/80">
                        Dithered
                      </div>
                    </>
                  ) : (
                    <img
                      src={processedDataUrl || originalDataUrl || ""}
                      alt="Dithered"
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Controls Panel */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 text-white/60">
                  <Sliders className="w-4 h-4" />
                  <span className="text-sm font-medium uppercase tracking-wider">Adjustments</span>
                </div>

                <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-6 space-y-6">
                  {/* Algorithm Selection */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white/80">Algorithm</label>
                    <div className="grid gap-2">
                      {algorithms.map((algo) => (
                        <button
                          key={algo.value}
                          onClick={() => setOptions({ ...options, algorithm: algo.value })}
                          className={`
                            p-3 rounded-lg text-left transition-all
                            ${options.algorithm === algo.value
                              ? "bg-white text-black"
                              : "bg-white/[0.03] hover:bg-white/[0.08] text-white"
                            }
                          `}
                        >
                          <div className="text-sm font-medium">{algo.label}</div>
                          <div className={`text-xs mt-0.5 ${options.algorithm === algo.value ? "text-black/60" : "text-white/40"}`}>
                            {algo.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Threshold Slider */}
                  {(options.algorithm === "floyd-steinberg" || options.algorithm === "atkinson" || options.algorithm === "threshold") && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white/80">Threshold</label>
                        <span className="text-sm text-white/40 font-mono">{options.threshold}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="255"
                        value={options.threshold}
                        onChange={(e) => setOptions({ ...options, threshold: parseInt(e.target.value) })}
                        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                          [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                          [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                      />
                    </div>
                  )}

                  {/* Contrast Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-white/80">Contrast</label>
                      <span className="text-sm text-white/40 font-mono">{options.contrast.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.05"
                      value={options.contrast}
                      onChange={(e) => setOptions({ ...options, contrast: parseFloat(e.target.value) })}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                        [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>

                  {/* Brightness Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-white/80">Brightness</label>
                      <span className="text-sm text-white/40 font-mono">{options.brightness}</span>
                    </div>
                    <input
                      type="range"
                      min="-100"
                      max="100"
                      value={options.brightness}
                      onChange={(e) => setOptions({ ...options, brightness: parseInt(e.target.value) })}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                        [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>

                  {/* Scale Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-white/80">Pixel Scale</label>
                      <span className="text-sm text-white/40 font-mono">{options.scale}×</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="8"
                      value={options.scale}
                      onChange={(e) => setOptions({ ...options, scale: parseInt(e.target.value) })}
                      className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                        [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110"
                    />
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => setOptions(defaultOptions)}
                    className="w-full py-2.5 text-sm text-white/60 hover:text-white bg-white/[0.03] hover:bg-white/[0.08] rounded-lg transition-all"
                  >
                    Reset to Defaults
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.08] mt-20">
          <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-sm text-white/30">
            <span>Built with Next.js & AI SDK</span>
            <span>Dithering runs locally • AI via Vercel AI Gateway</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
