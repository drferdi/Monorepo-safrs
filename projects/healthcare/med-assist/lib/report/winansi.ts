/**
 * The standard PDF Helvetica encodes WinAnsi (Windows-1252) only, and pdf-lib throws on anything
 * else. Every text the visit summary draws passes through `toWinAnsi`: a known character becomes
 * an encodable spelling, any other unencodable one `?`.
 */
const WINANSI_HIGH = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';

export const WINANSI_MAP: Readonly<Record<string, string>> = {
  '≥': '>=',
  '≤': '<=',
  '→': '->',
  '←': '<-',
  '≈': '~',
  '−': '-',
  '‐': '-',
  '‑': '-',
  '₂': '2',
  ' ': ' ',
  ' ': ' ',
  '​': '',
};

export function isWinAnsi(char: string): boolean {
  const code = char.codePointAt(0) ?? 0;
  return (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WINANSI_HIGH.includes(char);
}

export function toWinAnsi(text: string): string {
  return Array.from(text.normalize('NFC').replace(/[\t\r\n]+/g, ' '))
    .map((char) => WINANSI_MAP[char] ?? (isWinAnsi(char) ? char : '?'))
    .join('');
}
