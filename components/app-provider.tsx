"use client";

import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import { ReactNode } from "react";
import {
  userAtom,
  providersAtom,
  inputModeAtom,
  generatePromptAtom,
  selectedModelAtom,
  type User,
  type InputMode,
  type AiModelId,
} from "@/lib/atoms";

interface HydrateAtomsProps {
  initialUser: User | null;
  providers: string[];
  initialInputMode: InputMode;
  initialPrompt: string;
  initialSelectedModel: AiModelId;
  children: ReactNode;
}

function HydrateAtoms({
  initialUser,
  providers,
  initialInputMode,
  initialPrompt,
  initialSelectedModel,
  children,
}: HydrateAtomsProps) {
  useHydrateAtoms([
    [userAtom, initialUser],
    [providersAtom, providers],
    [inputModeAtom, initialInputMode],
    [generatePromptAtom, initialPrompt],
    [selectedModelAtom, initialSelectedModel],
  ] as const);
  return <>{children}</>;
}

interface AppProviderProps {
  children: ReactNode;
  initialUser: User | null;
  providers: string[];
  initialInputMode: InputMode;
  initialPrompt: string;
  initialSelectedModel: AiModelId;
}

export function AppProvider({
  children,
  initialUser,
  providers,
  initialInputMode,
  initialPrompt,
  initialSelectedModel,
}: AppProviderProps) {
  return (
    <Provider>
      <HydrateAtoms
        initialUser={initialUser}
        providers={providers}
        initialInputMode={initialInputMode}
        initialPrompt={initialPrompt}
        initialSelectedModel={initialSelectedModel}
      >
        {children}
      </HydrateAtoms>
    </Provider>
  );
}
