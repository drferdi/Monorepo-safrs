import { afterEach, describe, expect, it, vi } from 'vitest';

import { downloadVisitSummaryPdf, visitSummaryFileName } from './download-visit-summary';
import { buildVisitSummaryModel } from './visit-summary-model';
import { syntheticVisitSummaryInput } from './visit-summary.fixtures';

const { renderMock } = vi.hoisted(() => ({ renderMock: vi.fn() }));
vi.mock('./visit-summary-pdf', () => ({ renderVisitSummaryPdf: renderMock }));

const model = buildVisitSummaryModel(syntheticVisitSummaryInput);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  renderMock.mockReset();
});

describe('downloadVisitSummaryPdf', () => {
  it('names the file after the RM and the day, without anything else from the patient', () => {
    expect(visitSummaryFileName(model)).toBe('ringkasan-kunjungan-RM-00-12-34-2026-10-03.pdf');
    expect(visitSummaryFileName({ ...model, head: { ...model.head, rm: ' 12/34 ' } })).toBe(
      'ringkasan-kunjungan-12-34-2026-10-03.pdf'
    );
  });

  it('saves the rendered PDF with the ink logomark it fetched', async () => {
    const bytes: Record<string, number> = { '/brand/sentra-logomark-ink.png': 1 };
    vi.stubGlobal('fetch', vi.fn(async (path: string) => new Response(new Uint8Array([bytes[path]]))));
    renderMock.mockResolvedValue(new Uint8Array([37, 80, 68, 70]));
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:pdf');
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const saved: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      saved.push(this.download);
    });

    await downloadVisitSummaryPdf(model);

    expect(renderMock).toHaveBeenCalledWith(model, { logo: new Uint8Array([1]) });
    expect(saved).toEqual(['ringkasan-kunjungan-RM-00-12-34-2026-10-03.pdf']);
    expect(createObjectURL.mock.calls[0][0].type).toBe('application/pdf');
  });

  it('saves nothing when the logomark cannot be read', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 404 })));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    await expect(downloadVisitSummaryPdf(model)).rejects.toThrow('/brand/sentra-logomark-ink.png');
    expect(click).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
  });
});
