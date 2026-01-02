"use client";

import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { ReactNode } from "react";
import {
  userAtom,
  providersAtom,
  generatePromptAtom,
  selectedModelAtom,
  type User,
  type AiModelId,
} from "@/lib/atoms";

interface HydrateAtomsProps {
  initialUser: User | null;
  providers: string[];
  initialPrompt: string;
  initialSelectedModel: AiModelId;
  children: ReactNode;
}

function HydrateAtoms({
  initialUser,
  providers,
  initialPrompt,
  initialSelectedModel,
  children,
}: HydrateAtomsProps) {
  useHydrateAtoms([
    [userAtom, initialUser],
    [providersAtom, providers],
    [generatePromptAtom, initialPrompt],
    [selectedModelAtom, initialSelectedModel],
  ] as const);
  return <>{children}</>;
}

interface AppProviderProps {
  children: ReactNode;
  initialUser: User | null;
  providers: string[];
  initialPrompt: string;
  initialSelectedModel: AiModelId;
}

export function AppProvider({
  children,
  initialUser,
  providers,
  initialPrompt,
  initialSelectedModel,
}: AppProviderProps) {
  return (
    <Provider>
      <HydrateAtoms
        initialUser={initialUser}
        providers={providers}
        initialPrompt={initialPrompt}
        initialSelectedModel={initialSelectedModel}
      >
        {children}
      </HydrateAtoms>
    </Provider>
  );
}
