import type { Metadata } from "next";
import { PolicyPage } from "../../components/PolicyPage.tsx";
import { ketentuanLayanan } from "../../content/legal.ts";

export const metadata: Metadata = {
  title: ketentuanLayanan.title,
  description: ketentuanLayanan.description,
};

export default function Page() {
  return <PolicyPage content={ketentuanLayanan} />;
}
