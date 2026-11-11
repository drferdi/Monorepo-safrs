import type { Metadata } from "next";
import { ProgramPage } from "../../../components/ProgramPage.tsx";
import { programPemantauanPerkembangan } from "../../../content/program-pemantauan-perkembangan.ts";

export const metadata: Metadata = {
  title: programPemantauanPerkembangan.title,
  description: programPemantauanPerkembangan.description,
};

export default function Page() {
  return <ProgramPage content={programPemantauanPerkembangan} />;
}
