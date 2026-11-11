import { ProgressionDetailClient } from "./ProgressionDetailClient.tsx";

export function generateStaticParams() {
  return [{ studentId: "placeholder" }];
}

export default function ProgressionDetailPage() {
  return <ProgressionDetailClient />;
}
