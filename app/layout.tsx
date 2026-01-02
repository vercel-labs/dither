import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import { headers, cookies } from "next/headers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { auth, configuredProviders } from "@/lib/auth";
import { AppProvider } from "@/components/app-provider";
import { Header } from "@/components/header";
import type { AiModelId } from "@/lib/atoms";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "DITHER",
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
      <body className={`${ibmPlexMono.variable} font-mono`}>
        <AppProvider
          initialUser={initialUser}
          providers={configuredProviders}
          initialPrompt={initialPrompt}
          initialSelectedModel={initialSelectedModel}
        >
          <div className="min-h-dvh flex flex-col">
            <Header />
            {children}
          </div>
        </AppProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
