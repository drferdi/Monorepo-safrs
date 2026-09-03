import { DURATIONS, EASES, gsap, MOTION, SplitText, STAGGERS } from "./gsap";

/**
 * Sutradara naskah — Jam 2 dari model dua-jam.
 *
 * Kamera (Jam 1) tetap di-scrub linear oleh ScrollTrigger di `scenes.ts`.
 * Berkas ini memegang jam yang satunya: tarikh, kalimat pemikul, nama, dan
 * beat editorial DI-TRIGGER pada ambang progres shot, lalu bermain di jamnya
 * sendiri dengan ease ekspresif. Inilah perbedaan struktural antara
 * "gambar yang ditarik-tarik" dan situs referensi (bombon.rs,
 * jasminadenner.com): di sana naskah tidak pernah menumpang jam kamera.
 *
 * IDENTITAS GERAK PER SCENE (audit 2026-09-03): setiap koreografi memiliki
 * satu teknik utama yang menjawab argumen historisnya — lihat `SCRIPT_STYLES`.
 * Identitas dipasang pada PERNYATAAN KUNCI (tarikh, nama, kalimat pemikul);
 * beat pendukung tetap di register BACA yang tenang (`MOTION.read`), sehingga
 * tidak semua hal bergerak sama kerasnya.
 *
 * Aturan yang tetap mengikat:
 *   - Tidak ada teks yang dibuat di sini; seluruh sejarah sudah dirender
 *     server. SplitText membelah untuk topeng baris, dan aria bawaannya
 *     ("auto") menjaga naskah utuh bagi pembaca layar: induk menerima
 *     aria-label penuh, potongan menerima aria-hidden.
 *   - Tidak pernah autoAlpha / visibility:hidden pada naskah historis,
 *     KECUALI beat yang bergiliran — dan varian mobile/reduced/tanpa-JS
 *     tidak pernah melewati jalur ini (CSS menumpuknya statis).
 *   - Hanya transform, opacity, dan filter (khusus kredit Prolog) yang
 *     dianimasikan. Efek "tracking" dibuat dari offset `x` per huruf, bukan
 *     dari `letter-spacing` (properti layout).
 *   - Mundur harus jujur: menggulir balik melewati ambang memutar balik
 *     timeline-nya, sehingga keadaan selalu fungsi dari posisi gulir.
 */

export interface ReadingDirector {
  onProgress(progress: number): void;
  destroy(): void;
}

/** Jendela beat per koreografi — nilai yang sama dengan rezim scrub lama. */
function passageWindow(key: string): { start: number; end: number } {
  const start =
    key === "prologueReveal" ? 0.7 : key === "nameEmerges" ? 0.5 : 0.54;
  /*
   * 879 (inscriptionReveal) dulu punya jendela lebih sempit (0.74, bukan
   * 0.82) — sisa era 4 beat. Sejak jadi 5 beat (revisi Chief 2026-08-30),
   * jendela sempit itu membuat tiap beat cuma kebagian ~180px gulir, gampang
   * terlompati satu scroll wheel wajar. Dikembalikan ke lebar default situs
   * (sama seperti kebanyakan shot lain) supaya tiap beat dapat ruang wajar.
   */
  const end = key === "nameEndures" ? 0.74 : 0.82;
  return { start, end };
}

/**
 * Ambang beat Prolog tidak dibagi rata: kalimat pembuka memerlukan satu
 * tahanan panjang sebelum kalimat kedua mengambil bingkai. Scene lain tetap
 * memakai pembagian rata dari passageWindow agar koreografinya tidak berubah.
 */
function passageThresholds(key: string, count: number): readonly number[] {
  /*
   * Prolog memakai babak pembuka (dua footage dan satu naskah era Daha)
   * sebelum pelat "KEDIRI, 2026" masuk pada 0,63 — lihat `prologueReveal` di
   * scenes.ts. Ambang beat karena itu duduk di babak terakhir; ambang lama
   * [0,48; 0,70] akan menyalakan naskah di balik footage yang sedang tayang.
   */
  if (key === "prologueReveal" && count === 2) return [0.7, 0.85];
  const { start, end } = passageWindow(key);
  const slot = (end - start) / count;
  return Array.from({ length: count }, (_, index) => start + slot * index);
}

/**
 * Rasa arah per koreografi (direktif Chief 2026-08-28: arah gerak berbeda
 * antar-scene, untuk variasi). Arahnya tetap harus menjawab argumen historis
 * scene-nya — bukan acak:
 *
 *   `beatX`     hanyut horizontal wadah beat saat masuk (%, 0 = murni naik);
 *   `alternate` tanda hanyut berganti tiap beat (dialog dua sisi);
 *   `unitAxis`  sumbu kedatangan tarikh; `unitDir` arahnya.
 */
interface SceneFlavor {
  readonly beatX: number;
  readonly alternate?: boolean;
  readonly unitAxis: "x" | "y";
  readonly unitDir: 1 | -1;
}

const DEFAULT_FLAVOR: SceneFlavor = { beatX: 0, unitAxis: "y", unitDir: 1 };

const FLAVORS: Readonly<Record<string, SceneFlavor>> = {
  // Prolog: kota hadir tegak lurus dari permukaan air.
  prologueReveal: { beatX: 0, unitAxis: "y", unitDir: 1 },
  // 879: naskah menyusul cahaya yang menyapu dari kiri.
  inscriptionReveal: { beatX: -4, unitAxis: "y", unitDir: 1 },
  // 921: nama naik; beat berdialog dua sisi di sekitarnya.
  nameEmerges: { beatX: 6, alternate: true, unitAxis: "y", unitDir: 1 },
  // 1042: pembagian — beat berangkat dari sisi yang berlawanan.
  dividedKingdom: { beatX: 5, alternate: true, unitAxis: "y", unitDir: 1 },
  // Daha: kota hidup di video — naskah naik lembut, tanpa hanyut yang
  // bersaing dengan gambar bergerak.
  dahaLiving: { beatX: 0, unitAxis: "y", unitDir: 1 },
  // 1157: halaman arsip terbuka dari kiri.
  manuscriptWorld: { beatX: -7, unitAxis: "x", unitDir: -1 },
  // 1222: keseimbangan bergeser — semuanya condong dari kanan.
  politicalFracture: { beatX: 7, unitAxis: "x", unitDir: 1 },
  // 1912: geometri terangkat — tarikh turun menempati tempatnya.
  bridgeLift: { beatX: 0, unitAxis: "y", unitDir: -1 },
  // 1947–1948: ritme mesin, dua sisi bergantian cepat.
  revolutionMachine: { beatX: 8, alternate: true, unitAxis: "y", unitDir: 1 },
  // 1990: perusahaan berangkat ke pasar nasional — semuanya dari kiri.
  marketDeparture: { beatX: -9, unitAxis: "x", unitDir: -1 },
  // 2024–2026: satu garis memanjang ke cakrawala, dari kiri.
  runwayTransition: { beatX: -9, unitAxis: "x", unitDir: -1 },
};

function flavorFor(key: string): SceneFlavor {
  return FLAVORS[key] ?? DEFAULT_FLAVOR;
}

/**
 * Identitas gerak per SLUG, milik kode (preseden: `framing.ts` dan
 * `HANDOFF_BEFORE_SCENE` juga dikunci per slug). CMS tetap memilih
 * `choreographyKey`; peta ini hanya memecah dua scene BERSEBELAHAN yang
 * memakai key sama (1958 → 1990, keduanya `industrialExpansion`) supaya tidak
 * ada dua entrance identik berturut-turut.
 */
const SLUG_IDENTITY: Readonly<Record<string, string>> = {
  "1990-kediri-to-market": "marketDeparture",
};

function identityFor(root: HTMLElement, key: string): string {
  const scene = root.querySelector<HTMLElement>(".scene[id]");
  const slug = scene?.id;
  return (slug && SLUG_IDENTITY[slug]) || key;
}

const q = (root: HTMLElement, name: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-motion="${name}"]`));

interface Cue {
  readonly at: number;
  readonly timeline: gsap.core.Timeline;
  played: boolean;
}

type FromVars =
  | gsap.TweenVars
  | ((index: number, count: number) => gsap.TweenVars);

interface Entrance {
  readonly from: FromVars;
  readonly to: gsap.TweenVars;
}

/**
 * Gaya naskah per identitas.
 *
 *   `masterSplit` unit pembelahan kalimat pemikul (baris, kata, huruf);
 *   `master`      keadaan awal + tween per unit itu — INILAH identitas;
 *   `beats`       entrance beat pendukung — tetap dekat register baca.
 *
 * Seluruh stagger memakai `amount` (rentang total), bukan `each`, sehingga
 * kalimat panjang tidak memanjangkan durasi: keadaan baca selalu tercapai
 * dalam ~1.5 detik setelah ambangnya terlewati.
 */
interface ScriptStyle {
  readonly masterSplit: "lines" | "words" | "chars";
  readonly master: Entrance;
  readonly beats: Entrance;
}

const READ_BEATS: Entrance = {
  from: { opacity: 0, y: MOTION.read.y },
  to: {
    opacity: 1,
    y: 0,
    duration: MOTION.read.duration,
    ease: MOTION.read.ease,
  },
};

const DEFAULT_STYLE: ScriptStyle = {
  masterSplit: "lines",
  master: {
    from: { opacity: 0, y: MOTION.read.y },
    to: {
      opacity: 1,
      y: 0,
      duration: MOTION.read.duration,
      ease: MOTION.read.ease,
      stagger: { amount: 0.3 },
    },
  },
  beats: READ_BEATS,
};

const SCRIPT_STYLES: Readonly<Record<string, ScriptStyle>> = {
  /* Prolog — takjub: kata-kata terkuak dari kabut (tanda tangan situs). */
  prologueReveal: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0, y: 20, filter: "blur(4px)" },
      to: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.85,
        ease: EASES.read,
        stagger: { amount: 0.24 },
      },
    },
    beats: {
      from: { opacity: 0, y: 20, filter: "blur(4px)" },
      to: {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.85,
        ease: EASES.read,
      },
    },
  },
  /* 879 — keterbacaan adalah peristiwa: huruf terbaca menyusul sapuan cahaya. */
  inscriptionReveal: {
    masterSplit: "chars",
    master: {
      from: { opacity: 0, x: 10, skewX: -12 },
      to: {
        opacity: 1,
        x: 0,
        skewX: 0,
        duration: 0.7,
        ease: EASES.cine,
        stagger: { amount: 0.8, from: "start" },
      },
    },
    beats: {
      from: { opacity: 0, x: -22, y: 4 },
      to: { opacity: 1, x: 0, y: 0, duration: 0.75, ease: EASES.read },
    },
  },
  /* 921 — sebuah nama menempati kursinya: mendarat dari kedalaman, tanpa pantulan. */
  nameEmerges: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0, y: 28 },
      to: {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: EASES.settle,
        stagger: { amount: 0.25 },
      },
    },
    beats: {
      from: { opacity: 0, y: 18 },
      to: { opacity: 1, y: 0, duration: 0.8, ease: EASES.settle },
    },
  },
  /* 1015 — Research Hold: keheningan; naskah sekadar menjadi ada. */
  nameEndures: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0 },
      to: {
        opacity: 1,
        duration: DURATIONS.dwell,
        ease: EASES.sine,
        stagger: { amount: 0.2 },
      },
    },
    beats: {
      from: { opacity: 0, x: -16, y: 8 },
      to: { opacity: 1, x: 0, y: 0, duration: 0.7, ease: EASES.read },
    },
  },
  /* 1042 — pembagian terjadi di RUANG: kata-kata terbelah barat/timur. */
  dividedKingdom: {
    masterSplit: "words",
    master: {
      from: (index) => ({ opacity: 0, x: index % 2 === 0 ? -36 : 36 }),
      to: {
        opacity: 1,
        x: 0,
        duration: 0.8,
        ease: EASES.converge,
        stagger: { amount: 0.4 },
      },
    },
    beats: {
      from: (index) => ({ opacity: 0, x: index % 2 === 0 ? -28 : 28 }),
      to: { opacity: 1, x: 0, duration: 0.75, ease: EASES.converge },
    },
  },
  /* Daha — kota yang masih bernapas: naik lembut, tidak menyaingi video. */
  dahaLiving: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0, y: 14 },
      to: {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: EASES.sine,
        stagger: { amount: 0.3 },
      },
    },
    beats: {
      from: { opacity: 0, y: 14 },
      to: { opacity: 1, y: 0, duration: 0.9, ease: EASES.sine },
    },
  },
  /* 1135 / 1292 — otoritas yang tercerai menyatu: kata datang dari dua sisi ke tengah. */
  royalConsolidation: {
    masterSplit: "words",
    master: {
      from: (index, count) => ({
        opacity: 0,
        x: (index < count / 2 ? -1 : 1) * 56,
      }),
      to: {
        opacity: 1,
        x: 0,
        duration: 0.9,
        ease: EASES.converge,
        stagger: { amount: 0.35, from: "edges" },
      },
    },
    beats: READ_BEATS,
  },
  /* 1157 / 1906 / 1950 — halaman arsip terbuka: baris berputar dari engsel kiri. */
  manuscriptWorld: {
    masterSplit: "lines",
    master: {
      from: {
        opacity: 0,
        x: -24,
        rotationX: -55,
        transformOrigin: "left top",
        transformPerspective: 800,
      },
      to: {
        opacity: 1,
        x: 0,
        rotationX: 0,
        duration: 0.9,
        ease: EASES.settle,
        stagger: { amount: 0.3 },
      },
    },
    beats: {
      from: { opacity: 0, x: -10 },
      to: { opacity: 1, x: 0, duration: 0.9, ease: EASES.read },
    },
  },
  /* 1222 / 1293 / … — retak: potongan keras, stagger rapat, dari kanan. */
  politicalFracture: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0, x: 48 },
      to: {
        opacity: 1,
        x: 0,
        duration: DURATIONS.cut,
        ease: EASES.hardCut,
        stagger: { each: 0.09 },
      },
    },
    beats: {
      from: { opacity: 0, x: 24 },
      to: { opacity: 1, x: 0, duration: DURATIONS.cut, ease: EASES.hardCut },
    },
  },
  /* 1869 / dua jembatan — terakit: kata naik dari bawah, dari tepi ke tengah. */
  bridgeConstruction: {
    masterSplit: "words",
    master: {
      from: { opacity: 0, y: 34 },
      to: {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: "power3.out",
        stagger: { amount: 0.45, from: "edges" },
      },
    },
    beats: READ_BEATS,
  },
  /* 1912 — terangkat: baris naik jauh dengan deselerasi panjang. */
  bridgeLift: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0, y: 40 },
      to: {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: EASES.lift,
        stagger: { amount: 0.3 },
      },
    },
    beats: {
      from: { opacity: 0, y: 24 },
      to: { opacity: 1, y: 0, duration: 0.9, ease: EASES.lift },
    },
  },
  /* 1947–1948 — ritme mesin: potongan bergantian sisi, stagger tercepat di situs. */
  revolutionMachine: {
    masterSplit: "lines",
    master: {
      from: (index) => ({ opacity: 0, x: index % 2 === 0 ? -28 : 28 }),
      to: {
        opacity: 1,
        x: 0,
        duration: 0.24,
        ease: EASES.hardCut,
        stagger: { each: 0.06 },
      },
    },
    beats: {
      from: (index) => ({ opacity: 0, x: index % 2 === 0 ? -14 : 14 }),
      to: { opacity: 1, x: 0, duration: DURATIONS.cut, ease: EASES.hardCut },
    },
  },
  /* gula / warga / 1958 — meluas dari tapak kecil: kata mekar dari tengah. */
  industrialExpansion: {
    masterSplit: "words",
    master: {
      from: { opacity: 0, scale: 0.92, y: 6, transformOrigin: "center" },
      to: {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.85,
        ease: EASES.expand,
        stagger: { amount: 0.4, from: "center" },
      },
    },
    beats: READ_BEATS,
  },
  /* 1990 (override slug) — berangkat ke pasar nasional: sapuan panjang dari kiri. */
  marketDeparture: {
    masterSplit: "lines",
    master: {
      from: { opacity: 0, x: -80 },
      to: {
        opacity: 1,
        x: 0,
        duration: 1.2,
        ease: EASES.expand,
        stagger: { amount: 0.25 },
      },
    },
    beats: {
      from: { opacity: 0, x: -20 },
      to: { opacity: 1, x: 0, duration: 1, ease: EASES.expand },
    },
  },
  /* 2024–2026 — satu garis ke cakrawala: huruf merenggang dari tengah (tracking lewat x). */
  runwayTransition: {
    masterSplit: "chars",
    master: {
      from: (index, count) => ({
        opacity: 0,
        x: (count / 2 - index) * 9,
      }),
      to: {
        opacity: 1,
        x: 0,
        duration: 1.2,
        ease: EASES.settle,
        stagger: { amount: 0.3, from: "center" },
      },
    },
    beats: {
      from: { opacity: 0, x: -18 },
      to: { opacity: 1, x: 0, duration: 1, ease: EASES.settle },
    },
  },
};

function styleFor(identity: string): ScriptStyle {
  return SCRIPT_STYLES[identity] ?? DEFAULT_STYLE;
}

/** Menetapkan keadaan awal per elemen; `from` boleh bergantung pada indeks. */
function applyFrom(targets: readonly Element[], from: FromVars): void {
  if (typeof from === "function") {
    targets.forEach((target, index) => {
      gsap.set(target, from(index, targets.length));
    });
  } else if (targets.length > 0) {
    gsap.set(targets, from);
  }
}

/** Histeresis pembalikan supaya ambang tidak bergetar di tepi. */
const REVERSE_SLACK = 0.05;
/** Progres gulir yang membatalkan entrance layar pertama Prolog (≈40 px). */
const INTRO_CANCEL = 0.01;
export function createReadingDirector(
  root: HTMLElement,
  key: string,
): ReadingDirector {
  let destroyed = false;
  let lastProgress = 0;
  const cues: Cue[] = [];
  const splits: SplitText[] = [];
  const beatTimelines: gsap.core.Timeline[] = [];
  const pendingCalls: gsap.core.Tween[] = [];
  /** Tween ambient (loop) yang tidak terikat cue — WAJIB dibunuh saat destroy. */
  const ambient: gsap.core.Tween[] = [];
  let beats: HTMLElement[] = [];
  let activeBeat = -1;
  const touched: HTMLElement[] = [];
  const fadeTweens: (gsap.core.Tween | null)[] = [];
  let pendingEntrance: gsap.core.Tween | null = null;
  /**
   * Entrance layar pertama Prolog (cue negatif, berbasis waktu): dua
   * timeline — citra (dibuat SINKRON saat island terpasang, tidak menunggu
   * font) dan naskah (dibuat di build() setelah fonts.ready, karena SplitText
   * menuntut pemenggalan baris yang final). `settleIntro` melompatkan
   * keduanya ke keadaan akhir begitu pembaca menggulir — gulir selalu menang.
   */
  const intro: gsap.core.Timeline[] = [];
  let introDone = false;
  const settleIntro = () => {
    if (introDone) return;
    introDone = true;
    for (const timeline of intro) timeline.progress(1);
  };
  const identity = identityFor(root, key);
  const flavor = flavorFor(identity);
  const style = styleFor(identity);

  if (key === "prologueReveal") {
    const scrollCue = root.querySelector<HTMLElement>(
      '[data-motion="scroll-cue"]',
    );
    if (scrollCue) {
      touched.push(scrollCue);
      // Cue baru tampil di akhir entrance layar pertama (lihat `intro`).
      gsap.set(scrollCue, { opacity: 0, y: 0 });
      const icon = scrollCue.querySelector<HTMLElement>(".scroll-cue-icon");
      if (icon) {
        touched.push(icon);
        // Satu affordance ambient, langsung tersedia dan dibersihkan bersama island.
        ambient.push(
          gsap.to(icon, {
            y: 5,
            duration: 1.1,
            repeat: -1,
            yoyo: true,
            ease: EASES.sine,
          }),
        );
      }
    }

    /*
     * Layar pertama sebagai title sequence — babak CITRA (direktif Chief
     * 2026-09-04, "just a cinematic first visual"). Citra Kediri 2026 muncul
     * dari `.stage-void` dengan letterbox 2,39:1 yang membuka dan dorongan
     * kamera 1,10 → 1. Dimulai di sini, bukan di build(): fonts.ready di
     * dev terukur ±3 detik, dan pembaca tidak boleh menatap layar gelap
     * selama itu.
     *
     * Yang digerakkan adalah `.stage-media` (kontainer dalam), BUKAN
     * `.prologue-surface`: timeline scrub `prologueReveal` menulis
     * `opacity: 1` dan `--dolly: 1` pada surface lewat fromTo
     * (immediateRender) dan ScrollTrigger `invalidateOnRefresh` menulisnya
     * ulang pada setiap refresh — termasuk refresh gate font/media yang
     * jatuh di tengah entrance ini. Letterbox dibawa custom property
     * `--letterbox` (CSS: `clip-path: inset(calc(var(--letterbox) * 1%) 0)`),
     * pola yang sama dengan `--dolly` — tween string `clip-path` langsung
     * terbukti tidak bergerak di Chromium (terukur 2026-09-04).
     */
    const media = root.querySelector<HTMLElement>(
      ".prologue-surface .stage-media",
    );
    if (media) {
      touched.push(media);
      const stage = media.closest<HTMLElement>(".prologue-stage") ?? media;
      const ratio = stage.clientWidth / Math.max(1, stage.clientHeight);
      // Pita atas-bawah letterbox 2,39:1, dalam persen tinggi bingkai.
      const bar = Math.max(0, ((1 - ratio / 2.39) / 2) * 100);
      const introMedia = gsap.timeline({
        paused: true,
        defaults: { ease: EASES.cine },
      });
      introMedia.fromTo(
        media,
        {
          opacity: 0,
          scale: 1.1,
          "--letterbox": bar,
          transformOrigin: "54% 52%",
        },
        { opacity: 1, scale: 1, "--letterbox": 0, duration: 1.6 },
        0,
      );
      cues.push({ at: -1, played: true, timeline: introMedia });
      intro.push(introMedia);
      introMedia.play();
    }
  }

  const build = () => {
    if (destroyed) return;
    const units = q(root, "date-part");
    const context = q(root, "context");
    const master = q(root, "master");
    const names = q(root, "scene-name");
    beats = q(root, "passage");

    /* ---------- tarikh ---------- */
    if (units.length > 0) {
      touched.push(...units);
      if (key === "inscriptionReveal" && units.length > 1) {
        const year = units[units.length - 1] as HTMLElement;
        const precision = units.slice(0, -1);
        gsap.set(units, { opacity: 0, yPercent: 16 });
        cues.push({
          at: 0.28,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(year, {
            opacity: 1,
            yPercent: 0,
            duration: MOTION.text.unit.duration,
            ease: MOTION.read.ease,
          }),
        });
        cues.push({
          at: 0.4,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(precision, {
            opacity: 1,
            yPercent: 0,
            duration: MOTION.text.unit.duration,
            stagger: MOTION.text.unit.stagger,
            ease: MOTION.read.ease,
          }),
        });
      } else if (key === "royalConsolidation") {
        gsap.set(units, {
          opacity: 0,
          xPercent: (index: number) => (index % 2 === 0 ? -14 : 14),
        });
        cues.push({
          at: 0.32,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(units, {
            opacity: 1,
            xPercent: 0,
            duration: MOTION.text.unit.duration * 1.3,
            stagger: 0.08,
            ease: EASES.converge,
          }),
        });
      } else if (
        identity === "politicalFracture" ||
        identity === "revolutionMachine"
      ) {
        // Tegang: tarikh tidak "tiba", ia DIPOTONG masuk.
        const axis = flavor.unitAxis;
        const sign = flavor.unitDir;
        const initial =
          axis === "x" ? { xPercent: 18 * sign } : { yPercent: 18 * sign };
        const target = axis === "x" ? { xPercent: 0 } : { yPercent: 0 };
        gsap.set(units, { opacity: 0, ...initial });
        cues.push({
          at: 0.3,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(units, {
            opacity: 1,
            ...target,
            duration: DURATIONS.cut,
            stagger: 0.07,
            ease: EASES.hardCut,
          }),
        });
      } else {
        const axis = flavor.unitAxis;
        const sign = flavor.unitDir;
        const initial =
          axis === "x" ? { xPercent: 14 * sign } : { yPercent: 14 * sign };
        const target = axis === "x" ? { xPercent: 0 } : { yPercent: 0 };
        gsap.set(units, { opacity: 0, ...initial });
        cues.push({
          at: 0.3,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(units, {
            opacity: 1,
            ...target,
            duration: MOTION.text.unit.duration,
            stagger: MOTION.text.unit.stagger,
            ease: identity === "bridgeLift" ? EASES.lift : MOTION.read.ease,
          }),
        });
      }
    }

    /* ---------- konteks ---------- */
    if (context.length > 0) {
      touched.push(...context);
      if (key === "prologueReveal") {
        // Pada Prolog, konteks (eyebrow dan judul) adalah bagian dari Opening Screen awal (0,00)
        gsap.set(context, { opacity: 1, y: 0 });
      } else {
        gsap.set(context, { opacity: 0, y: MOTION.read.y });
        cues.push({
          at: 0.36,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(context, {
            opacity: 1,
            y: 0,
            duration: MOTION.read.duration * 0.9,
            ease: MOTION.read.ease,
          }),
        });
      }
    }

    /* ---------- nama ---------- */
    if (names.length > 0) {
      touched.push(...names);
      if (key === "nameEmerges") {
        /*
         * KADHIRI tiba sebagai peristiwa: huruf-huruf berangkat dari sebaran
         * lebar dan kedalaman (scale) lalu menempati kursinya — efek tracking
         * yang dibangun dari `x` per huruf, bukan dari letter-spacing. Ease
         * `settle` tanpa pantulan: nama historis mendarat, tidak melompat.
         */
        const nameSplit = SplitText.create(names, { type: "chars" });
        splits.push(nameSplit);
        const chars = nameSplit.chars;
        const middle = (chars.length - 1) / 2;
        chars.forEach((char, index) => {
          gsap.set(char, {
            opacity: 0,
            scale: 1.35,
            x: (index - middle) * 18,
            transformOrigin: "center",
          });
        });
        cues.push({
          at: 0.34,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(chars, {
            opacity: 1,
            scale: 1,
            x: 0,
            duration: MOTION.text.char.duration,
            stagger: { amount: 0.3, from: "center" },
            ease: EASES.settle,
          }),
        });
      } else {
        gsap.set(names, { opacity: 0 });
        cues.push({
          at: 0.34,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(names, {
            opacity: 1,
            duration: 0.6,
            ease: MOTION.read.ease,
          }),
        });
      }
    }

    /* ---------- kalimat pemikul ---------- */
    const masterTl = gsap.timeline({ paused: true });
    if (master.length > 0) {
      touched.push(...master);
      if (key === "prologueReveal") {
        // Kalimat pemikul Prolog tiba lewat entrance layar pertama (`intro`
        // di bawah), sebagai SATU blok — tidak dibelah, supaya teksnya tetap
        // satu node yang dapat dicari persis.
      } else {
        gsap.set(master, { opacity: 0 });
        masterTl.to(
          master,
          { opacity: 1, duration: 0.45, ease: EASES.fadeIn },
          0.05,
        );
        const splitType =
          style.masterSplit === "chars"
            ? "words,chars"
            : style.masterSplit === "words"
              ? "words"
              : "lines";
        const masterSplit = SplitText.create(master, { type: splitType });
        splits.push(masterSplit);
        const pieces =
          style.masterSplit === "chars"
            ? masterSplit.chars
            : style.masterSplit === "words"
              ? masterSplit.words
              : masterSplit.lines;
        applyFrom(pieces, style.master.from);
        masterTl.to(pieces, style.master.to, 0.1);
      }
    }
    if (key !== "prologueReveal" && masterTl.getChildren().length > 0) {
      cues.push({
        at: 0.42,
        played: false,
        timeline: masterTl,
      });
    }

    /* ---------- beat editorial ---------- */
    const isPrologue = key === "prologueReveal";
    if (isPrologue) {
      // Pada Prolog seluruh beat hadir bersama di layar pertama (tidak
      // bergiliran); opacity-nya dinaikkan entrance `intro` di bawah.
      beats.forEach((beat) => {
        touched.push(beat);
        gsap.set(beat, { visibility: "visible", xPercent: 0 });
      });
    } else if (beats.length > 0) {
      touched.push(...beats);
      applyFrom(beats, style.beats.from);
      cues.push({
        at: 0.5,
        played: false,
        timeline: gsap.timeline({ paused: true }).to(beats, {
          ...style.beats.to,
          stagger: {
            amount:
              identity === "politicalFracture" ||
              identity === "revolutionMachine"
                ? 0.2
                : STAGGERS.beatsAmount,
            from: "start",
          },
        }),
      });
    }

    /* ---------- layar pertama Prolog: babak NASKAH title sequence ---------- */
    if (isPrologue) {
      /*
       * Setelah citra (babak sinkron di atas) mulai muncul: eyebrow → judul
       * "KEDIRI, 2026" dari topeng baris → kalimat pemikul → beat → cue gulir.
       * Dibuat di sini karena SplitText butuh font final. Dimulai 0,55 s
       * setelah citra mulai — bila font tiba lebih lambat dari itu, naskah
       * langsung menyusul tanpa menunggu lagi.
       *
       * Tidak pernah memblokir: begitu progres gulir melewati INTRO_CANCEL,
       * `settleIntro` melompatkan kedua timeline ke akhir (bukan di-kill,
       * yang akan meninggalkan nilai setengah jalan). Cue negatif = tidak
       * pernah dipicu gulir; dibunuh di destroy() bersama cue lain.
       */
      const eyebrow = q(root, "eyebrow");
      const title = q(root, "title")[0];
      const scrollCue = root.querySelector<HTMLElement>(
        '[data-motion="scroll-cue"]',
      );
      const introText = gsap.timeline({
        paused: true,
        defaults: { ease: EASES.cine },
      });

      if (eyebrow.length > 0) {
        touched.push(...eyebrow);
        introText.fromTo(
          eyebrow,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: 0.7 },
          0,
        );
      }
      if (title) {
        touched.push(title);
        // Split dulu, tween `from` (immediateRender) menaruh baris di bawah
        // topeng, baru judulnya sendiri dinaikkan ke opacity 1.
        const titleSplit = SplitText.create(title, {
          type: "lines",
          mask: "lines",
        });
        splits.push(titleSplit);
        introText.from(
          titleSplit.lines,
          {
            yPercent: MOTION.text.line.travel,
            duration: MOTION.text.line.duration,
            stagger: MOTION.text.line.stagger,
          },
          0.2,
        );
        gsap.set(title, { opacity: 1 });
      }
      if (master.length > 0) {
        introText.fromTo(master, style.master.from, style.master.to, 0.7);
      }
      if (beats.length > 0) {
        introText.fromTo(
          beats,
          style.beats.from,
          { ...style.beats.to, stagger: { amount: 0.2 } },
          1.05,
        );
      }
      if (scrollCue) {
        introText.to(scrollCue, { opacity: 0.9, duration: 0.5 }, 1.35);
      }

      cues.push({ at: -1, played: true, timeline: introText });
      intro.push(introText);
      if (introDone || lastProgress > INTRO_CANCEL) {
        // Tautan dalam / restorasi gulir / sudah menggulir: keadaan akhir.
        settleIntro();
        introText.progress(1);
      } else {
        const elapsed = intro[0] === introText ? 0.55 : (intro[0]?.time() ?? 0);
        const wait = Math.max(0, 0.55 - elapsed);
        const start = gsap.delayedCall(wait, () => {
          if (!introDone) introText.play();
        });
        pendingCalls.push(start);
      }
    }

    onProgress(lastProgress);
  };

  // Baris SplitText hanya sah setelah font selesai dimuat; membelah lebih
  // awal membekukan pemenggalan baris yang salah.
  if (typeof document !== "undefined" && "fonts" in document) {
    document.fonts.ready.then(build).catch(build);
  } else {
    build();
  }

  /**
   * Menyembunyikan satu beat SECARA DETERMINISTIK: fade cepat wadahnya, lalu
   * visibility hidden dan timeline masuknya diputar balik seketika ke nol
   * (baris kembali ke bawah topeng). TIDAK PERNAH me-reverse timeline masuk
   * secara perlahan — reverse pelan membuat beat lama masih terbaca ketika
   * beat baru tiba, dan dua naskah tampil bertumpuk (terbukti pada tinjauan
   * Chief 2026-08-28, "teks dobel").
   */
  function hideBeat(index: number, instant: boolean): void {
    const beat = beats[index];
    const entrance = beatTimelines[index];
    if (!beat || !entrance) return;
    entrance.pause();
    fadeTweens[index]?.kill();
    if (instant) {
      fadeTweens[index] = null;
      gsap.set(beat, { opacity: 0, visibility: "hidden" });
      entrance.pause(0);
      return;
    }
    fadeTweens[index] = gsap.to(beat, {
      opacity: 0,
      duration: key === "prologueReveal" ? 0.45 : 0.2,
      ease: EASES.fadeOut,
      onComplete: () => {
        fadeTweens[index] = null;
        gsap.set(beat, { visibility: "hidden" });
        entrance.pause(0);
      },
    });
  }

  function directBeats(progress: number): void {
    if (beats.length === 0 || beatTimelines.length === 0) return;
    const thresholds = passageThresholds(key, beats.length);

    let target = -1;
    for (let index = thresholds.length - 1; index >= 0; index -= 1) {
      const threshold = thresholds[index];
      if (threshold !== undefined && progress >= threshold) {
        target = index;
        break;
      }
    }
    if (target === activeBeat) return;

    // SATU beat pada satu waktu — semua yang bukan target dipastikan pergi,
    // termasuk beat yang terlompati oleh gulir cepat atau tautan dalam.
    for (let index = 0; index < beats.length; index += 1) {
      if (index !== target && index !== activeBeat) hideBeat(index, true);
    }
    if (activeBeat >= 0) hideBeat(activeBeat, false);

    pendingEntrance?.kill();
    pendingEntrance = null;
    if (target >= 0) {
      const entering = beatTimelines[target];
      if (entering) {
        const isPrologueTransition =
          key === "prologueReveal" && activeBeat >= 0;
        pendingEntrance = gsap.delayedCall(
          isPrologueTransition ? 0.8 : 0.22,
          () => {
            pendingEntrance = null;
            fadeTweens[target]?.kill();
            fadeTweens[target] = null;
            entering.pause(0).timeScale(1).play();
          },
        );
        pendingCalls.push(pendingEntrance);
      }
    }
    activeBeat = target;
  }

  function onProgress(progress: number): void {
    if (destroyed) return;
    lastProgress = progress;
    for (const cue of cues) {
      // Cue negatif = intro berbasis waktu: tidak pernah dipicu oleh gulir.
      if (cue.at < 0) continue;
      if (!cue.played && progress >= cue.at) {
        cue.timeline.play();
        cue.played = true;
      } else if (cue.played && progress < cue.at - REVERSE_SLACK) {
        cue.timeline.reverse();
        cue.played = false;
      }
    }

    if (key === "prologueReveal") {
      // Gulir menang: entrance layar pertama dilompatkan ke keadaan akhir.
      if (progress > INTRO_CANCEL) settleIntro();
      // Sebelum babak naskah dibangun (menunggu fonts.ready) entrance belum
      // selesai: cue TETAP gelap — kalau tidak, update ScrollTrigger pertama
      // menyalakannya di detik 0, sebelum citra dan judulnya sendiri tiba.
      const introSettled =
        introDone ||
        (intro.length >= 2 &&
          intro.every((timeline) => timeline.progress() === 1));
      const scrollCue = root.querySelector<HTMLElement>(
        '[data-motion="scroll-cue"]',
      );
      if (scrollCue) {
        if (progress > 0.04) {
          gsap.to(scrollCue, { opacity: 0, duration: 0.25, overwrite: "auto" });
        } else if (progress <= 0.02 && introSettled) {
          // Dijaga `introSettled`: overwrite "auto" akan membunuh tween cue
          // milik entrance pada update ScrollTrigger pertama di progres 0.
          gsap.to(scrollCue, {
            opacity: 0.9,
            duration: 0.35,
            overwrite: "auto",
          });
        }
      }
    }
    directBeats(progress);
  }

  return {
    onProgress,
    destroy() {
      destroyed = true;
      for (const call of pendingCalls) call.kill();
      for (const tween of fadeTweens) tween?.kill();
      for (const tween of ambient) tween.kill();
      for (const cue of cues) cue.timeline.kill();
      for (const timeline of beatTimelines) timeline.kill();
      for (const split of splits) split.revert();
      if (touched.length > 0) gsap.set(touched, { clearProps: "all" });
    },
  };
}
