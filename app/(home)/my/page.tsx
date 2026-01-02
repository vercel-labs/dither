import { db } from "@/lib/db";
import { dithers, users, favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";
import { DitherGallery } from "@/components/dither-gallery";
import type { DitherItem } from "@/lib/types";

async function getMyDithersUncached(userId: string): Promise<DitherItem[]> {
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

const getMyDithers = (userId: string) =>
  unstable_cache(() => getMyDithersUncached(userId), [`my-dithers-${userId}`], {
    revalidate: 30,
    tags: [`my-dithers-${userId}`],
  })();

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

const getFavoritedIds = (userId: string) =>
  unstable_cache(
    () => getFavoritedIdsUncached(userId),
    [`favorited-ids-${userId}`],
    { revalidate: 30, tags: [`favorites-${userId}`] },
  )();

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
