import assert from "node:assert/strict";
import { test } from "node:test";
import { renderASCII, renderDOT, renderMermaid } from "../src/render.mjs";

function sampleGraph() {
  return {
    nodes: ["@safrs/a", "@safrs/b"],
    edges: new Map([
      ["@safrs/a", new Set(["@safrs/b"])],
      ["@safrs/b", new Set()],
    ]),
  };
}

test("renderDOT quotes nodes and edges", () => {
  const out = renderDOT(sampleGraph());
  assert.match(out, /digraph deps/);
  assert.match(out, /"@safrs\/a" -> "@safrs\/b"/);
});

test("renderMermaid emits a flowchart", () => {
  const out = renderMermaid(sampleGraph());
  assert.match(out, /flowchart LR/);
  assert.match(out, /"@safrs\/a" --> "@safrs\/b"/);
});

test("renderASCII lists nodes and edges", () => {
  const out = renderASCII(sampleGraph());
  assert.match(out, /@safrs\/a/);
  assert.match(out, /\u2514\u2500 @safrs\/b/);
  assert.match(out, /no workspace deps/);
});

test("renderASCII handles isolated nodes", () => {
  const out = renderASCII({
    nodes: ["@safrs/alone"],
    edges: new Map([["@safrs/alone", new Set()]]),
  });
  assert.match(out, /no workspace deps/);
});
