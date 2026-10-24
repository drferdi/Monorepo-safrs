// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// The site's promo film (apps/site, section 2 beneath the wordmark): it autoplays muted, and sound starts only on a click.
const site = path.resolve(__dirname, "../apps/site");
const markup = readFileSync(path.join(site, "source/index.html"), "utf8").match(/<section id="logo-middle">[\s\S]*?<\/section>/)![0];
const script = readFileSync(path.join(site, "assets/product-film.js"), "utf8");

function load() {
  document.body.innerHTML = markup;
  const video = document.querySelector<HTMLVideoElement>(".product-film-video")!;
  let paused = true;
  Object.defineProperty(video, "paused", { get: () => paused });
  video.play = vi.fn(() => { paused = false; video.dispatchEvent(new Event("play")); return Promise.resolve(); });
  video.pause = vi.fn(() => { paused = true; video.dispatchEvent(new Event("pause")); });
  window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: () => undefined })) as unknown as typeof window.matchMedia;
  new Function(script)();
  return { video, sound: document.querySelector<HTMLButtonElement>(".product-film-sound")!, play: document.querySelector<HTMLButtonElement>(".product-film-toggle")! };
}

describe("site promo film sound", () => {
  beforeEach(() => { document.body.innerHTML = ""; });

  it("starts muted, so the browser lets it autoplay", () => {
    const { video, sound } = load();
    expect(video.muted).toBe(true);
    expect([sound.textContent, sound.getAttribute("aria-pressed"), sound.getAttribute("aria-label")]).toEqual(["Suara", "false", "Nyalakan suara film"]);
  });

  it("turns sound on and off with its own button, apart from play and pause", () => {
    const { video, sound, play } = load();
    sound.click();
    expect([video.muted, sound.textContent, sound.getAttribute("aria-pressed"), sound.getAttribute("aria-label")]).toEqual([false, "Bisukan", "true", "Bisukan film"]);
    expect(play.textContent).toBe("Jeda");
    sound.click();
    expect([video.muted, sound.textContent, sound.getAttribute("aria-pressed")]).toEqual([true, "Suara", "false"]);
    expect(play.textContent).toBe("Jeda");
  });

  it("resumes a paused film when sound is turned on", async () => {
    const { video, sound, play } = load();
    play.click();
    expect(video.paused).toBe(true);
    sound.click();
    await Promise.resolve();
    expect([video.paused, video.muted, play.textContent]).toEqual([false, false, "Jeda"]);
  });

  it("disables the sound button when the film fails to load", () => {
    const { video, sound } = load();
    video.dispatchEvent(new Event("error"));
    expect(sound.disabled).toBe(true);
  });
});
