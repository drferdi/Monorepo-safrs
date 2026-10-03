// @vitest-environment node
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { WINANSI_MAP, toWinAnsi } from './winansi';

describe('toWinAnsi', () => {
  it('spells every mapped character as text the standard Helvetica encodes', async () => {
    const font = await (await PDFDocument.create()).embedFont(StandardFonts.Helvetica);
    for (const [char, spelled] of Object.entries(WINANSI_MAP)) {
      expect(toWinAnsi(char)).toBe(spelled);
      expect(() => font.encodeText(toWinAnsi(`a${char}b`))).not.toThrow();
    }
  });

  it('keeps the WinAnsi characters a clinical note uses', () => {
    const note = 'Suhu 37,5 °C · 1x10mg – µg × 2 “catatan”';
    expect(toWinAnsi(note)).toBe(note);
  });

  it('turns line breaks into spaces and an unknown character into ?', () => {
    expect(toWinAnsi('SpO₂ ≥ 95\nbaik 🙂')).toBe('SpO2 >= 95 baik ?');
  });
});
