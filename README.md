# Dither

A web application for applying classic dithering effects to images. Upload your own images or generate them with AI, then transform them with various dithering algorithms.

## Features

- **Multiple Dithering Algorithms**
  - Floyd-Steinberg – classic error diffusion
  - Atkinson – lighter dithering, preserves highlights
  - Ordered (4×4) – patterned dithering
  - Bayer (8×8) – larger matrix ordered dithering
  - Threshold – simple black/white cutoff

- **Image Controls**
  - Threshold adjustment
  - Contrast enhancement
  - Brightness modification
  - Pixel scale (for retro low-res effects)

- **AI Image Generation**
  - FLUX Kontext Max / Pro
  - Gemini 2.5 Flash / 3 Pro

- **User Experience**
  - Drag & drop or click to upload
  - Real-time preview
  - Download processed images as PNG

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database

### Installation

```bash
pnpm install
```

### Environment Variables

Create a `.env.local` file:

```env
DATABASE_URL=postgres://...
BETTER_AUTH_SECRET=your-secret
OPENROUTER_API_KEY=your-key
```

### Database Setup

```bash
pnpm db:push
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm type-check` | Run TypeScript checks |
| `pnpm format` | Format code with Prettier |
| `pnpm db:generate` | Generate Drizzle migrations |
| `pnpm db:migrate` | Run migrations |
| `pnpm db:push` | Push schema to database |
| `pnpm db:studio` | Open Drizzle Studio |

## License

MIT
