import { createServer } from "node:http";
import { createWorkerControlApp } from "./index.js";

const app = createWorkerControlApp(() => ({
  WORKER_CONTROL_TOKEN: process.env.WORKER_CONTROL_TOKEN ?? "",
}));

createServer(async (request, response) => {
  const origin = `http://${request.headers.host ?? "127.0.0.1"}`;
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  const result = await app.fetch(
    new Request(new URL(request.url ?? "/", origin), {
      method: request.method,
      headers: request.headers as Record<string, string>,
      body: chunks.length > 0 ? Buffer.concat(chunks) : undefined,
    }),
  );
  response.statusCode = result.status;
  result.headers.forEach((value, key) => {
    response.setHeader(key, value);
  });
  response.end(Buffer.from(await result.arrayBuffer()));
}).listen(Number(process.env.PORT ?? 8787), "0.0.0.0");
