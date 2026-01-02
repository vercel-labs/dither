import { db } from "@/lib/db";
import { dithers, users, favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DitherGallery } from "@/components/dither-gallery";
import type { DitherItem } from "@/lib/types";

async function getFavorites(
  userId: string,
): Promise<{ dithers: DitherItem[]; ids: string[] }> {
  try {
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
      .from(favorites)
      .innerJoin(dithers, eq(favorites.ditherId, dithers.id))
      .leftJoin(users, eq(dithers.userId, users.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    const filtered = results.filter((d) => d.imageUrl);
    return { dithers: filtered, ids: filtered.map((d) => d.id) };
  } catch {
    return { dithers: [], ids: [] };
  }
}

export default async function FavoritesPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/");
  }

  const { dithers: favoriteDithers, ids: favoritedIds } = await getFavorites(
    session.user.id,
  );

  return (
    <DitherGallery
      dithers={favoriteDithers}
      favoritedIds={favoritedIds}
      showUser={true}
    />
  );
}
