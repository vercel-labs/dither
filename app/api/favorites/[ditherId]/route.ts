import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { favorites } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ ditherId: string }>;
}

// Check if a dither is favorited
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ isFavorited: false });
    }

    const { ditherId } = await params;

    const favorite = await db.query.favorites.findFirst({
      where: and(
        eq(favorites.userId, session.user.id),
        eq(favorites.ditherId, ditherId),
      ),
    });

    return NextResponse.json({ isFavorited: !!favorite });
  } catch (error) {
    console.error("Error checking favorite:", error);
    return NextResponse.json({ isFavorited: false });
  }
}

// Remove a favorite
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { ditherId } = await params;

    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, session.user.id),
          eq(favorites.ditherId, ditherId),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting favorite:", error);
    return NextResponse.json(
      { error: "Failed to delete favorite" },
      { status: 500 },
    );
  }
}
