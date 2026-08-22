export type DataTableColumn = {
  key: string;
  header: string;
};

export function DataTable({
  columns,
  rows,
}: {
  columns: DataTableColumn[];
  rows: Record<string, unknown>[];
}) {
  return (
    <div className="overflow-x-auto rounded-(--radius-control) border border-(--color-border-subtle)">
      <table className="w-full border-collapse text-left text-[length:var(--font-size-data)]">
        <thead>
          <tr className="border-b border-(--color-border-subtle) bg-(--color-background-surface)">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="px-(--space-4) py-(--space-3) text-[length:var(--font-size-label)] font-(--font-weight-medium) uppercase tracking-(--letter-spacing-label) text-(--color-text-secondary)"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-(--space-4) py-(--space-5) text-center text-(--color-text-secondary)"
              >
                Tidak ada data
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={JSON.stringify(row)}
                className="border-b border-(--color-border-subtle) last:border-b-0"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className="px-(--space-4) py-(--space-3) text-(--color-text-primary)"
                  >
                    {String(row[column.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
