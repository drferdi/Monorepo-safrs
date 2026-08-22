import type { Metadata } from "next";
import { ProgramPage } from "../../../components/ProgramPage.tsx";
import { programPendampinganPersonal } from "../../../content/program-pendampingan-personal.ts";

export const metadata: Metadata = {
  title: programPendampinganPersonal.title,
  description: programPendampinganPersonal.description,
};

export default function Page() {
  return <ProgramPage content={programPendampinganPersonal} />;
}
