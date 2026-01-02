import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { favorites, dithers, users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, desc } from "drizzle-orm";

// Get user's favorites
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get favorites with dither info
    const results = await db
      .select({
        id: favorites.id,
        ditherId: favorites.ditherId,
        createdAt: favorites.createdAt,
        dither: {
          id: dithers.id,
          title: dithers.title,
          imageUrl: dithers.imageUrl,
          visibility: dithers.visibility,
          status: dithers.status,
          userId: dithers.userId,
        },
        ditherUser: {
          name: users.name,
          image: users.image,
        },
      })
      .from(favorites)
      .innerJoin(dithers, eq(favorites.ditherId, dithers.id))
      .leftJoin(users, eq(dithers.userId, users.id))
      .where(eq(favorites.userId, session.user.id))
      .orderBy(desc(favorites.createdAt));

    // Filter to only show dithers with imageUrl (processed)
    const favoriteDithers = results
      .filter((r) => r.dither.imageUrl)
      .map((r) => ({
        id: r.dither.id,
        title: r.dither.title,
        imageUrl: r.dither.imageUrl,
        visibility: r.dither.visibility,
        status: r.dither.status,
        userId: r.dither.userId,
        userName: r.ditherUser?.name,
        userImage: r.ditherUser?.image,
        favoritedAt: r.createdAt,
      }));

    return NextResponse.json({ favorites: favoriteDithers });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 },
    );
  }
}

// Add a favorite
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ditherId } = await request.json();

    if (!ditherId) {
      return NextResponse.json(
        { error: "ditherId is required" },
        { status: 400 },
      );
    }

    // Check if dither exists
    const dither = await db.query.dithers.findFirst({
      where: eq(dithers.id, ditherId),
    });

    if (!dither) {
      return NextResponse.json({ error: "Dither not found" }, { status: 404 });
    }

    // Check if already favorited
    const existing = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, session.user.id),
        eq(favorites.ditherId, ditherId),
      ),
    });

    if (existing) {
      return NextResponse.json({ favorite: existing });
    }

    // Create favorite
    const [favorite] = await db
      .insert(favorites)
      .values({
        userId: session.user.id,
        ditherId,
      })
      .returning();

    // Revalidate caches
    revalidateTag(`favorites-${session.user.id}`);

    return NextResponse.json({ favorite });
  } catch (error) {
    console.error("Error creating favorite:", error);
    return NextResponse.json(
      { error: "Failed to create favorite" },
      { status: 500 },
    );
  }
}
