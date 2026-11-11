import { z } from "zod";

/**
 * Slug adalah kontrak publik: tautan pendidikan yang dibagikan hari ini harus
 * tetap hidup bertahun-tahun kemudian (UX Bible bagian 25 dan 33). Karena itu
 * bentuknya dibatasi dan diverifikasi, bukan dihasilkan sembarangan.
 *
 * Bentuk: huruf kecil, angka, tanda hubung. Anchor Journey memakai bentuk yang
 * sama sehingga /journey#1135-panjalu-jayati stabil.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const slugSchema = z
  .string()
  .min(2)
  .max(96)
  .regex(SLUG_PATTERN, "Slug must be lowercase words separated by hyphens.");

export function toSlug(value: string): string {
  // Menghapus tanda diakritik gabungan setelah normalisasi NFKD sehingga
  // "Panjalu Jayati" dan ejaan berdiakritiknya menghasilkan slug yang sama.
  const withoutDiacritics = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
  return withoutDiacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function isValidSlug(value: string): boolean {
  return slugSchema.safeParse(value).success;
}
