import {
  closeSync,
  constants,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  realpathSync,
  statSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_TEMPLATE_FILES = [
  "AGENTS.md",
  "README.md",
  "docs/architecture.md",
  "docs/data.md",
  "docs/testing.md",
  "src/README.md",
  "tests/README.md",
];

const MARKER_PATTERN =
  /<[^>\n]+>|\{\{[^}\n]+\}\}|\$\{[^}\n]+\}|\[\[[^\]\n]+\]\]|%%[^%\n]+%%/;
const defaultTemplateRoot = fileURLToPath(
  new URL("../../../projects/_template/", import.meta.url),
);

function sameIdentity(first, second) {
  return first.dev === second.dev && first.ino === second.ino;
}

function isWithin(candidate, root) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function assertRealDirectory(directory, label) {
  const info = lstatSync(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error(`${label} must be a real directory, not a symbolic link.`);
  }
  return realpathSync(directory);
}

function stableTemplatePath(templateRoot, relativePath) {
  const canonicalRoot = assertRealDirectory(
    templateRoot,
    "Project template root",
  );
  let current = canonicalRoot;
  const components = relativePath.split("/");
  for (const [index, component] of components.entries()) {
    current = path.join(current, component);
    const info = lstatSync(current);
    if (info.isSymbolicLink()) {
      throw new Error(
        `Project template path ${relativePath} contains a symbolic link.`,
      );
    }
    if (index < components.length - 1 && !info.isDirectory()) {
      throw new Error(
        `Project template path ${relativePath} has a non-directory component.`,
      );
    }
    const canonical = realpathSync(current);
    if (!isWithin(canonical, canonicalRoot)) {
      throw new Error(
        `Project template path ${relativePath} escapes its root.`,
      );
    }
  }
  return { canonicalRoot, sourcePath: current };
}

function safeTemplateText(templateRoot, relativePath, hooks) {
  const { canonicalRoot, sourcePath } = stableTemplatePath(
    templateRoot,
    relativePath,
  );
  const flags =
    process.platform === "win32" || constants.O_NOFOLLOW === undefined
      ? constants.O_RDONLY
      : constants.O_RDONLY | constants.O_NOFOLLOW;
  const descriptor = openSync(sourcePath, flags);
  try {
    if (hooks?.afterOpen) hooks.afterOpen(sourcePath);
    const opened = fstatSync(descriptor);
    const current = lstatSync(sourcePath);
    if (
      current.isSymbolicLink() ||
      !current.isFile() ||
      !sameIdentity(opened, current)
    ) {
      throw new Error(
        `Project template file ${relativePath} changed while being read.`,
      );
    }
    const canonical = realpathSync(sourcePath);
    if (
      !isWithin(canonical, canonicalRoot) ||
      !sameIdentity(opened, statSync(canonical))
    ) {
      throw new Error(
        `Project template file ${relativePath} changed while being read.`,
      );
    }
    return readFileSync(descriptor, "utf8");
  } finally {
    closeSync(descriptor);
  }
}

function escapeMarkdown(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;")
    .replace(/[\\`*_[\]()#+\-.!|]/g, "\\$&");
}

function textList(items) {
  return items.length === 0 ? "none" : items.map(escapeMarkdown).join(", ");
}

function renderAgents(template, model) {
  return template
    .replaceAll(
      "projects/<replace-with-project-name>/**",
      `projects/${model.slug}/**`,
    )
    .replaceAll("<replace-with-project-name>", escapeMarkdown(model.name))
    .replaceAll(
      "<replace-with-one-sentence-objective>",
      escapeMarkdown(model.problem),
    )
    .replaceAll("<replace-with-accountable-owner>", "Chief")
    .replaceAll(
      "<command-or-not-applicable-with-reason>",
      "not applicable: governance capsule only",
    );
}

function renderReadme(template, model) {
  return template
    .replaceAll("<project-name>", escapeMarkdown(model.name))
    .replaceAll(
      "Status: TEMPLATE — not an active product.",
      "Status: Draft governance capsule — implementation is not created by this wizard.",
    )
    .replaceAll(
      "<Describe the real user or business outcome.>",
      escapeMarkdown(model.problem),
    )
    .replaceAll(
      "<owned capabilities and paths>",
      `governance capsule for the ${escapeMarkdown(model.kind)} app binding \`${escapeMarkdown(model.appBinding)}\`; capabilities: ${textList(model.capabilities)}`,
    )
    .replaceAll(
      "<explicit non-goals>",
      "application implementation, deployment, credentials, purchases, messages, and production changes",
    )
    .replaceAll("<accountable owner>", "Chief")
    .replaceAll(
      "<declared packages/services or none>",
      "none declared; the selected app binding is not created or modified",
    )
    .replaceAll(
      "<declared APIs/events/artifacts or none>",
      "the SAFRS capsule documentation only",
    );
}

function contextualDocument(relativePath, template, model) {
  if (relativePath === "AGENTS.md") return renderAgents(template, model);
  if (relativePath === "README.md") return renderReadme(template, model);
  if (relativePath === "docs/architecture.md") {
    return `${template.trimEnd()}\n\n## Generated capsule context\n\n- App binding: \`${escapeMarkdown(model.appBinding)}\`\n- Selected capabilities: ${textList(model.capabilities)}\n- This wizard creates no application code or package binding.\n`;
  }
  if (relativePath === "docs/data.md") {
    return `${template.trimEnd()}\n\n## Generated capsule context\n\n- Sensitive domains: ${textList(model.sensitiveDomains)}\n- Computed risk: ${model.risk}\n- No credentials, production data, or environment entries are created.\n`;
  }
  if (relativePath === "docs/testing.md") {
    return `${template.trimEnd()}\n\n## Generated capsule context\n\n- Capsule topology: \`python tools/safrs/check_topology.py\` from the repository root.\n- No app-specific test command exists until authorized implementation is added.\n`;
  }
  return template;
}

/**
 * Render the complete, deterministic SAFRS capsule file list without writing it.
 * The third argument is a deterministic test hook and is ignored by the CLI.
 */
export function renderProjectCapsule(
  model,
  templateRoot = defaultTemplateRoot,
  hooks,
) {
  const root = path.resolve(templateRoot);
  return REQUIRED_TEMPLATE_FILES.map((relativePath) => {
    const content = contextualDocument(
      relativePath,
      safeTemplateText(root, relativePath, hooks),
      model,
    );
    if (MARKER_PATTERN.test(content)) {
      throw new Error(`Project template marker remains in ${relativePath}.`);
    }
    return Object.freeze({ relativePath, content });
  });
}
