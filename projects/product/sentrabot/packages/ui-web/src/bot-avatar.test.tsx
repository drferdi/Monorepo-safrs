import { readFileSync } from "node:fs";
import { avatarIdentitySeed } from "@sentrabot/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvatarStyleProvider } from "./avatar-style.js";
import { BotAvatar, mixHex } from "./bot-avatar.js";

describe("BotAvatar", () => {
  it("renders distinct SVG gradient IDs for concurrent working avatars", () => {
    const html = renderToString(
      <div>
        <BotAvatar color="#8B5CF6" status="running" variant="robot" />
        <BotAvatar color="#10B981" status="running" variant="robot" />
      </div>,
    );

    const gradMatches = [...html.matchAll(/id="(clay-body-[^"]+)"/g)].map((m) => m[1]);
    expect(gradMatches).toHaveLength(2);
    expect(gradMatches[0]).toBeTruthy();
    expect(gradMatches[1]).toBeTruthy();
    expect(gradMatches[0]).not.toBe(gradMatches[1]);

    expect(html).toContain(`fill="url(#${gradMatches[0]})"`);
    expect(html).toContain(`fill="url(#${gradMatches[1]})"`);
  });

  it.each(["running", "queued", "leased", "waiting_input", "waiting_takeover"])(
    "renders the chip in its working state for %s status",
    (status) => {
      const html = renderToString(<BotAvatar color="#3B82F6" status={status} variant="robot" />);
      expect(html).toContain("<svg");
      expect(html).toContain("sentrabot-clay-avatar");
      expect(html).toContain('data-working="true"');
    },
  );

  it("keeps the chip mounted when idle so its timeline does not reset", () => {
    const html = renderToString(<BotAvatar color="#F59E0B" status="idle" variant="robot" />);
    expect(html).toContain('data-working="false"');
    expect(html).toContain("sentrabot-clay-avatar");
  });

  it("generates the chip avatar from the bot color (formerly the organic variant)", () => {
    const html = renderToString(
      <BotAvatar color="#D9508A" identity="maya" size={28} status="running" variant="organic" />,
    );

    expect(html).toContain("sentrabot-clay-avatar");
    expect(html).toContain('data-working="true"');
    expect(html).toContain("sentrabot-clay-avatar-eyes");
    expect(html).toContain("sentrabot-clay-avatar-eye");
    expect(html).not.toContain("sentrabot-bot-avatar-visor");
  });

  it("generates distinct chip renders for distinct bot identities", () => {
    const maya = renderToString(<BotAvatar color="#D9508A" identity="maya" variant="organic" />);
    const github = renderToString(
      <BotAvatar color="#D9508A" identity="github" variant="organic" />,
    );

    expect(maya).not.toEqual(github);
  });

  it("renders the chip avatar working state across many bot identities (formerly per shape family)", () => {
    const identities = new Map<number, string>();
    for (let index = 0; index < 500 && identities.size < 10; index++) {
      const identity = `avatar-${index}`;
      identities.set(avatarIdentitySeed(identity) % 10, identity);
    }
    expect(identities.size).toBe(10);

    for (const [, identity] of identities) {
      const html = renderToString(
        <BotAvatar color="#D9508A" identity={identity} status="running" variant="organic" />,
      );
      expect(html).toContain("sentrabot-clay-avatar-eyes");
      expect(html).toContain('data-working="true"');
    }
  });

  it("renders the clay mascot with pointer-tracked eyes and working state", () => {
    const html = renderToString(
      <BotAvatar color="#D9508A" identity="maya" size={32} status="running" variant="clay" />,
    );

    expect(html).toContain("sentrabot-clay-avatar");
    expect(html).toContain('data-working="true"');
    expect(html).toContain("sentrabot-clay-avatar-eyes");
    expect(html).toContain("sentrabot-clay-avatar-eye");
    expect(html).not.toContain("sentrabot-bot-avatar-visor");
    expect(html).not.toContain("sentrabot-organic-avatar");
  });

  it("defaults to the clay mascot when no variant or preference is provided", () => {
    const html = renderToString(<BotAvatar color="#D9508A" identity="maya" />);
    expect(html).toContain("sentrabot-clay-avatar");
  });

  it("renders unique clay gradient ids for concurrent avatars", () => {
    const html = renderToString(
      <div>
        <BotAvatar color="#8B5CF6" variant="clay" />
        <BotAvatar color="#10B981" variant="clay" />
      </div>,
    );
    const ids = [...html.matchAll(/id="(clay-body-[^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it("renders the single chip character regardless of the account avatar preference", () => {
    const html = renderToString(
      <AvatarStyleProvider value="organic">
        <BotAvatar color="#D9508A" identity="maya" />
      </AvatarStyleProvider>,
    );

    expect(html).toContain("sentrabot-clay-avatar");
  });

  it("keeps the chip idle timeline stable across status updates", () => {
    const idle = renderToString(
      <BotAvatar color="#D9508A" identity="maya" status="idle" variant="organic" />,
    );
    const working = renderToString(
      <BotAvatar color="#D9508A" identity="maya" status="running" variant="organic" />,
    );

    expect(idle.match(/--sentrabot-clay-idle-duration:([^;"]+)/)?.[1]).toBe(
      working.match(/--sentrabot-clay-idle-duration:([^;"]+)/)?.[1],
    );
    expect(idle).toContain("sentrabot-clay-avatar-eyes");
    expect(readFileSync(new URL("./styles.css", import.meta.url), "utf8")).not.toMatch(
      /data-working[^}]+animation:/s,
    );
  });

  describe("mixHex", () => {
    it("returns base for an invalid tint", () => {
      expect(mixHex("#F3ECDA", "not-a-color", 0.3)).toBe("#F3ECDA");
    });

    it("returns the tint at amount 1", () => {
      expect(mixHex("#F3ECDA", "#112233", 1)).toBe("#112233");
    });

    it("returns base at amount 0", () => {
      expect(mixHex("#F3ECDA", "#112233", 0)).toBe("#f3ecda");
    });

    it("clamps an out-of-range amount", () => {
      expect(mixHex("#F3ECDA", "#112233", 5)).toBe(mixHex("#F3ECDA", "#112233", 1));
      expect(mixHex("#F3ECDA", "#112233", -5)).toBe(mixHex("#F3ECDA", "#112233", 0));
    });
  });
});
