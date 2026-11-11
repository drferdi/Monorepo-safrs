import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { existsSync } from "node:fs";
import { join } from "node:path";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes always take priority
app.use("/api", router);

// Static file serving for Electron production mode
// Set STATIC_DIR env var to the built React app directory
const STATIC_DIR = process.env.STATIC_DIR;
if (STATIC_DIR && existsSync(STATIC_DIR)) {
  logger.info({ STATIC_DIR }, "Serving static UI from directory");
  app.use(express.static(STATIC_DIR));
  // SPA fallback — any unmatched route serves index.html
  app.get("*", (_req, res) => {
    res.sendFile(join(STATIC_DIR, "index.html"));
  });
}

export default app;
