import { type ColorValue, Platform, PlatformColor } from "react-native";

function systemColor(iosName: string, fallback: string): ColorValue {
  return Platform.OS === "ios" ? PlatformColor(iosName) : fallback;
}

export const native = {
  page: "#000000",
  fill: systemColor("tertiarySystemFill", "#1C1C1E"),
  fillPressed: systemColor("secondarySystemFill", "#2C2C2E"),
  label: systemColor("label", "#FFFFFF"),
  secondaryLabel: systemColor("secondaryLabel", "#8E8E93"),
  tertiaryLabel: systemColor("tertiaryLabel", "#6C6C70"),
} as const;
