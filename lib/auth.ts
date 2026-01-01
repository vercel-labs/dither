import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, type GenericOAuthConfig } from "better-auth/plugins";
import { db } from "./db";
import { accounts, sessions, users, verifications } from "./db/schema";
import { getBaseUrl } from "./url";

// Schema mapping for drizzle adapter
const schema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
};

// Build OAuth providers from environment variables
const oauthConfigs: GenericOAuthConfig[] = [];

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  oauthConfigs.push({
    providerId: "github",
    clientId: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    authorizationUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["read:user", "user:email"],
    getUserInfo: async (tokens) => {
      if (!tokens.accessToken) return null;
      const [userRes, emailRes] = await Promise.all([
        fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }),
        fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        }),
      ]);
      const user = await userRes.json();
      const emails = await emailRes.json();
      const primaryEmail =
        emails.find((e: { primary: boolean }) => e.primary)?.email ||
        emails[0]?.email;
      return {
        id: String(user.id),
        email: primaryEmail,
        name: user.name || user.login,
        emailVerified: true,
        image: user.avatar_url,
      };
    },
  });
}

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  oauthConfigs.push({
    providerId: "google",
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["openid", "email", "profile"],
    pkce: true,
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
  });
}

// Discord OAuth
if (process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET) {
  oauthConfigs.push({
    providerId: "discord",
    clientId: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    authorizationUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "email"],
    userInfoUrl: "https://discord.com/api/users/@me",
  });
}

// Vercel OAuth
if (process.env.VERCEL_CLIENT_ID && process.env.VERCEL_CLIENT_SECRET) {
  oauthConfigs.push({
    providerId: "vercel",
    clientId: process.env.VERCEL_CLIENT_ID,
    clientSecret: process.env.VERCEL_CLIENT_SECRET,
    authorizationUrl: "https://vercel.com/oauth/authorize",
    tokenUrl: "https://api.vercel.com/login/oauth/token",
    scopes: ["openid", "email", "profile"],
    pkce: true,
    getUserInfo: async (tokens) => {
      if (!tokens.accessToken) return null;
      const response = await fetch(
        "https://api.vercel.com/login/oauth/userinfo",
        {
          headers: { Authorization: `Bearer ${tokens.accessToken}` },
        },
      );
      const profile = await response.json();
      return {
        id: profile.sub,
        email: profile.email,
        name: profile.preferred_username ?? profile.name,
        emailVerified: profile.email_verified ?? true,
        image: profile.picture,
      };
    },
  });
}

// Build plugins array
const plugins =
  oauthConfigs.length > 0 ? [genericOAuth({ config: oauthConfigs })] : [];

export const auth = betterAuth({
  baseURL: getBaseUrl(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins,
});

// Export configured provider IDs for client use
export const configuredProviders = oauthConfigs.map((c) => c.providerId);
