"use client";

import { type ApiClient, createApiClient } from "@safrs/api/client";
import { clientEnv } from "@safrs/env/client";

type CreateDemoRequest = (
  name: string,
) => ReturnType<ApiClient["api"]["demos"]["$post"]>;

export type DemoSubmission =
  | { name: string; status: "success" }
  | { message: string; status: "error" };

export function getBrowserApiBaseUrl(locationOrigin: string): string {
  const configuredOrigin = clientEnv.NEXT_PUBLIC_APP_URL
    ? new URL(clientEnv.NEXT_PUBLIC_APP_URL).origin
    : locationOrigin;
  const sameOrigin =
    configuredOrigin === locationOrigin ? configuredOrigin : locationOrigin;

  return sameOrigin;
}

export function createBrowserApiClient(locationOrigin: string) {
  return createApiClient(getBrowserApiBaseUrl(locationOrigin));
}

export async function submitDemo(
  request: CreateDemoRequest,
  name: string,
): Promise<DemoSubmission> {
  const response = await request(name);

  if (response.status === 201) {
    const demo = await response.json();
    return { name: demo.name, status: "success" };
  }

  try {
    const error = await response.json();
    return { message: error.message, status: "error" };
  } catch {
    return {
      message: "Contoh belum tersimpan. Periksa koneksi lalu coba kembali.",
      status: "error",
    };
  }
}
