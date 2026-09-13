import axios from "axios";

export type User = {
  user_id: string;
  tenant_id: string | null;
  email: string;
  name: string;
  role:
    | "owner"
    | "admin_akademik"
    | "tentor"
    | "murid_ortu"
    | "finance"
    | "content_manager";
  tutor_id: string | null;
  student_ids: string[];
  parent_id: string | null;
  active: boolean;
};

export type Student = {
  student_id: string;
  name: string;
  nis?: string;
  gender: "L" | "P";
  school_id: string | null;
  grade_id: string | null;
  active: boolean;
};

export type Tutor = {
  tutor_id: string;
  name: string;
  employee_id?: string;
  phone?: string;
  email?: string;
  subject_ids?: string[];
  stages?: string[];
  base_rate?: number;
  active: boolean;
  user_id?: string | null;
};

export type Subject = {
  subject_id: string;
  name: string;
  stage?: string;
  description?: string;
  active: boolean;
};

export type School = {
  school_id: string;
  name: string;
  level?: string;
  curriculum?: string;
  address?: string;
  notes?: string;
};

export type GradeLevel = {
  grade_id: string;
  name: string;
  stage: string;
  order: number;
};

export type Schedule = {
  schedule_id: string;
  student_ids: string[];
  tutor_id: string;
  subject_id: string;
  school_id?: string | null;
  grade_id?: string | null;
  team_id?: string | null;
  format: string;
  mode: string;
  location?: string;
  date: string;
  start_time: string;
  end_time: string;
  is_recurring: boolean;
  recurrence_days?: string[];
  recurrence_until?: string | null;
  notes?: string;
  status: string;
  created_by?: string | null;
  created_at?: string;
};

export type ScheduleCreate = Omit<Schedule, "schedule_id" | "status" | "created_at"> & {
  status?: string;
};

export type StudentAttendance = {
  att_id?: string;
  session_id: string;
  student_id: string;
  status: string;
  check_time?: string | null;
  reason?: string;
  note?: string;
  recorded_by_tutor_id?: string | null;
  updated_at?: string;
};

export type LearningSession = {
  session_id: string;
  schedule_id?: string | null;
  student_ids: string[];
  tutor_id: string;
  subject_id: string;
  school_id?: string | null;
  grade_id?: string | null;
  format: string;
  mode: string;
  location?: string;
  date: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  status: string;
  verified?: boolean;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string;
  created_at?: string;
  student_attendance?: StudentAttendance[];
  tutor_attendance?: {
    check_in?: string | null;
    check_out?: string | null;
    actual_duration_min?: number;
    status?: string;
    substitute_tutor_id?: string | null;
  };
  evaluations?: Array<{
    eval_id?: string;
    student_id: string;
    competence_status?: string;
    understanding?: number;
    focus?: number;
    participation?: number;
    independence?: number;
    overall_score?: number;
    parent_note?: string;
    internal_note?: string;
    [key: string]: unknown;
  }>;
  earnings?: {
    base_amount?: number;
    incentive?: number;
    transport?: number;
    total?: number;
  };
};

export type CurriculumStatus = {
  ingest_state?: string;
  has_data?: boolean;
  [key: string]: unknown;
};

export type CurriculumStructurePhaseSubject = {
  subject: string;
  cp_count?: number;
  tp_count?: number;
};

export type CurriculumStructurePhase = {
  phase: string;
  subjects?: CurriculumStructurePhaseSubject[];
};

export type CurriculumStructure = {
  /** Backend arsip: array `{ phase, subjects[] }`; bentuk record tetap ditoleransi. */
  phases?: CurriculumStructurePhase[] | Record<string, unknown>;
  [key: string]: unknown;
};

export type CurriculumOutcome = {
  learning_outcome_code: string;
  phase: string;
  subject: string;
  element_name?: string;
  verification_status?: string;
  learning_outcome_text?: string;
  source_document_title?: string;
  source_page_start?: string;
  source_page_end?: string;
  license_category?: string;
  effective_from?: string;
  curriculum_version?: string;
  academic_year?: string;
  official_source_url?: string;
  objectives?: Array<{
    learning_objective_code: string;
    learning_objective_text?: string;
  }>;
  [key: string]: unknown;
};

export type CurriculumAlignmentGrade = {
  grade_id: string;
  name: string;
  stage: string;
  order?: number;
  phase?: string;
};

export type CurriculumAlignmentSubject = {
  subject_id: string;
  name: string;
  stage: string;
};

export type CurriculumAlignmentCell = {
  subject_id: string;
  grade_id: string;
  phase?: string;
  cp_count: number;
  element_count: number;
};

export type CurriculumAlignment = {
  grades?: CurriculumAlignmentGrade[];
  subjects?: CurriculumAlignmentSubject[];
  cells?: CurriculumAlignmentCell[];
  totals?: {
    national_subjects?: number;
    national_cp?: number;
    national_elements?: number;
    bimbel_subjects?: number;
    bimbel_grades?: number;
    cells: number;
    cells_with_guidance: number;
  };
  [key: string]: unknown;
};

export type CurriculumCoverageCp = {
  learning_outcome_code: string;
  element_name?: string;
  taught_count: number;
  last_taught_at?: string | null;
};

export type CurriculumCoverage = {
  subject?: {
    subject_id?: string;
    name: string;
    stage?: string;
    offered?: boolean;
  };
  grade?: {
    grade_id: string;
    name: string;
    phase?: string;
  };
  cps?: CurriculumCoverageCp[];
  totals?: {
    cp_total: number;
    cp_taught: number;
  };
  [key: string]: unknown;
};

export type ProgressionData = {
  student?: Student;
  overall?: Record<string, unknown>;
  subjects?: Array<Record<string, unknown>>;
  attendance?: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const devTenantSlug = process.env.NEXT_PUBLIC_DEV_TENANT_SLUG;

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api`,
  withCredentials: true,
  headers: devTenantSlug ? { "X-Tenant-Slug": devTenantSlug } : undefined,
});

/** Pure query builder — empty/null/undefined values omitted. */
export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== null && v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  const qs = entries
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return `?${qs}`;
}

export async function login(email: string, password: string) {
  const { data } = await apiClient.post<{ user: User }>("/auth/login", {
    email,
    password,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await apiClient.get<{ user: User }>("/auth/me");
  return data.user;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function listStudents(): Promise<Student[]> {
  const { data } = await apiClient.get<Student[]>("/students");
  return data;
}

export async function listSchedules(): Promise<Schedule[]> {
  const { data } = await apiClient.get<Schedule[]>("/schedules");
  return data;
}

export async function createSchedule(payload: ScheduleCreate): Promise<Schedule> {
  const { data } = await apiClient.post<Schedule>("/schedules", payload);
  return data;
}

export async function updateSchedule(
  id: string,
  payload: Partial<ScheduleCreate>,
): Promise<Schedule> {
  const { data } = await apiClient.put<Schedule>(`/schedules/${id}`, payload);
  return data;
}

export async function deleteSchedule(id: string): Promise<void> {
  await apiClient.delete(`/schedules/${id}`);
}

export async function listSessions(
  query: Record<string, string | undefined> = {},
): Promise<LearningSession[]> {
  const { data } = await apiClient.get<LearningSession[]>(
    `/sessions${buildQuery(query)}`,
  );
  return data;
}

export async function getSession(id: string): Promise<LearningSession> {
  const { data } = await apiClient.get<LearningSession>(`/sessions/${id}`);
  return data;
}

export async function saveAttendance(
  id: string,
  rows: StudentAttendance[],
): Promise<unknown> {
  const { data } = await apiClient.post(`/sessions/${id}/attendance`, rows);
  return data;
}

export async function verifySession(id: string): Promise<unknown> {
  const { data } = await apiClient.post(`/sessions/${id}/verify`);
  return data;
}

export async function cancelSession(id: string, reason: string): Promise<unknown> {
  const { data } = await apiClient.post(`/sessions/${id}/cancel`, { reason });
  return data;
}

export async function rescheduleSession(
  id: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post(`/sessions/${id}/reschedule`, payload);
  return data;
}

export async function submitEvaluation(
  id: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post(`/sessions/${id}/evaluations`, payload);
  return data;
}

export async function draftEvaluation(
  id: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post(
    `/sessions/${id}/evaluations/draft`,
    payload,
  );
  return data;
}

export async function tutorCheckIn(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await apiClient.post("/tutor/check-in", payload);
  return data;
}

export async function tutorCheckOut(payload: Record<string, unknown>): Promise<unknown> {
  const { data } = await apiClient.post("/tutor/check-out", payload);
  return data;
}

export async function attendanceCatchUp(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post("/attendance/catch-up", payload);
  return data;
}

export async function listTutors(): Promise<Tutor[]> {
  const { data } = await apiClient.get<Tutor[]>("/tutors");
  return data;
}

export async function getTutor(id: string): Promise<Tutor> {
  const { data } = await apiClient.get<Tutor>(`/tutors/${id}`);
  return data;
}

export async function listSubjects(): Promise<Subject[]> {
  const { data } = await apiClient.get<Subject[]>("/subjects");
  return data;
}

export async function listSchools(): Promise<School[]> {
  const { data } = await apiClient.get<School[]>("/schools");
  return data;
}

export async function listGradeLevels(): Promise<GradeLevel[]> {
  const { data } = await apiClient.get<GradeLevel[]>("/grade-levels");
  return data;
}

export async function getCurriculumStatus(): Promise<CurriculumStatus> {
  const { data } = await apiClient.get<CurriculumStatus>("/curriculum/status");
  return data;
}

export async function getCurriculumStructure(): Promise<CurriculumStructure> {
  const { data } = await apiClient.get<CurriculumStructure>(
    "/curriculum/structure",
  );
  return data;
}

export type CurriculumOutcomesPage = {
  items?: CurriculumOutcome[];
  total_cp?: number;
  page_size?: number;
};

export async function listCurriculumOutcomes(
  query: Record<string, string | number | undefined> = {},
): Promise<CurriculumOutcomesPage | CurriculumOutcome[]> {
  const { data } = await apiClient.get<CurriculumOutcomesPage | CurriculumOutcome[]>(
    `/curriculum/outcomes${buildQuery(query)}`,
  );
  return data;
}

export async function getCurriculumAlignment(): Promise<CurriculumAlignment> {
  const { data } = await apiClient.get<CurriculumAlignment>(
    "/curriculum/alignment",
  );
  return data;
}

export async function getCurriculumCoverage(
  query: Record<string, string | undefined> = {},
): Promise<CurriculumCoverage> {
  const { data } = await apiClient.get<CurriculumCoverage>(
    `/curriculum/coverage${buildQuery(query)}`,
  );
  return data;
}

export async function getStudentProgression(
  studentId: string,
  query: Record<string, string | undefined> = {},
): Promise<ProgressionData> {
  const { data } = await apiClient.get<ProgressionData>(
    `/students/${studentId}/progression${buildQuery(query)}`,
  );
  return data;
}
