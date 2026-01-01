import { db } from "@/lib/db";
import { dithers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";

interface DitherPageProps {
  params: Promise<{ id: string }>;
}

export default async function DitherPage({ params }: DitherPageProps) {
  const { id } = await params;

  const dither = await db.query.dithers.findFirst({
    where: eq(dithers.id, id),
  });

  if (!dither) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {dither.imageUrl && (
            <img
              src={dither.imageUrl}
              alt={dither.prompt || "Dithered image"}
              className="w-full rounded-lg"
            />
          )}
          {dither.prompt && (
            <p className="mt-4 text-neutral-400">{dither.prompt}</p>
          )}
        </div>
      </div>
    </div>
  );
}
