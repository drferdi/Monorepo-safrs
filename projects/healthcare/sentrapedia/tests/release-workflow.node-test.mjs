import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { releasePublication } from "../scripts/release-publication.mjs";
import { splitReleaseArtifact } from "../scripts/split-release-artifact.mjs";

const fullWorkflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");
const workflow = fullWorkflow.split("\n  docker:\n")[1];
const steps = workflow.split(/\n      - /).slice(1);
const mainSha = "1".repeat(40);
const headSha = "2".repeat(40);
const image = "ghcr.io/demo-owner/sentrapedia-beta";
const releaseBranch = "codex/sentrapedia-clerk-public-release";

test("private delivery parts reconstruct the exact image archive and expose integrity receipts", () => {
  const root = mkdtempSync(join(tmpdir(), "sentrapedia-release-"));
  try {
    const bytes = Buffer.from("exact-image-archive");
    const input = join(root,"image.tar"); writeFileSync(input,bytes);
    const output = join(root,"parts");
    const manifest = splitReleaseArtifact(input,output,5);
    assert.equal(manifest.parts.length,4);
    const restored = Buffer.concat(manifest.parts.map(part=>{
      const payload=readFileSync(join(output,part.file));
      assert.equal(payload.length,part.bytes);
      assert.equal(createHash("sha256").update(payload).digest("hex"),part.sha256);
      return payload;
    }));
    assert.deepEqual(restored,bytes);
    assert.equal(manifest.sha256,createHash("sha256").update(bytes).digest("hex"));
    assert.deepEqual(JSON.parse(readFileSync(join(output,"manifest.json"),"utf8")),manifest);
    assert.throws(()=>splitReleaseArtifact(input,output,5),/exist/i);
    assert.throws(()=>splitReleaseArtifact(input,join(root,"too-small"),4),/four/i);
    assert.equal(existsSync(join(root,"too-small")),false);
  } finally {
    assert.equal(dirname(resolve(root)),resolve(tmpdir()));
    assert.ok(basename(root).startsWith("sentrapedia-release-"));
    rmSync(root,{recursive:true,force:true});
  }
});

test("candidate manifest and every bounded part retain the same private publication guard", () => {
  const split=steps.find(step=>step.startsWith("id: artifact"));
  assert.ok(split,"split only the approved candidate archive");
  const uploads=steps.filter(step=>step.includes("uses: actions/upload-artifact@"));
  assert.equal(uploads.length,5);
  const context={publication:{outputs:{artifact:"false"}},artifact:{outputs:{parts:"4"}}};
  for(const step of [split,...uploads])assert.equal(Boolean(evaluate(scalar("if",step),event(),context)),false);
  context.publication.outputs.artifact="true";
  for(const step of [split,...uploads])assert.equal(Boolean(evaluate(scalar("if",step),event(),context)),true);
  assert.match(uploads[0],/manifest\.json/);
  for(let part=0;part<4;part++)assert.ok(uploads.some(step=>step.includes(`image.tar.part-${String(part).padStart(2,"0")}`)));
});

// Applicant-controlled branch/base comparisons belong to the real Node policy,
// not this evaluator: GitHub string equality ignores case, unlike JavaScript.
function evaluate(expression, github, steps) {
  return runInNewContext(expression, {
    github, steps,
    format: (pattern, ...values) => pattern.replace(/\{(\d+)\}/g, (_, index) => values[Number(index)]),
  }, { timeout: 100 });
}

function scalar(key, content = workflow) {
  return content.match(new RegExp(`^ *${key}: (.+)$`, "m"))?.[1] ?? "false";
}

function render(value, github, steps) {
  return value.replace(/\$\{\{\s*([\s\S]*?)\s*\}\}/g, (_, expression) => String(evaluate(expression, github, steps)));
}

function publication(github) {
  const decision = releasePublication(github);
  const outputs = Object.fromEntries(Object.entries(decision).map(([key, value]) => [key, String(value)]));
  const context = { publication: { outputs } };
  const login = steps.find(step => step.includes("docker login ghcr.io"));
  const retention = steps.find(step => step.includes("packages/container/sentrapedia-beta/versions"));
  const build = steps.find(step => step.startsWith("uses: docker/build-push-action@"));
  const artifact = steps.find(step => step.includes("uses: actions/upload-artifact@"));
  const checkout = steps.find(step => step.startsWith("uses: actions/checkout@"));
  const tags = scalar("tags", build) === "|"
    ? build.match(/          tags: \|\n([\s\S]*?)\n          labels:/)[1].trim().split("\n").map(line => render(line.trim(), github, context)).filter(Boolean)
    : render(scalar("tags", build), github, context).split(",").filter(Boolean);
  return {
    login: Boolean(evaluate(scalar("if", login), github, context)),
    push: render(scalar("push", build), github, context) === "true",
    retention: Boolean(evaluate(scalar("if", retention), github, context)),
    artifact: Boolean(evaluate(scalar("if", artifact ?? ""), github, context)),
    checkout: scalar("ref", checkout) === "false" ? github.sha : render(scalar("ref", checkout), github, context),
    tags,
  };
}

function event({ name = "pull_request", privateRepo = true, sourceId = 1, branch = releaseBranch, base = "main" } = {}) {
  return {
    event_name: name,
    ref: name === "push" ? `refs/heads/${branch}` : "refs/pull/26/merge",
    sha: mainSha,
    repository: "demo-owner/Sentrapedia",
    repository_owner: "demo-owner",
    event: {
      repository: { id: 1, private: privateRepo, full_name: "demo-owner/Sentrapedia" },
      pull_request: { head: { ref: branch, sha: headSha, repo: { id: sourceId, full_name: sourceId === 1 ? "demo-owner/Sentrapedia" : "fork-owner/Sentrapedia" } }, base: { ref: base } },
    },
  };
}

test("the approved private release PR exports only its immutable private artifact and preserves rollback images", () => {
  assert.deepEqual(publication(event()), {
    login: false, push: false, retention: false, artifact: true, checkout: headSha,
    tags: [`${image}:candidate-${headSha}`],
  });
});

for (const [label, options] of [
  ["a fork using the release branch name", { sourceId: 2 }],
  ["a public mirror", { privateRepo: false }],
  ["an ordinary pull request", { branch: "feature/unrelated" }],
  ["a release PR targeting another base", { base: "develop" }],
  ["a release branch with different letter case", { branch: "CODEX/sentrapedia-clerk-public-release" }],
  ["a base branch with different letter case", { base: "MAIN" }],
  ["pull_request_target", { name: "pull_request_target" }],
  ["a feature branch push", { name: "push", branch: "feature/unrelated" }],
]) {
  test(`${label} cannot publish artifacts, log in to GHCR, push images or prune rollback images`, () => {
    const actual = publication(event(options));
    assert.equal(actual.login, false);
    assert.equal(actual.push, false);
    assert.equal(actual.retention, false);
    assert.equal(actual.artifact, false);
  });
}

test("a private main push retains the existing main and SHA publication behavior", () => {
  const fixture = event({ name: "push", branch: "main" });
  delete fixture.event.pull_request;
  assert.deepEqual(publication(fixture), {
    login: true, push: true, retention: true, artifact: false, checkout: mainSha,
    tags: [`${image}:sha-${mainSha}`, `${image}:main`],
  });
});

test("verification and candidate build use the same immutable PR revision", () => {
  const checkJob = fullWorkflow.split("\n  check:\n")[1].split("\n  docker:\n")[0];
  const checkCheckout = checkJob.split(/\n      - /).find(step => step.startsWith("uses: actions/checkout@"));
  const fixture = event();
  const checked = scalar("ref", checkCheckout) === "false" ? fixture.sha : render(scalar("ref", checkCheckout), fixture, {});
  assert.equal(checked, headSha);
  assert.equal(publication(fixture).checkout, headSha);
});

test("a failed quality gate prevents the publishing job from running", () => {
  const needs = scalar("needs").replace(/[\[\]'\"]/g, "").split(",").map(value => value.trim());
  const completedJobs = { check: "failure" };
  const canRun = needs.every(job => completedJobs[job] === undefined || completedJobs[job] === "success");
  const actual = publication(event());
  assert.equal(canRun && (actual.push || actual.artifact), false);
});

test("the workflow executes the real case-sensitive policy and writes bounded GitHub outputs", () => {
  const policyStep = steps.find(step => step.startsWith("id: publication"));
  assert.ok(policyStep, "a publication policy step is required before login");
  const command = scalar("run", policyStep).split(" ");
  assert.equal(command.shift(), "node");
  const root = mkdtempSync(join(tmpdir(), "sentrapedia-release-"));
  try {
    const fixture = event({ branch: "CODEX/sentrapedia-clerk-public-release" });
    const eventFile = join(root, "event.json");
    const output = join(root, "outputs");
    writeFileSync(eventFile, JSON.stringify(fixture.event));
    writeFileSync(output, "");
    const result = spawnSync(process.execPath, command, { cwd: new URL("../", import.meta.url), encoding: "utf8", env: { ...process.env, GITHUB_EVENT_NAME: fixture.event_name, GITHUB_REF: fixture.ref, GITHUB_SHA: fixture.sha, GITHUB_REPOSITORY: fixture.repository, GITHUB_EVENT_PATH: eventFile, GITHUB_OUTPUT: output } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "");
    const values = Object.fromEntries(readFileSync(output, "utf8").trim().split("\n").map(line => line.split("=")));
    assert.equal(values.publish, "false");
    assert.equal(values.retain, "false");
    assert.equal(values.tags, `${image}:verify-${headSha}`);
  } finally {
    const target = resolve(root);
    assert.equal(dirname(target), resolve(tmpdir()));
    assert.ok(basename(target).startsWith("sentrapedia-release-"));
    rmSync(target, { recursive: true, force: true });
  }
});
