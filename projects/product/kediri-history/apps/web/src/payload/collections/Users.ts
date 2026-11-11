import type { CollectionConfig } from "payload";

import { EDITORIAL_ROLES } from "../../modules/historical-domain/index";
import { hasRole, isAdmin, isAdminField, neverPublic } from "../access/index";

/**
 * Peran editorial menentukan bentuk setiap koleksi historis berikutnya:
 * peneliti tidak boleh menerbitkan, dan editor tidak boleh menyetujui bukti
 * historisnya sendiri (Master Implementation Plan bagian 6, koleksi 01).
 */
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
    defaultColumns: ["email", "displayName", "role"],
    group: "System",
  },
  access: {
    // Publik tidak pernah membaca Users.
    read: neverPublic,
    create: isAdmin,
    update: ({ req, id }) => {
      if (!req.user) return false;
      if (req.user.id === id) return true;
      return hasRole("admin")({ req });
    },
    delete: isAdmin,
  },
  fields: [
    { name: "displayName", type: "text", required: true },
    {
      name: "role",
      type: "select",
      required: true,
      defaultValue: "researcher",
      // Hanya admin yang boleh mengubah peran; tanpa ini seorang peneliti
      // dapat menaikkan dirinya sendiri menjadi publisher.
      access: { create: isAdminField, update: isAdminField },
      options: EDITORIAL_ROLES.map((role) => ({ label: role, value: role })),
    },
  ],
};
