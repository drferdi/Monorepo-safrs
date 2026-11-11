import { expect, it, vi } from "vitest";

it("registers the React hook with the shared GSAP instance before clients use it", async () => {
  vi.resetModules();
  const { gsap } = await import("gsap");
  const { useGSAP } = await import("@gsap/react");
  const registerPlugin = vi.spyOn(gsap, "registerPlugin");

  await import("../src/modules/motion/gsap");

  expect(registerPlugin).toHaveBeenCalledWith(useGSAP);
});
