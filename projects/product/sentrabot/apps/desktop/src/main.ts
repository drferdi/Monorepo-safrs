import { app, BrowserWindow, ipcMain, shell } from "electron";
import { isAllowedOrigin, validateIpcRequest } from "./security.js";

const origin = process.env.SENTRABOT_ORIGIN;

function createWindow() {
  if (!origin || !isAllowedOrigin(origin, origin)) {
    throw new Error("SENTRABOT_ORIGIN must be an exact HTTPS origin");
  }
  const window = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: new URL("./preload.js", import.meta.url).pathname,
    },
  });
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event, url) => {
    if (!isAllowedOrigin(url, origin)) event.preventDefault();
  });
  void window.loadURL(origin);
}

ipcMain.handle("get-origin", () => origin);
ipcMain.handle("open-external", async (_event, input: unknown) => {
  const request = validateIpcRequest(input);
  if (request.channel !== "open-external" || !request.value) return false;
  const url = new URL(request.value);
  const allowedExternalOrigins = (process.env.SENTRABOT_EXTERNAL_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => new URL(value).origin);
  if (url.protocol !== "https:" || !allowedExternalOrigins.includes(url.origin))
    return false;
  await shell.openExternal(url.toString());
  return true;
});

app.whenReady().then(createWindow);
