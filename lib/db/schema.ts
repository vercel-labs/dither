import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { generateId } from "../id";

// Better Auth tables (plural names)
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  // Custom avatar settings
  customAvatar: text("custom_avatar"),
  avatarThreshold: text("avatar_threshold"),
  avatarContrast: text("avatar_contrast"),
  avatarBrightness: text("avatar_brightness"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

// Visibility options for dithers
export const VISIBILITY_OPTIONS = ["private", "public"] as const;
export type Visibility = (typeof VISIBILITY_OPTIONS)[number];

// Status options for dithers
export const STATUS_OPTIONS = [
  "pending",
  "generating",
  "ready",
  "failed",
] as const;
export type DitherStatus = (typeof STATUS_OPTIONS)[number];

// Application tables
export const dithers = pgTable("dithers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title"),
  prompt: text("prompt"),
  modelId: text("model_id"), // AI model used for generation
  imageUrl: text("image_url"), // The processed/dithered version ({id}.png)
  // Original is stored as {id}-original.png
  // Dither settings
  threshold: text("threshold").notNull().default("255"),
  contrast: text("contrast").notNull().default("2"),
  brightness: text("brightness").notNull().default("75"),
  visibility: text("visibility").notNull().default("private"),
  status: text("status").notNull().default("ready"), // pending, generating, ready, failed
  errorMessage: text("error_message"), // Error message if generation failed
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Favorites table
export const favorites = pgTable("favorites", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  ditherId: text("dither_id")
    .notNull()
    .references(() => dithers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Type exports
export type User = typeof users.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Dither = typeof dithers.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
