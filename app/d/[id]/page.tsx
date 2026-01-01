import { db } from "@/lib/db";
import { dithers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DitherView } from "./dither-view";

interface DitherPageProps {
  params: Promise<{ id: string }>;
}

export default async function DitherPage({ params }: DitherPageProps) {
  const { id } = await params;

  const dither = await db.query.dithers.findFirst({
    where: eq(dithers.id, id),
  });

  if (!dither || !dither.imageUrl) {
    notFound();
  }

  return (
    <DitherView
      id={dither.id}
      imageUrl={dither.imageUrl}
      prompt={dither.prompt}
    />
  );
}
