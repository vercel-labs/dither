import { db } from "@/lib/db";
import { dithers, users } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { UserProfileClient } from "./user-profile-client";

interface UserPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: UserPageProps): Promise<Metadata> {
  const { id } = await params;

  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!user) {
    return { title: "User Not Found" };
  }

  return {
    title: `${user.name || "User"} - DITHER`,
    description: `View dithers by ${user.name || "this user"}`,
  };
}

async function getUserData(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return null;

  const userDithers = await db
    .select({
      id: dithers.id,
      title: dithers.title,
      imageUrl: dithers.imageUrl,
      visibility: dithers.visibility,
      status: dithers.status,
      createdAt: dithers.createdAt,
      userId: dithers.userId,
    })
    .from(dithers)
    .where(and(eq(dithers.userId, userId), eq(dithers.visibility, "public")))
    .orderBy(desc(dithers.createdAt))
    .limit(50);

  // Only show dithers with images
  const publicDithers = userDithers
    .filter((d) => d.imageUrl)
    .map((d) => ({
      ...d,
      userName: user.name,
      userImage: user.image,
    }));

  return {
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
    },
    dithers: publicDithers,
  };
}

export default async function UserPage({ params }: UserPageProps) {
  const { id } = await params;
  const data = await getUserData(id);

  if (!data) {
    notFound();
  }

  return <UserProfileClient user={data.user} dithers={data.dithers} />;
}
