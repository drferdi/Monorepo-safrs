import { beranda } from "./beranda.ts";
import { caraBelajar } from "./cara-belajar.ts";
import { kebijakanPrivasi, ketentuanLayanan } from "./legal.ts";
import { programPemantauanPerkembangan } from "./program-pemantauan-perkembangan.ts";
import { programPemetaanBelajar } from "./program-pemetaan-belajar.ts";
import { programPendampinganPersonal } from "./program-pendampingan-personal.ts";
import { smartboard } from "./smartboard.ts";
import { tentang } from "./tentang.ts";
import type { NavItem, PageContent } from "./types.ts";
import { wawasan } from "./wawasan.ts";

export const NAV_ITEMS: NavItem[] = [
  { label: "Beranda", href: "/" },
  { label: "Cara Belajar", href: "/cara-belajar" },
  { label: "Wawasan", href: "/wawasan" },
  { label: "Tentang", href: "/tentang" },
  { label: "Smartboard", href: "/smartboard" },
];

export const allPages: PageContent[] = [
  beranda,
  caraBelajar,
  tentang,
  wawasan,
  programPemetaanBelajar,
  programPendampinganPersonal,
  programPemantauanPerkembangan,
  smartboard,
  kebijakanPrivasi,
  ketentuanLayanan,
];
