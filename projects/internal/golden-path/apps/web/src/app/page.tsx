import { StatusCard } from "@safrs/ui";
import { connection } from "next/server";
import { Suspense } from "react";
import { DemoForm } from "../components/demo-form";
import {
  type DemoView,
  getReadiness,
  type Readiness,
  readDemos,
} from "../lib/server-data";

export function ReadinessDesk({
  demos,
  readiness,
}: {
  demos: DemoView[];
  readiness: Readiness;
}) {
  const aggregateState =
    readiness.api.state === "ready" && readiness.database.state === "ready"
      ? "ready"
      : "attention";
  const aggregateLabel =
    aggregateState === "ready" ? "Siap" : "Perlu perhatian";

  return (
    <main className="readiness-desk">
      <header className="desk-header">
        <p className="eyebrow">Meja kesiapan</p>
        <h1>
          {aggregateState === "ready"
            ? "Monorepo siap untuk alur SAFRS"
            : "Periksa kesiapan alur SAFRS"}
        </h1>
        <p>
          Ikuti aliran operasional ini untuk memastikan data, API, dan web
          terhubung sebelum menyimpan satu contoh.
        </p>
      </header>

      <section aria-label="Alur kesiapan" className="flow-rail">
        <ol>
          <li className={`flow-step flow-step--${readiness.database.state}`}>
            <span>01</span>
            <strong>Database</strong>
            <small>PostgreSQL menyimpan contoh.</small>
          </li>
          <li className={`flow-step flow-step--${readiness.api.state}`}>
            <span>02</span>
            <strong>API bertipe</strong>
            <small>Hono memvalidasi kontrak data.</small>
          </li>
          <li className="flow-step flow-step--ready">
            <span>03</span>
            <strong>Web</strong>
            <small>Halaman server menampilkan hasil.</small>
          </li>
          <li
            aria-label={`Status akhir: ${aggregateLabel}`}
            className={`flow-step flow-step--${aggregateState}`}
          >
            <span>04</span>
            <strong>{aggregateLabel}</strong>
            <small>
              {aggregateState === "ready"
                ? "Buktikan alur dengan satu contoh."
                : "Periksa status layanan sebelum menyimpan contoh."}
            </small>
          </li>
        </ol>
      </section>

      <section aria-labelledby="status-heading" className="status-section">
        <div>
          <p className="eyebrow">Pemeriksaan langsung</p>
          <h2 id="status-heading">Status kesiapan</h2>
        </div>
        <div className="status-grid">
          <StatusCard {...readiness.database} label="Database" />
          <StatusCard {...readiness.api} label="API bertipe" />
        </div>
      </section>

      <section aria-labelledby="demo-heading" className="demo-section">
        <div>
          <p className="eyebrow">Bukti alur</p>
          <h2 id="demo-heading">Simpan satu contoh</h2>
          <p>Nama akan divalidasi oleh API sebelum tersimpan di database.</p>
        </div>
        <DemoForm />
        <ul aria-label="Contoh tersimpan" className="demo-list">
          {demos.map((demo) => (
            <li key={demo.id}>{demo.name}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}

async function DynamicReadinessDesk() {
  await connection();
  const [readiness, demos] = await Promise.all([getReadiness(), readDemos()]);

  return <ReadinessDesk demos={demos} readiness={readiness} />;
}

export default function Page() {
  return (
    <Suspense fallback={<ReadinessSkeleton />}>
      <DynamicReadinessDesk />
    </Suspense>
  );
}

function ReadinessSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Memuat kesiapan"
      className="readiness-desk"
    >
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--rail" />
      <div className="skeleton skeleton--cards" />
    </main>
  );
}
