import Image from "next/image";
import { UserRound } from "lucide-react";
import male from "../assets/man.png";
import female from "../assets/women.png";

/** A patient's sex as a symbol; the generic person icon when it is not recorded. */
export function PatientAvatar({ sex, size }: { sex?: string; size: number }) {
  const src = sex === "Male" ? male : sex === "Female" ? female : null;
  return src ? <Image className="patient-avatar" src={src} alt="" width={size} height={size} unoptimized aria-hidden="true"/> : <UserRound size={size}/>;
}
