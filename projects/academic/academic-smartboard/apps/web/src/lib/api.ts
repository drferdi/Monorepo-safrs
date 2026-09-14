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

/** Base URL `/api` untuk link slip PDF (cookie-session di tab baru). */
export function getApiBaseUrl(): string {
  return `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api`;
}

export type EarningSummaryRow = {
  tutor_id: string;
  tutor_name?: string;
  sessions?: number;
  base_amount?: number;
  incentive?: number;
  transport?: number;
  total?: number;
};

export type EarningDetail = {
  earning_id: string;
  session_id?: string;
  period_month?: string;
  base_amount?: number;
  incentive?: number;
  transport?: number;
  total?: number;
  paid?: boolean;
  verified?: boolean;
};

export type PayrollPeriod = {
  period_id: string;
  month: string;
  status?: string;
  total_amount?: number;
};

export type PayrollItem = {
  item_id: string;
  tutor_id: string;
  tutor_name?: string;
  sessions_count?: number;
  sessions?: number;
  base_total?: number;
  base_amount?: number;
  incentive_total?: number;
  incentive?: number;
  transport_total?: number;
  transport?: number;
  overtime_total?: number;
  correction_total?: number;
  total?: number;
  paid?: boolean;
  format?: string;
};

export type Rate = {
  rate_id: string;
  name: string;
  format?: string;
  mode?: string;
  tutor_id?: string | null;
  subject_id?: string | null;
  duration_min?: number;
  amount?: number;
  transport_bonus?: number;
  active?: boolean;
};

export type Payment = {
  payment_id: string;
  period_id?: string;
  tutor_id?: string;
  amount?: number;
  method?: string;
  paid_at?: string;
  bank_name?: string;
  account_last4?: string;
  transfer_ref?: string;
  reference?: string;
  note?: string;
  reconciled?: boolean;
};

export type Overtime = {
  overtime_id: string;
  tutor_id?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  duration_min?: number;
  work_type?: string;
  reason?: string;
  amount?: number;
  status?: string;
};

export async function listEarnings(
  query: Record<string, string | undefined> = {},
): Promise<EarningDetail[]> {
  const { data } = await apiClient.get<EarningDetail[]>(
    `/earnings${buildQuery(query)}`,
  );
  return data;
}

export async function getEarningsSummary(
  query: Record<string, string | undefined> = {},
): Promise<EarningSummaryRow[]> {
  const { data } = await apiClient.get<EarningSummaryRow[]>(
    `/earnings/summary${buildQuery(query)}`,
  );
  return data;
}

export async function listPayrollPeriods(): Promise<PayrollPeriod[]> {
  const { data } = await apiClient.get<PayrollPeriod[]>("/payroll/periods");
  return data;
}

export async function generatePayrollPeriod(
  month: string,
): Promise<{ items?: number; total?: number }> {
  const { data } = await apiClient.post<{ items?: number; total?: number }>(
    `/payroll/periods/${month}/generate`,
  );
  return data;
}

export async function listPayrollItems(
  periodId: string,
  query: Record<string, string | undefined> = {},
): Promise<PayrollItem[]> {
  const { data } = await apiClient.get<PayrollItem[]>(
    `/payroll/periods/${periodId}/items${buildQuery(query)}`,
  );
  return data;
}

export async function lockPayrollPeriod(periodId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/payroll/periods/${periodId}/lock`);
  return data;
}

export async function createPayrollCorrection(payload: {
  period_id: string;
  tutor_id: string;
  amount: number;
  reason: string;
}): Promise<unknown> {
  const { data } = await apiClient.post("/payroll/corrections", payload);
  return data;
}

export async function listPayments(
  query: Record<string, string | undefined> = {},
): Promise<Payment[]> {
  const { data } = await apiClient.get<Payment[]>(
    `/payments${buildQuery(query)}`,
  );
  return data;
}

export async function createPayment(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post("/payments", payload);
  return data;
}

export async function reconcilePayment(paymentId: string): Promise<unknown> {
  const { data } = await apiClient.post(`/payments/${paymentId}/reconcile`);
  return data;
}

export async function listRates(): Promise<Rate[]> {
  const { data } = await apiClient.get<Rate[]>("/rates");
  return data;
}

export async function createRate(
  payload: Record<string, unknown>,
): Promise<Rate> {
  const { data } = await apiClient.post<Rate>("/rates", payload);
  return data;
}

export async function updateRate(
  rateId: string,
  payload: Record<string, unknown>,
): Promise<Rate> {
  const { data } = await apiClient.put<Rate>(`/rates/${rateId}`, payload);
  return data;
}

export async function deleteRate(rateId: string): Promise<unknown> {
  const { data } = await apiClient.delete(`/rates/${rateId}`);
  return data;
}

export async function listOvertime(
  query: Record<string, string | undefined> = {},
): Promise<Overtime[]> {
  const { data } = await apiClient.get<Overtime[]>(
    `/overtime${buildQuery(query)}`,
  );
  return data;
}

export async function createOvertime(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post("/overtime", payload);
  return data;
}

export async function decideOvertime(
  overtimeId: string,
  payload: { approve: boolean; note?: string },
): Promise<unknown> {
  const { data } = await apiClient.post(
    `/overtime/${overtimeId}/decision`,
    payload,
  );
  return data;
}

/** Generic master-resource CRUD (arsip MasterCrud). */
export async function listMasterResource<T = Record<string, unknown>>(
  resource: string,
): Promise<T[]> {
  const { data } = await apiClient.get<T[]>(`/${resource}`);
  return data;
}

export async function createMasterResource<T = Record<string, unknown>>(
  resource: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data } = await apiClient.post<T>(`/${resource}`, payload);
  return data;
}

export async function updateMasterResource<T = Record<string, unknown>>(
  resource: string,
  id: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data } = await apiClient.put<T>(`/${resource}/${id}`, payload);
  return data;
}

export async function deleteMasterResource(
  resource: string,
  id: string,
): Promise<unknown> {
  const { data } = await apiClient.delete(`/${resource}/${id}`);
  return data;
}

export type Announcement = {
  announcement_id: string;
  title?: string;
  body?: string;
  pinned?: boolean;
  publish_at?: string;
  created_at?: string;
  audience_roles?: string[];
};

export async function listAnnouncements(): Promise<{ items?: Announcement[] }> {
  const { data } = await apiClient.get<{ items?: Announcement[] }>(
    "/announcements",
  );
  return data;
}

export async function createAnnouncement(
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.post("/announcements", payload);
  return data;
}

export async function getAnnouncementReceipts(
  id: string,
): Promise<Record<string, unknown>> {
  const { data } = await apiClient.get<Record<string, unknown>>(
    `/announcements/${id}/receipts`,
  );
  return data;
}

export async function previewTutorInvitation(
  token: string,
): Promise<{ name?: string; email?: string }> {
  const { data } = await apiClient.post<{ name?: string; email?: string }>(
    "/tutor-directory/invitation/preview",
    { token },
  );
  return data;
}

export async function activateTutor(payload: {
  token: string;
  password: string;
}): Promise<{ user: User }> {
  const { data } = await apiClient.post<{ user: User }>(
    "/tutor-directory/activate",
    payload,
  );
  return data;
}

export async function previewOwnerInvitation(
  token: string,
): Promise<{ name?: string; email?: string }> {
  const { data } = await apiClient.post<{ name?: string; email?: string }>(
    "/platform/owner-invitation/preview",
    { token },
  );
  return data;
}

export async function activateOwner(payload: {
  token: string;
  password: string;
}): Promise<{ user: User }> {
  const { data } = await apiClient.post<{ user: User }>(
    "/platform/owner-invitation/activate",
    payload,
  );
  return data;
}

export type Communication = {
  communication_id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  last_message_at?: string;
};

export type CommunicationMessage = {
  message_id: string;
  author_name: string;
  body: string;
  created_at: string;
  internal?: boolean;
};

export type CommunicationDetail = {
  communication: Communication;
  messages: CommunicationMessage[];
};

export async function listCommunications(
  query: Record<string, string | undefined> = {},
): Promise<{ items: Communication[] }> {
  const { data } = await apiClient.get<{ items: Communication[] }>(
    `/communications${buildQuery(query)}`,
  );
  return data;
}

export async function getCommunication(
  id: string,
): Promise<CommunicationDetail> {
  const { data } = await apiClient.get<CommunicationDetail>(
    `/communications/${id}`,
  );
  return data;
}

export async function postCommunicationMessage(
  id: string,
  body: string,
): Promise<unknown> {
  const { data } = await apiClient.post(`/communications/${id}/messages`, {
    body,
  });
  return data;
}

export async function patchCommunication(
  id: string,
  payload: Record<string, unknown>,
): Promise<unknown> {
  const { data } = await apiClient.patch(`/communications/${id}`, payload);
  return data;
}

export type Task = {
  task_id: string;
  title: string;
  description?: string;
  tutor_id: string;
  category: string;
  priority: string;
  due_date?: string;
  status: string;
  auto_generated?: boolean;
};

export async function listTasks(
  query: Record<string, string | undefined> = {},
): Promise<Task[]> {
  const { data } = await apiClient.get<Task[]>(`/tasks${buildQuery(query)}`);
  return data;
}

export async function createTask(
  payload: Record<string, unknown>,
): Promise<Task> {
  const { data } = await apiClient.post<Task>("/tasks", payload);
  return data;
}

export async function patchTask(
  taskId: string,
  payload: Record<string, unknown>,
): Promise<Task> {
  const { data } = await apiClient.patch<Task>(`/tasks/${taskId}`, payload);
  return data;
}

export type ReportData = {
  summary?: Record<string, unknown>;
  rows?: Array<Record<string, unknown>>;
};

export async function getReport(
  tab: string,
  query: Record<string, string | undefined> = {},
): Promise<ReportData> {
  const { data } = await apiClient.get<ReportData>(
    `/reports/${tab}${buildQuery(query)}`,
  );
  return data;
}

export type Team = {
  team_id: string;
  name: string;
  head_student_id?: string | null;
  format: string;
  grade_order?: number | null;
  grade_id?: string | null;
  academic_year_id?: string | null;
  student_ids?: string[];
  notes?: string;
  active?: boolean;
};

export type AcademicYear = {
  year_id: string;
  name: string;
  start_date?: string;
  end_date?: string;
  active?: boolean;
};

export async function listTeams(): Promise<Team[]> {
  const { data } = await apiClient.get<Team[]>("/teams");
  return data;
}

export async function listAcademicYears(): Promise<AcademicYear[]> {
  const { data } = await apiClient.get<AcademicYear[]>("/academic-years");
  return data;
}

export async function createTeamRaw(payload: Record<string, unknown>) {
  return apiClient.post<Team>("/teams", payload);
}

export async function updateTeamRaw(
  teamId: string,
  payload: Record<string, unknown>,
) {
  return apiClient.put<Team>(`/teams/${teamId}`, payload);
}

export async function deleteTeamRaw(teamId: string) {
  return apiClient.delete(`/teams/${teamId}`);
}

export type JournalEntry = {
  journal_id: string;
  student_id: string;
  observation?: string;
  problem?: string;
  recommendation?: string;
  outcome?: string;
  parent_summary?: string;
  tags?: string[];
  visibility?: string;
  status?: string;
  source?: string;
  author_name?: string;
  created_at?: string;
};

export async function listStudentJournal(
  studentId: string,
): Promise<{ items: JournalEntry[] }> {
  const { data } = await apiClient.get<{ items?: JournalEntry[] }>(
    `/students/${studentId}/journal`,
  );
  return { items: data.items ?? [] };
}

export async function createJournalEntry(payload: {
  student_id: string;
  observation: string;
  recommendation?: string;
  parent_summary?: string;
  visibility?: string;
}): Promise<JournalEntry> {
  const { data } = await apiClient.post<JournalEntry>("/journal", payload);
  return data;
}

export async function createParentJournalMessage(
  studentId: string,
  payload: { message: string },
): Promise<JournalEntry> {
  const { data } = await apiClient.post<JournalEntry>(
    `/students/${studentId}/journal/parent-message`,
    payload,
  );
  return data;
}

