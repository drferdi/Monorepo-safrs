import { lstatSync, readFileSync } from "node:fs";
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

const defaultTemplateRoot = fileURLToPath(
  new URL("../../../projects/_template/", import.meta.url),
);

function safeTemplateText(templateRoot, relativePath) {
  const rootInfo = lstatSync(templateRoot);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) {
    throw new Error(
      "Project template root must be a real directory, not a symbolic link.",
    );
  }
  const sourcePath = path.resolve(templateRoot, relativePath);
  if (!sourcePath.startsWith(`${path.resolve(templateRoot)}${path.sep}`)) {
    throw new Error("Project template path escapes its root.");
  }
  const info = lstatSync(sourcePath);
  if (!info.isFile() || info.isSymbolicLink()) {
    throw new Error(
      `Project template file ${relativePath} must not be a symbolic link.`,
    );
  }
  return readFileSync(sourcePath, "utf8");
}

function textList(items) {
  return items.length === 0 ? "none" : items.join(", ");
}

function renderAgents(template, model) {
  const rendered = template
    .replaceAll("<replace-with-project-name>", model.name)
    .replaceAll("<replace-with-one-sentence-objective>", model.problem)
    .replaceAll("<replace-with-accountable-owner>", "Chief")
    .replaceAll(
      "<command-or-not-applicable-with-reason>",
      "not applicable: governance capsule only",
    );
  return rendered.replace(
    `projects/${model.name}/**`,
    `projects/${model.slug}/**`,
  );
}

function renderReadme(template, model) {
  return template
    .replaceAll("<project-name>", model.name)
    .replaceAll(
      "Status: TEMPLATE — not an active product.",
      "Status: Draft governance capsule — implementation is not created by this wizard.",
    )
    .replaceAll("<Describe the real user or business outcome.>", model.problem)
    .replaceAll(
      "<owned capabilities and paths>",
      `governance capsule for the ${model.kind} app binding \`${model.appBinding}\`; capabilities: ${textList(model.capabilities)}`,
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
    return `${template.trimEnd()}\n\n## Generated capsule context\n\n- App binding: \`${model.appBinding}\`\n- Selected capabilities: ${textList(model.capabilities)}\n- This wizard creates no application code or package binding.\n`;
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
 * @param {{name: string, slug: string, problem: string, kind: string, capabilities: string[], sensitiveDomains: string[], risk: string, appBinding: string}} model
 * @param {string} [templateRoot]
 */
export function renderProjectCapsule(
  model,
  templateRoot = defaultTemplateRoot,
) {
  const root = path.resolve(templateRoot);
  return REQUIRED_TEMPLATE_FILES.map((relativePath) => {
    const content = contextualDocument(
      relativePath,
      safeTemplateText(root, relativePath),
      model,
    );
    if (/<(?:replace-[^>]*|project-name|Describe [^>]*)>/.test(content)) {
      throw new Error(`Project template marker remains in ${relativePath}.`);
    }
    return Object.freeze({ relativePath, content });
  });
}
