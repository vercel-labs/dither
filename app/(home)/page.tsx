import { db } from "@/lib/db";
import { dithers, users, favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { DitherGallery } from "@/components/dither-gallery";
import type { DitherItem } from "@/lib/types";

const getPublicDithers = unstable_cache(
  async (): Promise<DitherItem[]> => {
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
  },
  ["public-dithers"],
  { revalidate: 30, tags: ["dithers"] },
);

async function getFavoritedIdsUncached(userId: string): Promise<string[]> {
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

const getFavoritedIds = (userId: string | undefined) => {
  if (!userId) return Promise.resolve([]);
  return unstable_cache(
    () => getFavoritedIdsUncached(userId),
    [`favorited-ids-${userId}`],
    { revalidate: 30, tags: [`favorites-${userId}`] },
  )();
};

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
