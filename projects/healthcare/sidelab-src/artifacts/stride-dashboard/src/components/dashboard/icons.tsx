import type { LucideIcon } from "lucide-react";

export function ThinIcon({ Icon, className = "" }: { Icon: LucideIcon; className?: string }) {
  return <Icon aria-hidden="true" strokeWidth={1.65} className={className} />;
}
