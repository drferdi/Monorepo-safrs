import { idID } from "@clerk/localizations";

// Every user-facing string is Indonesian (AGENT-CONTEXT section 1), so the Clerk widgets speak Indonesian too, and the
// provider sends no telemetry to Clerk: the CSP in src/proxy.ts lists no telemetry host, and a clinical product reports
// nothing it does not have to (tier 2 of the 2026-11-02 auth audit).
export const clerkProviderOptions = { localization: idID, telemetry: { disabled: true } } as const;
