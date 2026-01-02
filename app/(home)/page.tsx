import { db } from "@/lib/db";
import { dithers, users, favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { DitherGallery } from "@/components/dither-gallery";
import type { DitherItem } from "@/lib/types";

async function getPublicDithers(): Promise<DitherItem[]> {
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
    .where(eq(dithers.visibility, "public"))
    .orderBy(desc(dithers.createdAt))
    .limit(50);

  return results.filter((d) => d.imageUrl);
}

async function getFavoritedIds(userId: string | undefined): Promise<string[]> {
  if (!userId) return [];

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

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  const [publicDithers, favoritedIds] = await Promise.all([
    getPublicDithers(),
    getFavoritedIds(userId),
  ]);

  return (
    <DitherGallery
      dithers={publicDithers}
      favoritedIds={favoritedIds}
      showUser={true}
    />
  );
}
