import { AlertTriangle, X } from "lucide-react";

interface Props {
  flags: string[];
  onDismiss?: () => void;
}

/** DB01 EscalationPanel — red semantic accent, explicit, dismissable. */
export function RedFlagAlert({ flags, onDismiss }: Props) {
  if (!flags || flags.length === 0) return null;

  return (
    <div className="rounded-[24px] border border-[var(--sentra-db01-accent-red)]/30 bg-[#190808] px-6 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--sentra-db01-accent-red)]/12">
            <AlertTriangle className="size-[18px] text-[var(--sentra-db01-accent-red)]" strokeWidth={1.65} />
          </span>
          <div>
            <p className="text-[15px] font-semibold tracking-[-0.2px] text-[var(--sentra-db01-accent-red)]">
              Red Flag Terdeteksi
            </p>
            <p className="text-[13px] text-[#7a3030]">Waspadai kondisi kegawatdaruratan sebelum melanjutkan.</p>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            aria-label="Tutup peringatan"
            className="grid size-8 shrink-0 place-items-center rounded-[9px] text-[#7a3030] transition-colors hover:bg-[#2a1010] hover:text-[var(--sentra-db01-accent-red)]"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-2 pl-12">
        {flags.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[14px] text-[#c06060] leading-snug">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--sentra-db01-accent-red)]/60" />
            {f}
          </li>
        ))}
      </ul>

      <p className="mt-4 pl-12 text-[12px] text-[#5a2828] italic">
        Deteksi deterministik — keputusan klinis tetap sepenuhnya pada dokter yang bertanggung jawab.
      </p>
    </div>
  );
}
