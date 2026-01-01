import { db } from "@/lib/db";
import { dithers, type Visibility } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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

  // Check if user can view this dither
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const isOwner = session?.user?.id === dither.userId;

  // If private and not owner, show not found
  if (dither.visibility === "private" && !isOwner) {
    notFound();
  }

  return (
    <DitherView
      id={dither.id}
      imageUrl={dither.imageUrl}
      title={dither.title}
      prompt={dither.prompt}
      visibility={dither.visibility as Visibility}
      isOwner={isOwner}
    />
  );
}
