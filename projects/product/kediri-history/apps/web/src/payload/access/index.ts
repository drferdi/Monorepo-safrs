import type { Access, FieldAccess } from "payload";

import type { EditorialRole } from "../../modules/historical-domain/index";

/**
 * Kontrol akses editorial.
 *
 * Prinsip empat mata (Technical Bible bagian 30): peneliti tidak boleh
 * menerbitkan, dan editor tidak boleh menyetujui bukti historisnya sendiri.
 * Aturan itu diwujudkan di sini, bukan di dokumentasi.
 */

interface MaybeUser {
  readonly role?: EditorialRole;
}

function roleOf(user: unknown): EditorialRole | undefined {
  if (typeof user !== "object" || user === null) return undefined;
  return (user as MaybeUser).role;
}

export const isAuthenticated: Access = ({ req }) => Boolean(req.user);

export function hasRole(...roles: readonly EditorialRole[]): Access {
  return ({ req }) => {
    const role = roleOf(req.user);
    return role !== undefined && roles.includes(role);
  };
}

export function fieldHasRole(...roles: readonly EditorialRole[]): FieldAccess {
  return ({ req }) => {
    const role = roleOf(req.user);
    return role !== undefined && roles.includes(role);
  };
}

export const isAdmin: Access = hasRole("admin");

/** Boleh mengubah status terbit. */
export const canPublish: Access = hasRole("admin", "publisher");

/** Boleh menyetujui bukti historis. */
export const canApproveEvidence: Access = hasRole(
  "admin",
  "historical_reviewer",
);

/** Varian tingkat-field: Payload menuntut boolean murni di sini, bukan Where. */
export const canApproveEvidenceField: FieldAccess = fieldHasRole(
  "admin",
  "historical_reviewer",
);

/** Hanya admin yang boleh menyentuh field peran. */
export const isAdminField: FieldAccess = fieldHasRole("admin");

/** Boleh mengelola hak dan master arsip. */
export const canCurateAssets: Access = hasRole("admin", "asset_curator");

/** Boleh menulis catatan historis (bukan menerbitkannya). */
export const canAuthor: Access = hasRole(
  "admin",
  "publisher",
  "historical_reviewer",
  "editor",
  "researcher",
);

/**
 * Bacaan publik untuk entitas historis: anonim hanya melihat dokumen terbit.
 * Pengguna terautentikasi melihat draft agar alur tinjauan dapat bekerja.
 */
export const publishedOrAuthenticated: Access = ({ req }) => {
  if (req.user) return true;
  return { _status: { equals: "published" } };
};

/**
 * Permukaan yang tidak pernah dibaca publik dalam keadaan apa pun: master
 * arsip, dokumen hak, dan akun pengguna.
 */
export const neverPublic: Access = ({ req }) => Boolean(req.user);
