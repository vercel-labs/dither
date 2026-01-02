// 7x8 pixel download icon
const DOWNLOAD_PATTERN = [
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0, 1],
  [0, 1, 0, 1, 0, 1, 0],
  [0, 0, 1, 1, 1, 0, 0],
  [1, 1, 1, 1, 1, 1, 1],
];

// 8x7 pixel heart pattern
const HEART_PATTERN = [
  [0, 1, 1, 0, 0, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0],
];

function PixelIcon({
  pattern,
  size = 10,
}: {
  pattern: number[][];
  size?: number;
}) {
  const height = pattern.length;
  const width = pattern[0].length;
  return (
    <svg
      width={size}
      height={(size * height) / width}
      viewBox={`0 0 ${width} ${height}`}
      shapeRendering="crispEdges"
      className="opacity-30"
    >
      {pattern.map((row, y) =>
        row.map((pixel, x) =>
          pixel ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="black"
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

export default function Loading() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-4 h-4 bg-black" />
            <div className="flex-1" />
            <PixelIcon pattern={DOWNLOAD_PATTERN} size={10} />
            <PixelIcon pattern={HEART_PATTERN} size={10} />
          </div>
          <div className="aspect-square bg-black border border-black" />
        </div>
      ))}
    </div>
  );
}
