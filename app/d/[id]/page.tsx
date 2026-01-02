import type { Metadata } from "next";
import { db } from "@/lib/db";
import { dithers, type Visibility, type DitherStatus } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { DitherView } from "./dither-view";

interface DitherPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: DitherPageProps): Promise<Metadata> {
  const { id } = await params;

  const dither = await db.query.dithers.findFirst({
    where: eq(dithers.id, id),
  });

  if (!dither) {
    return {
      title: "Dither Not Found",
    };
  }

  // Handle pending/generating dithers
  if (dither.status !== "ready" || !dither.imageUrl) {
    return {
      title: dither.status === "failed" ? "Generation Failed" : "Generating...",
    };
  }

  const title = (dither.title || "Dither").toUpperCase();

  return {
    title,
    description: dither.prompt || "A dithered image created with Dither",
    openGraph: {
      title,
      description: dither.prompt || "A dithered image created with Dither",
      images: [
        {
          url: dither.imageUrl,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: dither.prompt || "A dithered image created with Dither",
      images: [dither.imageUrl],
    },
  };
}

export default async function DitherPage({ params }: DitherPageProps) {
  const { id } = await params;

  const dither = await db.query.dithers.findFirst({
    where: eq(dithers.id, id),
  });

  if (!dither) {
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
      status={dither.status as DitherStatus}
      errorMessage={dither.errorMessage}
      isOwner={isOwner}
      savedSettings={{
        threshold: Number(dither.threshold),
        contrast: Number(dither.contrast),
        brightness: Number(dither.brightness),
      }}
    />
  );
}
