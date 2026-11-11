import { BotAvatar } from "@sentrabot/ui-web";
import { createRoot } from "react-dom/client";

// Two sizes on purpose: pointer tracking is gated at 48px, so the large chip
// must follow the cursor and the small one must not.
createRoot(document.getElementById("root")!).render(
  <div style={{ display: "flex", gap: 48, padding: 48 }}>
    <div data-testid="large">
      <BotAvatar color="#D9508A" identity="reduced-motion" size={120} status="running" />
    </div>
    <div data-testid="small">
      <BotAvatar color="#D9508A" identity="reduced-motion" size={16} status="running" />
    </div>
  </div>,
);
