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
  formatValue = (v) => String(v),
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="font-mono text-[10px] text-black/50">
          {label.toUpperCase()}
        </span>
        <span className="font-mono text-[10px] text-black">
          {formatValue(value)}
        </span>
      </div>

      <div className="relative h-4 flex items-center">
        <div className="absolute inset-x-0 h-px bg-black/20" />
        <div
          className="absolute h-px bg-black"
          style={{ width: `${percentage}%` }}
        />

        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) =>
            onChange(
              step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value),
            )
          }
          className="w-full h-4 bg-transparent appearance-none cursor-pointer relative z-10
            [&::-webkit-slider-thumb]:appearance-none 
            [&::-webkit-slider-thumb]:w-2
            [&::-webkit-slider-thumb]:h-2
            [&::-webkit-slider-thumb]:bg-black 
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-moz-range-thumb]:w-2
            [&::-moz-range-thumb]:h-2
            [&::-moz-range-thumb]:bg-black 
            [&::-moz-range-thumb]:border-none
            [&::-moz-range-thumb]:cursor-pointer"
        />
      </div>
    </div>
  );
}
