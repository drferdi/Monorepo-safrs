'use client'

import { useEffect, useState } from 'react'

/* 5 script real — cycling: type → hold → erase → next */

const SCRIPTS = [
  /* 1 — EMR Sync */
  `const emr = await EMRSync.connect({
  baseUrl: "https://puskesmas.go.id/api",
  timeout: 30000,
  retry: 3,
});

await emr.authenticate(token);
const pasien = await emr.getPasien(norm);

console.log(\`Loaded: \${pasien.nama}\`);`,

  /* 2 — ICD-10 Lookup */
  `const icd = new ICD10Engine({
  version: "2024",
  locale: "id",
});

const diagnosis = await icd.search({
  keyword: "demam",
  limit: 10,
});

return diagnosis.map(d => ({
  code: d.code,
  name: d.name_id,
}));`,

  /* 3 — Drug Safety Check */
  `async function checkDrugSafety(
  obat: string[],
  alergi: string[]
): Promise<SafetyResult> {
  const checker = new DrugInteractionAPI();
  
  const [interactions, allergies] = await Promise.all([
    checker.checkDDI(obat),
    checker.checkAllergy(obat, alergi),
  ]);
  
  return { safe: !interactions.found && !allergies.found };
}`,

  /* 4 — Report Generator */
  `const report = await ReportService.generate({
  type: "LB1",
  periode: "2024-01",
  puskesmas: "Kediri",
});

await report.export({
  format: "pdf",
  destination: "/storage/reports/",
});

emit({ status: "report_ready", id: report.id });`,

  /* 5 — BPJS Bridge */
  `const bpjs = new BPJSBridge({
  environment: "production",
  credentials: vault.get("bpjs_creds"),
});

const eligibility = await bpjs.checkEligibility({
  nomorKartu: pasien.no_bpjs,
  kodePoli: "001",
});

return eligibility.status === "AKTIF";`,
]

function colorize(line: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = []
  let rest = line
  let i = 0

  const rules: [RegExp, string][] = [
    [/^(const|let|async|await|new|if|return|for|of|true|false|function)(?=\W)/, '#ef6f2e'],
    [/^`[^`]*`/, '#8a8380'],
    [/^"[^"]*"/, '#8a8380'],
    [/^'[^']*'/, '#8a8380'],
    [/^\/\/.*/, '#2e2c2b'],
    [/^[0-9]+(\.[0-9]+)?/, '#ef6f2e'],
    [/^[A-Z][a-zA-Z0-9_]+/, '#d6d3d2'],
    [/^[a-z_][a-zA-Z0-9_]*(?=\s*[:(,])/, '#a49d9a'],
    [/^[a-z_][a-zA-Z0-9_]*/, '#ededed'],
    [/^[=><!+\-*/.,;{}()[\]`]+/, '#3d3a39'],
    [/^\s+/, 'transparent'],
  ]

  while (rest.length > 0) {
    let matched = false
    for (const [re, color] of rules) {
      const m = rest.match(re)
      if (m) {
        tokens.push(
          <span key={i++} style={{ color }}>
            {m[0]}
          </span>
        )
        rest = rest.slice(m[0].length)
        matched = true
        break
      }
    }
    if (!matched) {
      tokens.push(
        <span key={i++} style={{ color: '#3d3a39' }}>
          {rest[0]}
        </span>
      )
      rest = rest.slice(1)
    }
  }
  return tokens
}

const CHAR_DELAY = 22
const HOLD_MS = 2800
const ERASE_DELAY = 6
const PAUSE_MS = 600

export function CodeGhost() {
  const [scriptIdx, setScriptIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [phase, setPhase] = useState<'typing' | 'holding' | 'erasing' | 'pausing'>('pausing')

  const FULL = SCRIPTS[scriptIdx]

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>

    if (phase === 'typing') {
      if (displayed.length < FULL.length) {
        t = setTimeout(() => setDisplayed(FULL.slice(0, displayed.length + 1)), CHAR_DELAY)
      } else {
        t = setTimeout(() => setPhase('holding'), HOLD_MS)
      }
    } else if (phase === 'holding') {
      t = setTimeout(() => setPhase('erasing'), HOLD_MS)
    } else if (phase === 'erasing') {
      if (displayed.length > 0) {
        t = setTimeout(() => setDisplayed(d => d.slice(0, -1)), ERASE_DELAY)
      } else {
        t = setTimeout(() => {
          setScriptIdx(i => (i + 1) % SCRIPTS.length)
          setPhase('pausing')
        }, PAUSE_MS)
      }
    } else {
      t = setTimeout(() => setPhase('typing'), PAUSE_MS)
    }

    return () => clearTimeout(t)
  }, [phase, displayed, FULL])

  const lines = displayed.split('\n')

  return (
    <div
      className="pointer-events-none fixed top-20 right-5 hidden xl:block"
      aria-hidden="true"
      style={{ opacity: 0.6, zIndex: 100 }}
    >
      <pre
        style={{
          fontSize: '13px',
          userSelect: 'none',
          textAlign: 'left',
          whiteSpace: 'pre',
        }}
      >
        {lines.map((line, li) => (
          <div key={li}>
            {colorize(line)}
            {li === lines.length - 1 && (
              <span
                style={{
                  display: 'inline-block',
                  width: '1px',
                  height: '13px',
                  background: '#ef6f2e',
                  marginLeft: '1px',
                  verticalAlign: 'middle',
                  animation: 'cursorBlink 0.8s step-end infinite',
                }}
              />
            )}
          </div>
        ))}
      </pre>

      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
