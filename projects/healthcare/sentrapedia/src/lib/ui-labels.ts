export function specialtyLabel(value: string): string { return value === "Primary Care" ? "Layanan Primer" : value; }
export function modelLabel(value: string): string { return value === "Standard" ? "Standar" : value; }
// Indonesian greeting by the reader's local hour: pagi from 04, siang from 11, sore from 15, malam from 18.
export function greeting(hour: number, name: string): string {
  const part = hour >= 4 && hour < 11 ? "pagi" : hour >= 11 && hour < 15 ? "siang" : hour >= 15 && hour < 18 ? "sore" : "malam";
  return name.trim() ? `Selamat ${part}, ${name.trim()}` : `Selamat ${part}`;
}
