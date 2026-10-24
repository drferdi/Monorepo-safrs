import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const releaseBranch = "codex/sentrapedia-clerk-public-release";
const validSha = value => typeof value === "string" && /^[a-f0-9]{40}$/.test(value);

export function releasePublication(github) {
  const { event_name: name, ref, sha, repository, event } = github;
  if (!validSha(sha) || typeof repository !== "string" || !/^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(repository)) throw new Error("Invalid release publication context");
  const repo = event?.repository;
  const pr = event?.pull_request;
  const revision = name === "pull_request" ? pr?.head?.sha : sha;
  if (!validSha(revision)) throw new Error("Invalid release publication context");
  const privateRepo = repo?.private === true && Number.isSafeInteger(repo.id) && repo.id > 0 && repo.full_name === repository;
  const main = privateRepo && name === "push" && ref === "refs/heads/main";
  // These comparisons must remain case-sensitive; GitHub expression == is not.
  const candidate = privateRepo && name === "pull_request" && pr?.head?.repo?.id === repo.id && pr.head.repo.full_name === repository && pr.head.ref === releaseBranch && pr.base?.ref === "main";
  const image = `ghcr.io/${repository.split("/")[0].toLowerCase()}/sentrapedia-beta`;
  const tags = main ? [`${image}:sha-${revision}`, `${image}:main`] : [`${image}:${candidate ? "candidate" : "verify"}-${revision}`];
  return { publish: main || candidate, registry: main, artifact: candidate, retain: main, revision, tags: tags.join(",") };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const values = releasePublication({ event_name: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF, sha: process.env.GITHUB_SHA, repository: process.env.GITHUB_REPOSITORY, event: JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")) });
    appendFileSync(process.env.GITHUB_OUTPUT, Object.entries(values).map(([key, value]) => `${key}=${value}\n`).join(""));
  } catch {
    console.error("Invalid release publication context");
    process.exitCode = 1;
  }
}
