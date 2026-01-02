import { Download, Heart } from "lucide-react";

export default function Loading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-black" />
            <div className="flex-1" />
            <Download size={12} strokeWidth={1.5} className="opacity-30" />
            <Heart size={12} strokeWidth={1.5} className="opacity-30" />
          </div>
          <div className="aspect-square bg-black border border-black" />
        </div>
      ))}
    </div>
  );
}
