export interface TeamHeadProp {
  head_student_id?: string | null;
}

export interface StudentNameRow {
  name?: string;
}

/** Axios-like response; 202 atau body `{ status: "pending" }` = menunggu Owner. */
export function isPendingApproval(
  response: { status?: number; data?: unknown } | null | undefined,
): boolean {
  if (response?.status === 202) return true;
  const data = response?.data;
  if (data && typeof data === "object" && "status" in data) {
    return (data as { status?: string }).status === "pending";
  }
  return false;
}

export function getTeamHeadLabel(
  team: TeamHeadProp,
  studentsById: Record<string, StudentNameRow>,
): string {
  if (!team.head_student_id) return "—";
  const head = studentsById[team.head_student_id];
  if (head?.name) return head.name;
  return `Murid tidak ditemukan · ${team.head_student_id.slice(0, 12)}`;
}
