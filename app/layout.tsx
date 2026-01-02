import type { Metadata } from "next";
import { Space_Mono } from "next/font/google";
import { headers, cookies } from "next/headers";
import "./globals.css";
import { auth, configuredProviders } from "@/lib/auth";
import { AppProvider } from "@/components/app-provider";
import type { AiModelId } from "@/lib/atoms";

const spaceMono = Space_Mono({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Dither",
  description: "Transform images into dithered artwork",
};

function parseJSON<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const initialUser = session?.user
    ? { name: session.user.name ?? null, image: session.user.image ?? null }
    : null;

  const cookieStore = await cookies();
  const initialPrompt = parseJSON<string>(
    cookieStore.get("generate-prompt")?.value,
    "",
  );
  const initialSelectedModel = parseJSON<AiModelId>(
    cookieStore.get("selected-model")?.value,
    "bfl/flux-kontext-max",
  );

  return (
    <html lang="en">
      <body className={`${spaceMono.variable} font-sans`}>
        <AppProvider
          initialUser={initialUser}
          providers={configuredProviders}
          initialPrompt={initialPrompt}
          initialSelectedModel={initialSelectedModel}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
