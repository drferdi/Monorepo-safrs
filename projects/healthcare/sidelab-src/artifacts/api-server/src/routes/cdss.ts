import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger";
import { CdssConsultBody } from "@workspace/api-zod";

const router: IRouter = Router();
const CDSS_URL = process.env.CDSS_ENGINE_URL ?? "http://localhost:5000";

async function proxyToCdss(
  req: Request,
  res: Response,
  path: string,
  method: "GET" | "POST" = "GET",
) {
  try {
    const url = `${CDSS_URL}${path}`;
    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (method === "POST" && req.body) {
      init.body = JSON.stringify(req.body);
    }
    const upstream = await fetch(url, init);
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    req.log.error({ err }, "CDSS engine unreachable");
    res.status(503).json({ error: "CDSS engine tidak tersedia. Pastikan engine berjalan." });
  }
}

router.get("/cdss/health", (req, res) => proxyToCdss(req, res, "/health"));
router.get("/cdss/backends", (req, res) => proxyToCdss(req, res, "/backends"));
router.post("/cdss/consult", (req, res) => {
  const parsed = CdssConsultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: parsed.error.issues });
    return;
  }
  proxyToCdss(req, res, "/consult", "POST");
});

/** Streaming SSE proxy — pipes FastAPI SSE straight to the client */
router.post("/cdss/consult/stream", async (req: Request, res: Response): Promise<void> => {
  const parsed = CdssConsultBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Input tidak valid", details: parsed.error.issues });
    return;
  }
  const url = `${CDSS_URL}/consult/stream`;
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      res.status(upstream.status).json({ error: text });
      return;
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const reader = upstream.body.getReader();
    const pump = async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) { res.end(); break; }
        res.write(value);
        // @ts-ignore
        if (res.flush) (res as any).flush();
      }
    };
    req.on("close", () => reader.cancel());
    await pump();
  } catch (err) {
    logger.error({ err }, "CDSS stream proxy error");
    if (!res.headersSent) res.status(503).json({ error: "Engine tidak tersedia." });
    else res.end();
  }
});

router.get("/cdss/sessions", (req, res) => proxyToCdss(req, res, "/sessions"));
router.get("/cdss/sessions/:filename", (req, res) =>
  proxyToCdss(req, res, `/sessions/${encodeURIComponent(req.params.filename)}`),
);
router.post("/cdss/sessions/save", (req, res) => proxyToCdss(req, res, "/sessions/save", "POST"));

export default router;
