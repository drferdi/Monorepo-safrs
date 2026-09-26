import { useState, useCallback } from "react";
import { Pill, BookOpen, AlertCircle, Activity, FlaskConical, FileText, Copy, Check } from "lucide-react";
import { ThinIcon } from "@/components/ui/ThinIcon";
import type { ConsultResult } from "@workspace/api-client-react";

interface Props { result: ConsultResult }

/* ── ICD Copy Badge ──────────────────────────────────────────────────────── */
function IcdBadge({ code, accent }: { code: string; accent: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const el = document.createElement("textarea");
      el.value = code;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Tersalin!" : `Salin kode ICD-10: ${code}`}
      className="group flex shrink-0 items-center gap-1.5 rounded-[7px] border px-2.5 py-0.5 text-[12px] font-bold transition-all active:scale-95"
      style={{ borderColor: `${accent}30`, background: `${accent}12`, color: accent }}
    >
      <span>{code}</span>
      <span className="opacity-0 transition-opacity group-hover:opacity-100">
        {copied
          ? <Check className="size-[10px]" strokeWidth={2.5} />
          : <Copy className="size-[10px]" strokeWidth={2} />}
      </span>
    </button>
  );
}

/* ── Section primitives ──────────────────────────────────────────────────── */

function Divider() {
  return <div className="border-t border-[#222220]" />;
}

function Label({ children, icon: Icon, iconColor }: {
  children: React.ReactNode;
  icon?: typeof FlaskConical;
  iconColor?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      {Icon && iconColor && (
        <span className="grid size-[22px] shrink-0 place-items-center rounded-[5px]" style={{ background: `${iconColor}18` }}>
          <ThinIcon Icon={Icon} className="size-[13px]" style={{ color: iconColor } as React.CSSProperties} />
        </span>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#484846]">{children}</p>
    </div>
  );
}

function BulletList({ items, accent }: { items: string[]; accent?: string }) {
  if (!items.length) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-[6px] size-1.5 shrink-0 rounded-full opacity-70" style={{ background: accent ?? "#606060" }} />
          <span className="text-[14px] leading-snug text-[#b8b8b6]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ── Animated section wrapper ────────────────────────────────────────────── */
function Section({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div className="stagger-section" style={{ animationDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export function ClinicalOutput({ result }: Props) {
  const s = result.sections;
  if (!s) return null;

  const greenHex  = "#30d069";
  const blueHex   = "#1399e9";
  const amber     = "#f59e0b";
  const violet    = "#8b5cf6";
  const red       = "#f53b37";
  const blue      = "var(--sentra-db01-accent-blue)";
  const green     = "var(--sentra-db01-accent-green)";

  const sections = [
    s.ringkasan && (
      <Section key="ringkasan" delay={0}>
        <Divider />
        <div className="py-5">
          <Label>Ringkasan Kasus</Label>
          <p className="text-[15px] leading-[1.7] text-[#b0b0ae]">{s.ringkasan}</p>
        </div>
      </Section>
    ),

    s.diagnosis_kerja?.name && (
      <Section key="dx-kerja" delay={50}>
        <Divider />
        <div className="py-5">
          <div className="mb-3 flex items-center justify-between gap-4">
            <Label>Diagnosis Kerja</Label>
            {s.diagnosis_kerja.icd10 && <IcdBadge code={s.diagnosis_kerja.icd10} accent={greenHex} />}
          </div>
          <p className="text-[19px] font-semibold tracking-[-0.4px] text-[#f0f0ee]">{s.diagnosis_kerja.name}</p>
          {s.diagnosis_kerja.reason && (
            <p className="mt-1.5 text-[13px] leading-snug text-[#585856]">{s.diagnosis_kerja.reason}</p>
          )}
        </div>
      </Section>
    ),

    (s.diagnosis_banding?.length ?? 0) > 0 && (
      <Section key="dx-banding" delay={100}>
        <Divider />
        <div className="py-5">
          <Label>Diagnosis Banding</Label>
          <div className="space-y-3">
            {s.diagnosis_banding!.map((dx, i) => (
              <div key={i} className="flex items-start gap-3">
                {dx.icd10
                  ? <IcdBadge code={dx.icd10} accent={blueHex} />
                  : <span className="mt-0.5 shrink-0 rounded-[6px] border border-[#1399e9]/20 bg-[#1399e9]/10 px-1.5 py-0.5 text-[11px] font-bold leading-none text-[#1399e9]">#{i + 1}</span>
                }
                <div className="min-w-0">
                  <p className="text-[14px] font-medium leading-snug text-[#d0d0ce]">{dx.name}</p>
                  {dx.reason && <p className="mt-0.5 text-[13px] text-[#505050]">{dx.reason}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    ),

    (s.pemeriksaan?.length ?? 0) > 0 && (
      <Section key="pemeriksaan" delay={150}>
        <Divider />
        <div className="py-5">
          <Label icon={FlaskConical} iconColor={amber}>Anjuran Pemeriksaan</Label>
          <ul className="space-y-1.5">
            {s.pemeriksaan!.map((item, i) => {
              const [name, ...rest] = item.split(/\s*[—\-–]\s*/);
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-[6px] size-1.5 shrink-0 rounded-full opacity-70" style={{ background: amber }} />
                  <span className="text-[14px] leading-snug text-[#b8b8b6]">
                    <span className="font-medium text-[#c8c8c6]">{name}</span>
                    {rest.length > 0 && <span className="text-[#484846]"> — {rest.join(" — ")}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>
    ),

    (s.tatalaksana?.length ?? 0) > 0 && (
      <Section key="tatalaksana" delay={200}>
        <Divider />
        <div className="py-5">
          <Label icon={Activity} iconColor={violet}>Tatalaksana</Label>
          <BulletList items={s.tatalaksana!} accent={violet} />
        </div>
      </Section>
    ),

    (s.farmakologi?.length ?? 0) > 0 && (
      <Section key="farmakologi" delay={250}>
        <Divider />
        <div className="py-5">
          <Label icon={Pill} iconColor={green}>Farmakologi</Label>
          <div className="space-y-4">
            {s.farmakologi!.map((drug, i) => (
              <div key={i} className={i > 0 ? "border-t border-[#222220] pt-4" : ""}>
                <p className="font-mono text-[15px] font-semibold tracking-tight text-[#eeeeed] leading-snug">{drug.drug}</p>
                {(drug.ddi || drug.ki) && (
                  <div className="mt-2 space-y-1">
                    {drug.ddi && (
                      <p className="text-[12.5px] leading-snug text-[#a0a09e]">
                        <span className="font-semibold text-[#c0c0be]">DDI: </span>{drug.ddi}
                      </p>
                    )}
                    {drug.ki && (
                      <p className="text-[12.5px] leading-snug text-[#a0a09e]">
                        <span className="font-semibold text-[#c0c0be]">KI: </span>{drug.ki}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Section>
    ),

    (s.edukasi?.length ?? 0) > 0 && (
      <Section key="edukasi" delay={300}>
        <Divider />
        <div className="py-5">
          <Label icon={BookOpen} iconColor={blue}>Edukasi Pasien</Label>
          <BulletList items={s.edukasi!} accent={blue} />
        </div>
      </Section>
    ),

    (s.kriteria_rujuk?.length ?? 0) > 0 && (
      <Section key="rujuk" delay={350}>
        <Divider />
        <div className="py-5">
          <Label icon={AlertCircle} iconColor={red}>Kriteria Rujuk</Label>
          <BulletList items={s.kriteria_rujuk!} accent={red} />
        </div>
      </Section>
    ),

    s.prognosis && (
      <Section key="prognosis" delay={400}>
        <Divider />
        <div className="py-5">
          <Label icon={FileText} iconColor={green}>Prognosis</Label>
          <p className="text-[14px] leading-[1.7] text-[#a0a09e]">{s.prognosis}</p>
        </div>
      </Section>
    ),
  ].filter(Boolean);

  return (
    <div style={{ fontFamily: "var(--sentra-db01-font)" }}>
      {sections}
      <Divider />
    </div>
  );
}
