import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import { headers, cookies } from "next/headers";
import "./globals.css";
import { auth, configuredProviders } from "@/lib/auth";
import { AppProvider } from "@/components/app-provider";
import type { InputMode, AiModelId } from "@/lib/atoms";

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
  // Get session server-side to prevent auth state flash
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const initialUser = session?.user
    ? { name: session.user.name ?? null, image: session.user.image ?? null }
    : null;

  // Read persisted state from cookies
  const cookieStore = await cookies();
  const initialInputMode = parseJSON<InputMode>(
    cookieStore.get("input-mode")?.value,
    "upload",
  );
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
      <body
        className={`${instrumentSerif.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <AppProvider
          initialUser={initialUser}
          providers={configuredProviders}
          initialInputMode={initialInputMode}
          initialPrompt={initialPrompt}
          initialSelectedModel={initialSelectedModel}
        >
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
