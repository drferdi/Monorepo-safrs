function cleanText(raw: string | null | undefined): string {
  return (raw || '').replace(/\s+/g, ' ').trim();
}

export function extractMappedTableRows<T extends Record<string, string>>(
  root: ParentNode,
  rowSelector: string,
  columns: T
): Array<Record<keyof T, string>> {
  return Array.from(root.querySelectorAll(rowSelector)).map((row) => {
    const record = {} as Record<keyof T, string>;
    for (const [key, selector] of Object.entries(columns)) {
      const cell = (row as ParentNode).querySelector(selector);
      record[key as keyof T] = cleanText(cell?.textContent || '');
    }
    return record;
  });
}

export function extractNextPaginationUrl(root: ParentNode, currentUrl: string): string | null {
  const pagination = root.querySelector('ul.pagination');
  if (!pagination) return null;

  const items = Array.from(pagination.querySelectorAll('li'));
  const activeIndex = items.findIndex((item) => item.classList.contains('active'));
  if (activeIndex < 0) return null;

  for (let index = activeIndex + 1; index < items.length; index += 1) {
    const item = items[index];
    if (item.classList.contains('disabled')) continue;
    const anchor = item.querySelector('a[href]');
    const href = anchor?.getAttribute('href');
    if (!href) continue;
    return new URL(href, currentUrl).toString();
  }

  return null;
}
