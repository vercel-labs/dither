import type { Metadata } from "next";
import { Instrument_Serif, IBM_Plex_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { auth, configuredProviders } from "@/lib/auth";
import { AppProvider } from "@/components/app-provider";

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

  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${ibmPlexMono.variable} antialiased`}
      >
        <AppProvider initialUser={initialUser} providers={configuredProviders}>
          {children}
        </AppProvider>
      </body>
    </html>
  );
}
