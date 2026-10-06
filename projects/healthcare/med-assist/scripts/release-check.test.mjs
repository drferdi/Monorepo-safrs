import { describe, expect, it } from "vitest";

import { releaseFailures } from "./release-check.mjs";

// Synthetic values only.
const TOKEN = "synthetic-mira-token-0123456789";
const KEY = "synthetic-api-key-abcdefghij";

describe("releaseFailures", () => {
  it("passes a bundle built with empty credentials", () => {
    const files = { "background.js": 'const e={VITE_MIRA_DEV_TOKEN:"",VITE_SENTRA_API_KEY:""};' };
    expect(releaseFailures({ VITE_MIRA_DEV_TOKEN: "", VITE_SENTRA_API_KEY: "" }, files)).toEqual([]);
  });

  it("names a credential whose value is in the bundle, never the value", () => {
    const files = { "chunks/api.js": `fetch(u,{headers:{Authorization:"Bearer ${KEY}"}})` };
    const failures = releaseFailures({ VITE_SENTRA_API_KEY: KEY }, files);
    expect(failures).toEqual(["VITE_SENTRA_API_KEY tertanam di chunks/api.js"]);
    expect(failures.join(" ")).not.toContain(KEY);
  });

  it("finds a filled credential in the inlined env object even when today's env is empty", () => {
    const files = { "background.js": `const e={"VITE_MIRA_DEV_TOKEN":"${TOKEN}"};` };
    expect(releaseFailures({}, files)).toEqual(["VITE_MIRA_DEV_TOKEN tertanam di background.js"]);
  });

  it("finds a filled credential written with spaces, as an unminified bundle has it", () => {
    const files = { "background.js": `const e = { VITE_MIRA_DEV_TOKEN : "${TOKEN}" };` };
    expect(releaseFailures({}, files)).toEqual(["VITE_MIRA_DEV_TOKEN tertanam di background.js"]);
  });

  it("does not match a short env value against unrelated code", () => {
    const files = { "background.js": "const a=1;" };
    expect(releaseFailures({ VITE_SENTRA_API_KEY: "1" }, files)).toEqual([]);
  });

  it("admits the MIRA dev token for Chief's private build, never the API key", () => {
    const files = {
      "background.js": `const e={VITE_MIRA_DEV_TOKEN:"${TOKEN}",VITE_SENTRA_API_KEY:"${KEY}"};`,
    };
    const env = { VITE_MIRA_DEV_TOKEN: TOKEN, VITE_SENTRA_API_KEY: KEY };
    expect(releaseFailures(env, files, { allowDevToken: true })).toEqual([
      "VITE_SENTRA_API_KEY tertanam di background.js",
    ]);
  });
});
