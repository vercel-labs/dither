import { db } from "@/lib/db";
import { dithers, users, favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, or, desc, and } from "drizzle-orm";
import { HomeClient } from "@/components/home-client";

export interface DitherItem {
  id: string;
  title: string | null;
  imageUrl: string | null;
  visibility: string;
  status: string;
  createdAt: Date;
  userId: string;
  userName: string | null;
  userImage: string | null;
}

async function getGalleryData(userId: string | undefined) {
  // Build where clause: public dithers OR user's own dithers (if signed in)
  const whereClause = userId
    ? or(eq(dithers.visibility, "public"), eq(dithers.userId, userId))
    : eq(dithers.visibility, "public");

  // Fetch dithers with user info
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
    })
    .from(dithers)
    .leftJoin(users, eq(dithers.userId, users.id))
    .where(whereClause)
    .orderBy(desc(dithers.createdAt))
    .limit(50);

  // Separate into user's dithers and public dithers
  // Only show dithers that have been processed (have an imageUrl)
  const myDithers = userId
    ? results.filter((d) => d.userId === userId && d.imageUrl)
    : [];
  const publicDithers = results.filter(
    (d) => d.visibility === "public" && d.imageUrl,
  );

  return { myDithers, publicDithers };
}

async function getFavorites(userId: string | undefined): Promise<DitherItem[]> {
  if (!userId) return [];

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
      })
      .from(favorites)
      .innerJoin(dithers, eq(favorites.ditherId, dithers.id))
      .leftJoin(users, eq(dithers.userId, users.id))
      .where(eq(favorites.userId, userId))
      .orderBy(desc(favorites.createdAt));

    return results.filter((d) => d.imageUrl);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return [];
  }
}

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const userId = session?.user?.id;
  const [{ myDithers, publicDithers }, favoriteDithers] = await Promise.all([
    getGalleryData(userId),
    getFavorites(userId),
  ]);

  return (
    <HomeClient
      myDithers={myDithers}
      publicDithers={publicDithers}
      favoriteDithers={favoriteDithers}
      isSignedIn={!!userId}
    />
  );
}
