"use client";

import { Provider, useSetAtom } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { ReactNode, useEffect } from "react";
import { userAtom, providersAtom, type User } from "@/lib/atoms";

interface HydrateAtomsProps {
  initialUser: User | null;
  providers: string[];
  children: ReactNode;
}

function HydrateAtoms({ initialUser, providers, children }: HydrateAtomsProps) {
  useHydrateAtoms([
    [userAtom, initialUser],
    [providersAtom, providers],
  ]);
  return <>{children}</>;
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
    <Provider>
      <HydrateAtoms initialUser={initialUser} providers={providers}>
        {children}
      </HydrateAtoms>
    </Provider>
  );
}
