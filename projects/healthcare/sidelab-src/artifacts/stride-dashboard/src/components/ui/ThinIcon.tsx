import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";

/** DB01-standard icon wrapper — always strokeWidth 1.65 for visual lightness. */
export function ThinIcon({ Icon, className = "", style }: { Icon: LucideIcon; className?: string; style?: CSSProperties }) {
  return <Icon aria-hidden="true" strokeWidth={1.65} className={className} style={style} />;
}
