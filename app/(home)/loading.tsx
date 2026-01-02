export default function Loading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 border border-black/10 bg-black/5" />
            <div className="h-2 flex-1 bg-black/10" />
            <div className="w-3 h-3 bg-black/10" />
            <div className="w-3 h-3 bg-black/10" />
          </div>
          <div className="aspect-square bg-black/5 border border-black/10" />
        </div>
      ))}
    </div>
  );
}
