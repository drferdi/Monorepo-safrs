/**
 * Gate 1 benchmark export: runs the legacy engine on every case file in a folder and writes one
 * `EngineResult` per case, so the legacy engine and MIRA are scored on identical input.
 *
 * Node only (reads and writes files). Run it through `scripts/benchmark/run-legacy-engine.mjs`,
 * which provides the legacy engine's Node runtime.
 *
 * Output: `<outDir>/<case_id>.legacy.json` = `{ caseId, expectedDiagnosis, engine, input, result }`.
 * Real (de-identified) cases must stay outside the repository, and so must their outputs: the
 * output folder is refused if it lies inside the capsule.
 *
 * @module lib/diagnosis-engine/benchmark/legacy-benchmark
 */

import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

import type { DiagnosisEngine, EngineResult } from '../types';

import { isMiraCase, miraCaseToCaseState } from './mira-case';

export const CAPSULE_ROOT = resolve(__dirname, '../../..');

export interface BenchmarkRecord {
  caseId: string;
  expectedDiagnosis: string | null;
  engine: DiagnosisEngine['id'];
  input: ReturnType<typeof miraCaseToCaseState>;
  result: EngineResult;
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

export async function runLegacyBenchmark(params: {
  casesDir: string;
  outDir: string;
  engine: DiagnosisEngine;
  allowOutputInsideCapsule?: boolean;
}): Promise<BenchmarkRecord[]> {
  const casesDir = resolve(params.casesDir);
  const outDir = resolve(params.outDir);
  if (!params.allowOutputInsideCapsule && isInside(CAPSULE_ROOT, outDir)) {
    throw new Error(
      `Refusing to write benchmark output inside the capsule (${outDir}); choose a folder outside the repository.`
    );
  }

  const caseFiles = readdirSync(casesDir)
    .filter((name) => name.endsWith('.json'))
    .sort();
  if (caseFiles.length === 0) throw new Error(`No case files (*.json) in ${casesDir}`);

  mkdirSync(outDir, { recursive: true });
  const records: BenchmarkRecord[] = [];
  for (const fileName of caseFiles) {
    const parsed: unknown = JSON.parse(readFileSync(join(casesDir, fileName), 'utf-8'));
    if (!isMiraCase(parsed)) throw new Error(`${fileName} is not a case in the MIRA case format`);

    const input = miraCaseToCaseState(parsed);
    const record: BenchmarkRecord = {
      caseId: parsed.case_id,
      expectedDiagnosis: parsed.expected_diagnosis ?? null,
      engine: params.engine.id,
      input,
      result: await params.engine.step(input),
    };
    writeFileSync(
      join(outDir, `${parsed.case_id}.${params.engine.id}.json`),
      `${JSON.stringify(record, null, 2)}\n`
    );
    records.push(record);
  }
  return records;
}
