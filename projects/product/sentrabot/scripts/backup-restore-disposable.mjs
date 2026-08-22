import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const databaseUrl = process.env.DATABASE_URL ?? "";
const target = new URL(databaseUrl);
if (
  target.protocol !== "postgresql:" ||
  target.hostname !== "127.0.0.1" ||
  target.port !== "54329" ||
  !target.pathname.endsWith("_test")
) {
  throw new Error(
    "Backup/restore requires guarded PostgreSQL 127.0.0.1:54329 *_test",
  );
}

const output = process.env.BACKUP_FILE ?? "sentrabot-disposable.backup";
const container = process.env.BACKUP_CONTAINER;
if (container) {
  const containerFile = "/tmp/sentrabot-disposable.backup";
  const containerDatabaseUrl = new URL(databaseUrl);
  containerDatabaseUrl.hostname = "127.0.0.1";
  containerDatabaseUrl.port = "5432";
  await exec("docker", [
    "exec",
    container,
    "pg_dump",
    "--format=custom",
    "--file",
    containerFile,
    containerDatabaseUrl.toString(),
  ]);
  await exec("docker", ["cp", `${container}:${containerFile}`, output]);
  await exec("docker", [
    "exec",
    container,
    "pg_restore",
    "--list",
    containerFile,
  ]);
} else {
  await exec("pg_dump", ["--format=custom", "--file", output, databaseUrl]);
  await exec("pg_restore", ["--list", output]);
}
console.log(`backup evidence: ${output} created and readable`);
