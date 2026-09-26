import type { MedlensEcgAnalyzeResponse } from '@/lib/clinical/medlens/ecg-types';
import {
  MEDLENS_ECG_ACCEPTED_FILE_EXTENSIONS,
  MEDLENS_ECG_ACCEPTED_MIME_TYPES,
  MEDLENS_ECG_MAX_FILE_SIZE_BYTES,
} from '@/lib/clinical/medlens/ecg-types';
import { normalizeMedlensEcgAnalyzeResponse } from '@/lib/clinical/medlens/ecg-result-normalizer';
import { getAuthConfig } from './auth-client';
import {
  authedUpload,
  AuthRequiredError,
  BridgeApiError,
  BridgeResponseFormatError,
} from './authed-fetch';

const ECG_ANALYZE_PATH = '/api/medlens/ecg/analyze';
const MEDLENS_UNAVAILABLE_MESSAGE =
  'MedLens belum tersedia untuk workspace ini. Coba lagi nanti atau hubungi admin.';
const MEDLENS_UNREACHABLE_MESSAGE =
  'MedLens belum dapat dijangkau saat ini. Coba lagi nanti atau hubungi admin.';
const MEDLENS_INVALID_RESPONSE_MESSAGE = 'Respons layanan MedLens tidak valid.';
const MEDLENS_PROCESSING_MESSAGE =
  'Analisis MedLens belum dapat diproses. Coba lagi nanti atau hubungi admin.';
const MEDLENS_RUNTIME_READY_MESSAGE = 'MedLens siap dipakai untuk analisis ECG.';
const DEFAULT_LOCAL_MEDLENS_BASE_URL = 'http://127.0.0.1:4010';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isLoopbackBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && LOOPBACK_HOSTS.has(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

async function getLocalMedlensBaseUrl(): Promise<string | null> {
  const config = await getAuthConfig();
  const baseUrl = config.baseUrl.trim().replace(/\/$/, '');
  return isLoopbackBaseUrl(baseUrl) ? baseUrl : DEFAULT_LOCAL_MEDLENS_BASE_URL;
}

async function getMedlensTransportMode(): Promise<{
  prefersLocalPrimary: boolean;
  allowsLocalFallback: boolean;
}> {
  // Chief requested MedLens auth removal first.
  // Always try the local waveform runtime before any Crew-authenticated fallback.
  await getAuthConfig();
  return {
    prefersLocalPrimary: true,
    allowsLocalFallback: true,
  };
}

async function localMedlensUpload<T>(path: string, formData: FormData): Promise<T> {
  const baseUrl = await getLocalMedlensBaseUrl();

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Tidak dapat mengupload file ke server. Periksa koneksi internet.');
  }

  const raw = await response.text();
  if (!response.ok) {
    throw new BridgeApiError(response.status, raw);
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new BridgeResponseFormatError(response.status, 'Respons layanan MedLens tidak valid.');
  }
}

function buildEcgAnalyzeFormData(file: File): FormData {
  const formData = new FormData();
  formData.append('file', file);
  return formData;
}

async function computeUploadedSourceHash(file: File): Promise<string | null> {
  try {
    const input =
      typeof file.arrayBuffer === 'function'
        ? await file.arrayBuffer()
        : await new Response(file).arrayBuffer();
    const digest = await globalThis.crypto.subtle.digest('SHA-256', input);
    return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

function normalizeAnalyzePayload(
  payload: unknown,
  trustedSourceHash: string | null
): MedlensEcgAnalyzeResponse {
  return normalizeMedlensEcgAnalyzeResponse(payload, {
    trustedSourceHash,
  });
}

function shouldRetryUnsafeAuthedPayload(result: MedlensEcgAnalyzeResponse): boolean {
  return !result.audit_log.outputPassedEvidenceGate;
}

export function isAcceptedEcgImageFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  const extensionAccepted = MEDLENS_ECG_ACCEPTED_FILE_EXTENSIONS.includes(
    extension as (typeof MEDLENS_ECG_ACCEPTED_FILE_EXTENSIONS)[number]
  );
  const mimeAccepted =
    !file.type ||
    MEDLENS_ECG_ACCEPTED_MIME_TYPES.includes(
      file.type as (typeof MEDLENS_ECG_ACCEPTED_MIME_TYPES)[number]
    ) ||
    file.type === 'application/octet-stream';

  return extensionAccepted && mimeAccepted;
}

function containsDeveloperOperationalDetail(message: string): boolean {
  return /localhost|127\.0\.0\.1|\bport\b|terminal|command|native messaging|companion app|medlens-local|node services/i.test(
    message
  );
}

function normalizeMedlensRequestError(error: unknown): Error {
  if (error instanceof AuthRequiredError) {
    return new Error(MEDLENS_UNREACHABLE_MESSAGE);
  }

  if (error instanceof BridgeResponseFormatError) {
    return new Error(MEDLENS_INVALID_RESPONSE_MESSAGE);
  }

  if (error instanceof BridgeApiError) {
    if (error.status === 401 || error.status === 403) {
      return new Error(MEDLENS_UNREACHABLE_MESSAGE);
    }

    if (error.status === 404 || error.status === 503) {
      return new Error(MEDLENS_UNAVAILABLE_MESSAGE);
    }

    const message = error.message.trim();
    if (message && !containsDeveloperOperationalDetail(message)) {
      return new Error(message);
    }

    return new Error(MEDLENS_PROCESSING_MESSAGE);
  }

  if (error instanceof Error) {
    if (/timeout|network|upload|terhubung|mengupload|fetch/i.test(error.message)) {
      return new Error(MEDLENS_UNREACHABLE_MESSAGE);
    }

    if (!containsDeveloperOperationalDetail(error.message)) {
      return new Error(error.message);
    }
  }

  return new Error(MEDLENS_PROCESSING_MESSAGE);
}

export type MedlensRuntimeReadiness =
  | 'ready'
  | 'auth_required'
  | 'unavailable'
  | 'server_unreachable'
  | 'server_error';

export interface MedlensRuntimeStatus {
  readiness: MedlensRuntimeReadiness;
  message: string;
  serverReachable: boolean;
  serverAuthorized: boolean;
}

function isMedlensRouteValidationError(error: BridgeApiError): boolean {
  if (error.status !== 400 && error.status !== 415 && error.status !== 413) {
    return false;
  }

  const message = error.message.toLowerCase();
  return message.includes('field file') || message.includes('gambar ekg') || message.includes('png');
}

function mapLocalRuntimeFailure(error: unknown): MedlensRuntimeStatus {
  if (error instanceof BridgeApiError && isMedlensRouteValidationError(error)) {
    return {
      readiness: 'ready',
      message: MEDLENS_RUNTIME_READY_MESSAGE,
      serverReachable: true,
      serverAuthorized: true,
    };
  }

  if (error instanceof BridgeApiError && (error.status === 404 || error.status === 503)) {
    return {
      readiness: 'unavailable',
      message: MEDLENS_UNAVAILABLE_MESSAGE,
      serverReachable: true,
      serverAuthorized: true,
    };
  }

  if (
    error instanceof Error &&
    /timeout|network|upload|terhubung|mengupload|fetch/i.test(error.message)
  ) {
    return {
      readiness: 'server_unreachable',
      message: MEDLENS_UNREACHABLE_MESSAGE,
      serverReachable: false,
      serverAuthorized: false,
    };
  }

  return {
    readiness: 'server_error',
    message: normalizeMedlensRequestError(error).message,
    serverReachable: true,
    serverAuthorized: false,
  };
}

export async function getMedlensRuntimeStatus(): Promise<MedlensRuntimeStatus> {
  const transportMode = await getMedlensTransportMode();
  let localPrimaryError: unknown = null;

  if (transportMode.prefersLocalPrimary) {
    try {
      await localMedlensUpload<unknown>(ECG_ANALYZE_PATH, new FormData());
      return {
        readiness: 'ready',
        message: MEDLENS_RUNTIME_READY_MESSAGE,
        serverReachable: true,
        serverAuthorized: true,
      };
    } catch (localFirstError) {
      if (localFirstError instanceof BridgeApiError && isMedlensRouteValidationError(localFirstError)) {
        return {
          readiness: 'ready',
          message: MEDLENS_RUNTIME_READY_MESSAGE,
          serverReachable: true,
          serverAuthorized: true,
        };
      }
      localPrimaryError = localFirstError;
    }
  }

  try {
    await authedUpload<unknown>(ECG_ANALYZE_PATH, new FormData());
    return {
      readiness: 'ready',
      message: MEDLENS_RUNTIME_READY_MESSAGE,
      serverReachable: true,
      serverAuthorized: true,
    };
  } catch (error) {
    const remoteAuthBlocked =
      error instanceof AuthRequiredError ||
      (error instanceof BridgeApiError && (error.status === 401 || error.status === 403));

    if (remoteAuthBlocked) {
      return mapLocalRuntimeFailure(localPrimaryError ?? error);
    }

    if (error instanceof BridgeApiError) {
      if (isMedlensRouteValidationError(error)) {
        return {
          readiness: 'ready',
          message: MEDLENS_RUNTIME_READY_MESSAGE,
          serverReachable: true,
          serverAuthorized: true,
        };
      }

      if (error.status === 404 || error.status === 503) {
        return {
          readiness: 'unavailable',
          message: MEDLENS_UNAVAILABLE_MESSAGE,
          serverReachable: true,
          serverAuthorized: true,
        };
      }

      return {
        readiness: 'server_error',
        message: normalizeMedlensRequestError(error).message,
        serverReachable: true,
        serverAuthorized: true,
      };
    }

    if (error instanceof BridgeResponseFormatError) {
      return {
        readiness: 'server_error',
        message: MEDLENS_INVALID_RESPONSE_MESSAGE,
        serverReachable: true,
        serverAuthorized: true,
      };
    }

    if (
      error instanceof Error &&
      /timeout|network|upload|terhubung|mengupload|fetch/i.test(error.message)
    ) {
      return {
        readiness: 'server_unreachable',
        message: MEDLENS_UNREACHABLE_MESSAGE,
        serverReachable: false,
        serverAuthorized: false,
      };
    }

    return {
      readiness: 'server_error',
      message: normalizeMedlensRequestError(error).message,
      serverReachable: true,
      serverAuthorized: false,
    };
  }
}

export async function analyzeEcgImage(file: File): Promise<MedlensEcgAnalyzeResponse> {
  if (!isAcceptedEcgImageFile(file)) {
    throw new Error('Format gambar EKG tidak didukung. Gunakan PNG, JPG, atau JPEG.');
  }

  if (file.size > MEDLENS_ECG_MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file EKG melebihi batas 10 MB.');
  }

  const trustedSourceHash = await computeUploadedSourceHash(file);
  const transportMode = await getMedlensTransportMode();

  let payload: unknown;
  let localPrimaryError: unknown = null;

  if (transportMode.prefersLocalPrimary) {
    try {
      payload = await localMedlensUpload<unknown>(ECG_ANALYZE_PATH, buildEcgAnalyzeFormData(file));
      return normalizeAnalyzePayload(payload, trustedSourceHash);
    } catch (localError) {
      localPrimaryError = localError;
    }
  }

  try {
    payload = await authedUpload<MedlensEcgAnalyzeResponse>(
      ECG_ANALYZE_PATH,
      buildEcgAnalyzeFormData(file)
    );
  } catch (error) {
    const remoteAuthBlocked =
      error instanceof AuthRequiredError ||
      (error instanceof BridgeApiError && (error.status === 401 || error.status === 403));

    if (remoteAuthBlocked) {
      if (!transportMode.allowsLocalFallback) {
        throw normalizeMedlensRequestError(error);
      }
      throw normalizeMedlensRequestError(localPrimaryError ?? error);
    }

    throw normalizeMedlensRequestError(error);
  }

  const authedResult = normalizeAnalyzePayload(payload, trustedSourceHash);
  return shouldRetryUnsafeAuthedPayload(authedResult) ? authedResult : authedResult;
}

export const medlensClient = {
  analyzeEcgImage,
  getRuntimeStatus: getMedlensRuntimeStatus,
};
