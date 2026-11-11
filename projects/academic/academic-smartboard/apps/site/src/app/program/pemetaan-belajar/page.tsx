import type { Metadata } from "next";
import { ProgramPage } from "../../../components/ProgramPage.tsx";
import { programPemetaanBelajar } from "../../../content/program-pemetaan-belajar.ts";

export const metadata: Metadata = {
  title: programPemetaanBelajar.title,
  description: programPemetaanBelajar.description,
};

export default function Page() {
  return <ProgramPage content={programPemetaanBelajar} />;
}
