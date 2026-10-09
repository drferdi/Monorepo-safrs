import Image from "next/image";
import logomark from "../assets/sentra-logomark-approved-reference.png";

export function Brand({ compact = false }: { compact?: boolean }) {
  return <span className="brand" aria-label="Sentrapedia"><Image src={logomark} alt="" width={32} height={32} unoptimized aria-hidden="true"/>{!compact && <span className="brand-wordmark">Sentrapedia</span>}</span>;
}
