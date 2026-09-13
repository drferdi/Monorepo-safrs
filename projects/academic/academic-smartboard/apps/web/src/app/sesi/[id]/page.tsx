import { SesiDetailClient } from "./SesiDetailClient.tsx";

/** Static export: sentinel id; runtime id dari path client. */
export function generateStaticParams() {
  return [{ id: "placeholder" }];
}

export default function SesiDetailPage() {
  return <SesiDetailClient />;
}
