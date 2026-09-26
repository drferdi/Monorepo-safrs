/* global Buffer, Request, File, URL, process, console */

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { analyzeEcgImageFile, MedlensInputError } from './ecg-analyzer.mjs';

const DEFAULT_PORT = 4010;
const DEFAULT_HOST = '127.0.0.1';

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.statusCode = statusCode;
  applyCors(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

async function parseMultipartForm(req) {
  const request = new Request(`http://${req.headers.host || `${DEFAULT_HOST}:${DEFAULT_PORT}`}${req.url}`, {
    method: req.method,
    headers: req.headers,
    body: Readable.toWeb(req),
    duplex: 'half',
  });

  return request.formData();
}

async function handleAnalyze(req, res, analyzeFile) {
  try {
    const formData = await parseMultipartForm(req);
    const file = formData.get('file');

    if (!(file instanceof File)) {
      sendJson(res, 400, {
        status: 'error',
        message: 'Field file wajib berisi gambar EKG.',
      });
      return;
    }

    const result = await analyzeFile(file);
    sendJson(res, 200, result);
  } catch (error) {
    if (error instanceof MedlensInputError) {
      sendJson(res, error.statusCode, {
        status: 'error',
        message: error.message,
      });
      return;
    }

    sendJson(res, 500, {
      status: 'error',
      message: 'Analisis MedLens ECG gagal diproses.',
    });
  }
}

export function createMedlensLocalServer(options = {}) {
  const analyzeFile = options.analyzeFile || analyzeEcgImageFile;
  const server = createServer(async (req, res) => {
    if (!req.url) {
      sendJson(res, 400, { status: 'error', message: 'Request URL tidak valid.' });
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host || `${DEFAULT_HOST}:${DEFAULT_PORT}`}`);

    if (url.pathname === '/api/medlens/ecg/analyze' && req.method === 'OPTIONS') {
      applyCors(res);
      res.statusCode = 204;
      res.end();
      return;
    }

    if (url.pathname === '/api/medlens/ecg/analyze' && req.method === 'POST') {
      await handleAnalyze(req, res, analyzeFile);
      return;
    }

    sendJson(res, 404, {
      status: 'error',
      message: 'Route MedLens tidak ditemukan.',
    });
  });

  return {
    server,
    start(port = DEFAULT_PORT, host = DEFAULT_HOST) {
      return new Promise((resolveStart, rejectStart) => {
        server.listen(port, host, () => resolveStart({ port, host }));
        server.once('error', rejectStart);
      });
    },
    stop() {
      return new Promise((resolveStop, rejectStop) => {
        server.close((error) => {
          if (error) {
            rejectStop(error);
            return;
          }
          resolveStop(undefined);
        });
      });
    },
  };
}

const executedAsScript =
  process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (executedAsScript) {
  const instance = createMedlensLocalServer();
  instance
    .start()
    .then(({ host, port }) => {
      process.stdout.write(`[MedLens] Local ECG service running on http://${host}:${port}\n`);
    })
    .catch((error) => {
      console.error('[MedLens] Failed to start local ECG service:', error);
      process.exitCode = 1;
    });
}
