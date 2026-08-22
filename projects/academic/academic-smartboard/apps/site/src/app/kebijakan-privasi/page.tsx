import type { Metadata } from "next";
import { PolicyPage } from "../../components/PolicyPage.tsx";
import { kebijakanPrivasi } from "../../content/legal.ts";

export const metadata: Metadata = {
  title: kebijakanPrivasi.title,
  description: kebijakanPrivasi.description,
};

export default function Page() {
  return <PolicyPage content={kebijakanPrivasi} />;
}
