import { createContext, type ReactNode, useContext } from "react";

export type AvatarStyle = "clay" | "robot" | "organic";

const AvatarStyleContext = createContext<AvatarStyle>("clay");

export function AvatarStyleProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: AvatarStyle;
}) {
  return <AvatarStyleContext value={value}>{children}</AvatarStyleContext>;
}

export function useAvatarStyle(): AvatarStyle {
  return useContext(AvatarStyleContext);
}
