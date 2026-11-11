export default function Loading() {
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
