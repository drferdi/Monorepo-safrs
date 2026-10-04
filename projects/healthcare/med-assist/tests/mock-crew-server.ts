import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';

import { makeMedlensEcgAnalyzeResponse } from './medlens-contract/ecg-contract-fixtures';

export interface MockCrewDoctor {
  id: string;
  name: string;
  role: string;
  professional_name?: string;
  full_name?: string;
  availability_status?: 'online' | 'busy' | 'away' | 'offline';
}

export interface MockCrewRecordedRequest {
  method: string;
  path: string;
  headers: IncomingMessage['headers'];
  rawBody: string;
  jsonBody: unknown;
}

export interface MockCrewServer {
  baseUrl: string;
  requests: MockCrewRecordedRequest[];
  close(): Promise<void>;
  clearRequests(): void;
}

export interface MockBridgeEntry {
  id: string;
  pelayananId: string;
  payload: Record<string, unknown>;
}

interface MockCrewServerOptions {
  doctors?: MockCrewDoctor[];
  loginUser?: {
    username: string;
    displayName: string;
    role: string;
    institution: string;
    profession: string;
  };
  automationToken?: string;
  medlensEcgEnabled?: boolean;
  /** Dashboard bridge entries served as pending until Assist claims them. */
  bridgeEntries?: MockBridgeEntry[];
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

function isMultipartUpload(req: IncomingMessage): boolean {
  return String(req.headers['content-type'] || '')
    .toLowerCase()
    .includes('multipart/form-data');
}

function hasMultipartFileField(rawBody: string): boolean {
  return rawBody.includes('name="file"') && rawBody.includes('filename=');
}

function sendMedlensUnavailable(res: ServerResponse): void {
  sendJson(res, 503, {
    message: 'MedLens belum tersedia saat ini.',
  });
}

export async function startMockCrewServer(
  options: MockCrewServerOptions = {}
): Promise<MockCrewServer> {
  const requests: MockCrewRecordedRequest[] = [];
  const doctors = options.doctors ?? [
    {
      id: 'doctor-1',
      name: 'ferdi',
      professional_name: 'dr. Ferdi Iskandar',
      role: 'dokter',
      availability_status: 'online',
    },
  ];
  const loginUser = options.loginUser ?? {
    username: 'drferdi',
    displayName: 'dr. Ferdi Iskandar',
    role: 'DOKTER',
    institution: 'Puskesmas Balowerti',
    profession: 'Umum',
  };
  const automationToken = options.automationToken ?? 'local-automation-token';
  const bridgeEntries = (options.bridgeEntries ?? []).map((entry) => ({
    ...entry,
    status: 'pending',
  }));
  const describeEntry = (entry: (typeof bridgeEntries)[number]) => ({
    id: entry.id,
    status: entry.status,
    createdAt: '2026-10-03T08:00:00Z',
    createdBy: 'dashboard',
    pelayananId: entry.pelayananId,
    hasAnamnesa: 'anamnesa' in entry.payload,
    hasDiagnosa: 'diagnosa' in entry.payload,
    hasResep: 'resep' in entry.payload,
  });

  const server = createServer(async (req, res) => {
    const method = (req.method || 'GET').toUpperCase();
    const url = new URL(req.url || '/', 'http://127.0.0.1');
    const rawBody = await readRequestBody(req);
    let jsonBody: unknown = null;
    if (rawBody.trim()) {
      try {
        jsonBody = JSON.parse(rawBody);
      } catch {
        jsonBody = rawBody;
      }
    }

    requests.push({
      method,
      path: url.pathname,
      headers: req.headers,
      rawBody,
      jsonBody,
    });

    if (url.pathname === '/api/auth/login' && method === 'POST') {
      res.setHeader('Set-Cookie', 'crew_session=active; Path=/; SameSite=Lax');
      sendJson(res, 200, {
        ok: true,
        user: loginUser,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      });
      return;
    }

    if (url.pathname === '/api/auth/logout' && method === 'POST') {
      res.setHeader('Set-Cookie', 'crew_session=; Path=/; Max-Age=0; SameSite=Lax');
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/api/auth/session' && method === 'GET') {
      const cookie = String(req.headers.cookie || '');
      if (!cookie.includes('crew_session=active')) {
        sendJson(res, 401, { ok: false, error: 'No active session' });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        user: loginUser,
        expiresAt: Date.now() + 12 * 60 * 60 * 1000,
      });
      return;
    }

    const accessToken = String(req.headers['x-crew-access-token'] || '');
    if (accessToken !== automationToken) {
      sendJson(res, 401, { ok: false, error: 'Unauthorized automation token' });
      return;
    }

    if (url.pathname === '/api/medlens/ecg/analyze' && method === 'POST') {
      if (options.medlensEcgEnabled === false) {
        sendMedlensUnavailable(res);
        return;
      }

      if (!isMultipartUpload(req) || !hasMultipartFileField(rawBody)) {
        sendJson(res, 400, {
          message: 'Field file wajib berisi gambar EKG.',
        });
        return;
      }

      sendJson(res, 200, makeMedlensEcgAnalyzeResponse());
      return;
    }

    if (url.pathname === '/api/doctors/online' && method === 'GET') {
      sendJson(res, 200, { ok: true, doctors });
      return;
    }

    if (url.pathname === '/api/consult' && method === 'POST') {
      const payload = (jsonBody || {}) as { event_id?: string };
      sendJson(res, 200, {
        ok: true,
        consultId: 'consult-local-1',
        event_id: payload.event_id || 'event-local-missing',
      });
      return;
    }

    if (url.pathname === '/api/emr/bridge' && method === 'GET') {
      const items = bridgeEntries
        .filter((entry) => entry.status === url.searchParams.get('status'))
        .map(describeEntry);
      sendJson(res, 200, { ok: true, items, count: items.length });
      return;
    }

    const bridgeEntry = bridgeEntries.find(
      (entry) => url.pathname === `/api/emr/bridge/${entry.id}`
    );
    if (bridgeEntry && method === 'GET') {
      sendJson(res, 200, {
        ok: true,
        entry: { ...describeEntry(bridgeEntry), payload: bridgeEntry.payload },
      });
      return;
    }
    if (bridgeEntry && method === 'PATCH') {
      const action = (jsonBody as { action?: string } | null)?.action;
      bridgeEntry.status = action === 'claim' ? 'claimed' : String(action);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (url.pathname === '/api/emr/patient-sync' && method === 'POST') {
      sendJson(res, 200, { ok: true, id: 'sync-local-1' });
      return;
    }

    sendJson(res, 404, { ok: false, error: 'Route not found' });
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const address = server.address() as AddressInfo;
  const baseUrl = `http://localhost:${address.port}`;

  return {
    baseUrl,
    requests,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      }),
    clearRequests: () => {
      requests.length = 0;
    },
  };
}
