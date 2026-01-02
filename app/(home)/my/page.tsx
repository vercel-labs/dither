import type { Metadata } from "next";
import { db } from "@/lib/db";
import { dithers, users, favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DitherGallery } from "@/components/dither-gallery";
import type { DitherItem } from "@/lib/types";

export const metadata: Metadata = {
  openGraph: {
    images: [
      "https://qh4xf4elntexsvw4.public.blob.vercel-storage.com/dithers/koFl7afapd5aRkckiPwDM-mjxgs3iw-dither.png",
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [
      "https://qh4xf4elntexsvw4.public.blob.vercel-storage.com/dithers/koFl7afapd5aRkckiPwDM-mjxgs3iw-dither.png",
    ],
  },
};

async function getMyDithers(userId: string): Promise<DitherItem[]> {
  const results = await db
    .select({
      id: dithers.id,
      title: dithers.title,
      imageUrl: dithers.imageUrl,
      visibility: dithers.visibility,
      status: dithers.status,
      createdAt: dithers.createdAt,
      userId: dithers.userId,
      userName: users.name,
      userImage: users.image,
      userCustomAvatar: users.customAvatar,
    })
    .from(dithers)
    .leftJoin(users, eq(dithers.userId, users.id))
    .where(eq(dithers.userId, userId))
    .orderBy(desc(dithers.createdAt))
    .limit(50);

  return results.filter((d) => d.imageUrl);
}

async function getFavoritedIds(userId: string): Promise<string[]> {
  try {
    const results = await db
      .select({ ditherId: favorites.ditherId })
      .from(favorites)
      .where(eq(favorites.userId, userId));

    return results.map((r) => r.ditherId);
  } catch {
    return [];
  }
}

export default async function MyDithersPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/");
  }

  const [myDithers, favoritedIds] = await Promise.all([
    getMyDithers(session.user.id),
    getFavoritedIds(session.user.id),
  ]);

  return (
    <DitherGallery
      dithers={myDithers}
      favoritedIds={favoritedIds}
      showUser={true}
      isOwnDithers={true}
    />
  );
}
