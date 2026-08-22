import { execFileSync } from "node:child_process";

const sourcePath = process.argv[2] ?? "D:/DEV/Sentraverse/sentrabot";
const sourceRef = process.argv[3] ?? "d17a138";
const output = execFileSync(
  "git",
  ["-C", sourcePath, "ls-tree", "-r", "--name-only", sourceRef],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  },
);

const paths = output.split(/\r?\n/).filter(Boolean);
process.stdout.write(
  `${JSON.stringify(
    {
      sourcePath,
      sourceRef,
      status: paths.length > 0 ? "enumerated" : "empty",
      dispositions: Object.fromEntries(paths.map((path) => [path, null])),
    },
    null,
    2,
  )}\n`,
);
