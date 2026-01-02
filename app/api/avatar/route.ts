import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      customAvatar: user.customAvatar,
      settings: user.avatarThreshold
        ? {
            threshold: Number(user.avatarThreshold),
            contrast: Number(user.avatarContrast),
            brightness: Number(user.avatarBrightness),
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching avatar settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch avatar settings" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customAvatar, settings } = body;

    await db
      .update(users)
      .set({
        customAvatar: customAvatar ?? null,
        avatarThreshold: settings?.threshold?.toString() ?? null,
        avatarContrast: settings?.contrast?.toString() ?? null,
        avatarBrightness: settings?.brightness?.toString() ?? null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating avatar settings:", error);
    return NextResponse.json(
      { error: "Failed to update avatar settings" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db
      .update(users)
      .set({
        customAvatar: null,
        avatarThreshold: null,
        avatarContrast: null,
        avatarBrightness: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error resetting avatar:", error);
    return NextResponse.json(
      { error: "Failed to reset avatar" },
      { status: 500 },
    );
  }
}
