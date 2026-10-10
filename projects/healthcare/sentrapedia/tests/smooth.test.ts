import { afterEach, describe, expect, it } from "vitest";
import { smooth } from "../src/components/smooth";

const globals = globalThis as unknown as { document?: unknown; window?: unknown };
function browser(options: { transition: boolean; reducedMotion: boolean }) {
  const pending: (() => void)[] = [];
  globals.window = { matchMedia: () => ({ matches: options.reducedMotion }) };
  globals.document = options.transition ? { startViewTransition: (update: () => void) => { pending.push(update); } } : {};
  return pending;
}

describe("smooth UI changes", () => {
  afterEach(() => { delete globals.document; delete globals.window; });
  it("applies the change inside a cross-fade when the browser supports view transitions", () => {
    const pending = browser({ transition: true, reducedMotion: false });
    let applied = false;
    smooth(() => { applied = true; });
    expect(applied).toBe(false);
    expect(pending).toHaveLength(1);
    pending[0]();
    expect(applied).toBe(true);
  });
  it("applies the change at once without view transitions or under reduced motion", () => {
    for (const options of [{ transition: false, reducedMotion: false }, { transition: true, reducedMotion: true }]) {
      const pending = browser(options);
      let applied = false;
      smooth(() => { applied = true; });
      expect(applied).toBe(true);
      expect(pending).toHaveLength(0);
    }
  });
});
