import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
// polish.css is linked from index.html (and the static pages in public/)
// so one copy serves both the app and tentang/privasi/ketentuan.
import { initViewportVars } from "./lib/viewport.js";

initViewportVars();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
