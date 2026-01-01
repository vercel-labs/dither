"use client";

import { createContext, useContext, ReactNode } from "react";

interface User {
  name: string | null;
  image: string | null;
}

interface AppContextValue {
  user: User | null;
  providers: string[];
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}

interface AppProviderProps {
  children: ReactNode;
  initialUser: User | null;
  providers: string[];
}

export function AppProvider({
  children,
  initialUser,
  providers,
}: AppProviderProps) {
  return (
    <AppContext.Provider value={{ user: initialUser, providers }}>
      {children}
    </AppContext.Provider>
  );
}
