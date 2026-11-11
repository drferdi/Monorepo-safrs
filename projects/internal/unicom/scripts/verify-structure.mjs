import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const required = ["AGENTS.md", "README.md", "project.contract.json", "package.json", "pnpm-lock.yaml", "src", "tests", "docs"];
for (const entry of required) {
  await readFile(join(root, entry)).catch(async (error) => {
    if (error.code === "EISDIR") return;
    throw new Error(`Missing required capsule entry: ${entry}`);
  });
}

const packageJson = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const packageText = JSON.stringify(packageJson);
if (packageText.includes("workspace:") || packageText.includes("file:../")) {
  throw new Error("Capsule manifest contains a forbidden workspace or parent dependency.");
}

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(fullPath));
    else if (/\.(?:[cm]?[jt]sx?|css)$/u.test(entry.name)) files.push(fullPath);
  }
  return files;
}

const violations = [];
for (const file of await sourceFiles(join(root, "src"))) {
  const content = await readFile(file, "utf8");
  if (/from\s+["']\.\.\//u.test(content) || /D:\\DEV\\Monorepo|D:\\Devops\\abyss-monorepo/u.test(content)) {
    violations.push(relative(root, file));
  }
}
if (violations.length > 0) throw new Error(`Forbidden external source reference: ${violations.join(", ")}`);

console.log("Structural verification passed: capsule-local sources and dependency manifest only.");
