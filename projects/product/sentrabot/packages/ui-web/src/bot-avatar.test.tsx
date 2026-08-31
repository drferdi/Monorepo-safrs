import { readFileSync } from "node:fs";
import { avatarIdentitySeed } from "@sentrabot/core";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AvatarStyleProvider } from "./avatar-style.js";
import { BotAvatar } from "./bot-avatar.js";

describe("BotAvatar", () => {
  it("renders distinct SVG gradient IDs for concurrent working avatars", () => {
    const html = renderToString(
      <div>
        <BotAvatar color="#8B5CF6" status="running" variant="robot" />
        <BotAvatar color="#10B981" status="running" variant="robot" />
      </div>,
    );

    const gradMatches = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]);
    expect(gradMatches).toHaveLength(2);
    expect(gradMatches[0]).toBeTruthy();
    expect(gradMatches[1]).toBeTruthy();
    expect(gradMatches[0]).not.toBe(gradMatches[1]);

    expect(html).toContain(`stroke="url(#${gradMatches[0]})"`);
    expect(html).toContain(`stroke="url(#${gradMatches[1]})"`);
  });

  it.each(["running", "queued", "leased", "waiting_input", "waiting_takeover"])(
    "renders active working ring for %s status",
    (status) => {
      const html = renderToString(<BotAvatar color="#3B82F6" status={status} variant="robot" />);
      expect(html).toContain("<svg");
      expect(html).toContain("sentrabot-bot-avatar-ring");
    },
  );

  it("keeps the working ring mounted when idle so its timeline does not reset", () => {
    const html = renderToString(<BotAvatar color="#F59E0B" status="idle" variant="robot" />);
    expect(html).toContain('data-working="false"');
    expect(html).toContain("sentrabot-bot-avatar-ring");
  });

  it("generates an organic avatar from the bot color", () => {
    const html = renderToString(
      <BotAvatar color="#D9508A" identity="maya" size={28} status="running" variant="organic" />,
    );

    expect(html).toContain("sentrabot-organic-avatar");
    expect(html).toContain('data-working="true"');
    expect(html).toMatch(/data-shape-family="\d"/);
    expect(html).toMatch(/data-eye-pattern="[0-3]"/);
    expect(html).toContain("<animate");
    expect(html).not.toContain("sentrabot-bot-avatar-visor");
  });

  it("generates distinct organic silhouettes for distinct bot identities", () => {
    const maya = renderToString(<BotAvatar color="#D9508A" identity="maya" variant="organic" />);
    const github = renderToString(
      <BotAvatar color="#D9508A" identity="github" variant="organic" />,
    );

    expect(maya).not.toEqual(github);
  });

  it("assigns animation hooks across every organic shape family", () => {
    const identities = new Map<number, string>();
    for (let index = 0; index < 500 && identities.size < 10; index++) {
      const identity = `avatar-${index}`;
      identities.set(avatarIdentitySeed(identity) % 10, identity);
    }
    expect(identities.size).toBe(10);

    for (const [family, identity] of identities) {
      const html = renderToString(
        <BotAvatar color="#D9508A" identity={identity} status="running" variant="organic" />,
      );
      expect(html).toContain(`data-shape-family="${family}"`);
      expect(html).toMatch(/data-eye-pattern="[0-3]"/);
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

  it("uses the account avatar preference when no local variant is provided", () => {
    const html = renderToString(
      <AvatarStyleProvider value="organic">
        <BotAvatar color="#D9508A" identity="maya" />
      </AvatarStyleProvider>,
    );

    expect(html).toContain("sentrabot-organic-avatar");
  });

  it("keeps the organic morph timeline stable across status updates", () => {
    const idle = renderToString(
      <BotAvatar color="#D9508A" identity="maya" status="idle" variant="organic" />,
    );
    const working = renderToString(
      <BotAvatar color="#D9508A" identity="maya" status="running" variant="organic" />,
    );

    expect(working.match(/<animate[^>]+dur="([^"]+)"/)?.[1]).toBe(
      idle.match(/<animate[^>]+dur="([^"]+)"/)?.[1],
    );
    expect(idle).toContain("sentrabot-organic-avatar-eyes-idle");
    expect(idle).toContain("sentrabot-organic-avatar-eyes-working");
    expect(idle).toContain("sentrabot-organic-avatar-body-idle");
    expect(idle).toContain("sentrabot-organic-avatar-body-working");
    expect(readFileSync(new URL("./styles.css", import.meta.url), "utf8")).not.toMatch(
      /data-working[^}]+animation:/s,
    );
  });
});
