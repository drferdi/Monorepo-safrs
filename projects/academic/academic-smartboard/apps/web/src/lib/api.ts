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

const devTenantSlug = process.env.NEXT_PUBLIC_DEV_TENANT_SLUG;

export const apiClient = axios.create({
  baseURL: `${process.env.NEXT_PUBLIC_BACKEND_URL ?? ""}/api`,
  withCredentials: true,
  headers: devTenantSlug ? { "X-Tenant-Slug": devTenantSlug } : undefined,
});

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

export type Student = {
  student_id: string;
  name: string;
  nis?: string;
  gender: "L" | "P";
  school_id: string | null;
  grade_id: string | null;
  active: boolean;
};

export async function listStudents(): Promise<Student[]> {
  const { data } = await apiClient.get<Student[]>("/students");
  return data;
}
