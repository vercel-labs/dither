"use client";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatValue?: (value: number) => string;
}

export function Slider({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1,
  formatValue = (v) => String(v)
}: SliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] tracking-[0.2em] uppercase">
        <span className="text-black/40">{label}</span>
        <span className="text-black/60 font-mono">{formatValue(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value))}
        className="w-full h-px bg-black/20 appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
          [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:rounded-full"
      />
    </div>
  );
}

