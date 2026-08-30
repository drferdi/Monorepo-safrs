import { gsap, MOTION, SplitText } from "./gsap";

/**
 * Sutradara naskah — Jam 2 dari model dua-jam.
 *
 * Kamera (Jam 1) tetap di-scrub linear oleh ScrollTrigger di `scenes.ts`.
 * Berkas ini memegang jam yang satunya: tarikh, kalimat pemikul, nama, dan
 * beat editorial DI-TRIGGER pada ambang progres shot, lalu bermain di jamnya
 * sendiri dengan ease ekspresif ("cine"). Inilah perbedaan struktural antara
 * "gambar yang ditarik-tarik" dan situs referensi (bombon.rs,
 * jasminadenner.com): di sana naskah tidak pernah menumpang jam kamera.
 *
 * Aturan yang tetap mengikat:
 *   - Tidak ada teks yang dibuat di sini; seluruh sejarah sudah dirender
 *     server. SplitText membelah untuk topeng baris, dan aria bawaannya
 *     ("auto") menjaga naskah utuh bagi pembaca layar: induk menerima
 *     aria-label penuh, potongan menerima aria-hidden.
 *   - Tidak pernah autoAlpha / visibility:hidden pada naskah historis,
 *     KECUALI beat yang bergiliran — dan varian mobile/reduced/tanpa-JS
 *     tidak pernah melewati jalur ini (CSS menumpuknya statis).
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
    key === "prologueReveal" ? 0.48 : key === "nameEmerges" ? 0.5 : 0.54;
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
  if (key === "prologueReveal" && count === 2) return [0.48, 0.7];
  const { start, end } = passageWindow(key);
  const slot = (end - start) / count;
  return Array.from({ length: count }, (_, index) => start + slot * index);
}

/**
 * Gaya beat per koreografi. nameEndures berstatus Research Hold: naskahnya
 * hadir tanpa perjalanan dekoratif — keheningan adalah argumennya.
 */
function beatStyle(key: string): "still" | "lines" {
  return key === "nameEndures" ? "still" : "lines";
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
  // 2024–2026: satu garis memanjang ke cakrawala, dari kiri.
  runwayTransition: { beatX: -9, unitAxis: "x", unitDir: -1 },
};

function flavorFor(key: string): SceneFlavor {
  return FLAVORS[key] ?? DEFAULT_FLAVOR;
}

const q = (root: HTMLElement, name: string) =>
  Array.from(root.querySelectorAll<HTMLElement>(`[data-motion="${name}"]`));

interface Cue {
  readonly at: number;
  readonly timeline: gsap.core.Timeline;
  played: boolean;
}

/** Histeresis pembalikan supaya ambang tidak bergetar di tepi. */
const REVERSE_SLACK = 0.05;

/**
 * Intro hanya milik entry Journey baru di puncak dokumen. Hash landing dan
 * scroll restoration harus tetap berada pada keadaan baca server-rendered.
 */
function isPrologueIntroEligible(): boolean {
  return (
    typeof window !== "undefined" &&
    window.location.hash === "" &&
    window.scrollY <= 0
  );
}

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
  let beats: HTMLElement[] = [];
  let activeBeat = -1;
  const touched: HTMLElement[] = [];
  const fadeTweens: (gsap.core.Tween | null)[] = [];
  let pendingEntrance: gsap.core.Tween | null = null;
  let introTimeline: gsap.core.Timeline | null = null;
  const flavor = flavorFor(key);

  /*
   * INTRO PROLOG (direktif Chief 2026-08-28): halaman pertama GELAP 2 detik,
   * lalu video mulai berputar, lalu cahaya membukanya — sementara seluruh
   * koreografi gulir tetap berjalan seperti biasa. Ini cue berbasis WAKTU,
   * bukan gulir, jadi ia hidup di Jam 2 dan dipasang SINKRON (tidak menunggu
   * font) supaya kegelapannya menutup sedini mungkin setelah hidrasi.
   */
  if (key === "prologueReveal") {
    const surface = root.querySelector<HTMLElement>(".prologue-surface");
    const credit = root.querySelector<HTMLElement>(".prologue-credit");
    const titleCard = root.querySelector<HTMLElement>(".prologue-title-card");
    if (!isPrologueIntroEligible()) {
      document.documentElement.removeAttribute("data-intro");
      const overlays = [credit, titleCard].filter(
        (element): element is HTMLElement => element !== null,
      );
      if (overlays.length > 0) {
        touched.push(...overlays);
        gsap.set(overlays, { opacity: 0 });
      }
    } else if (surface) {
      touched.push(surface);
      const video = surface.querySelector<HTMLVideoElement>("video");
      gsap.set(surface, { opacity: 0, "--lit": 0 });
      video?.pause();
      /*
       * Serah terima dari gerbang boot (skrip sinkron journey/page.tsx):
       * pelat naskah ikut dipegang dulu — build() akan melepasnya setelah
       * seluruh keadaan awal anak-anaknya terpasang — lalu atribut boot
       * dilepas karena GSAP kini memegang kendali penuh.
       */
      const plate = root.querySelector<HTMLElement>(".prologue-plate");
      if (plate) {
        touched.push(plate);
        gsap.set(plate, { opacity: 0 });
      }
      document.documentElement.removeAttribute("data-intro");
      // Posisi absolut di satu timeline: t=0 gelap; t=2 video mulai + cahaya
      // membuka; t=5 (tiga detik SETELAH video mulai, koreksi Chief
      // 2026-08-28) kredit hadir di atas footage, menahan, lalu pamit.
      introTimeline = gsap.timeline();
      if (credit) {
        touched.push(credit);
        const logo = credit.querySelector<HTMLElement>('[data-credit="logo"]');
        const vline = credit.querySelector<HTMLElement>(
          '[data-credit="vline"]',
        );
        const hline = credit.querySelector<HTMLElement>(
          '[data-credit="hline"]',
        );
        const lines = Array.from(
          credit.querySelectorAll<HTMLElement>('[data-credit="line"]'),
        );
        // "chars,words": wrapper kata menjaga spasi antar-kata tetap terbaca
        // di bawah letter-spacing lebar; yang dianimasikan tetap hurufnya.
        const creditSplit = SplitText.create(lines, { type: "chars,words" });
        splits.push(creditSplit);
        gsap.set(credit, { opacity: 1 });

        // Lockup terakit dari logikanya sendiri: tanda → garis turun →
        // bidang → nama. Tiga detik setelah video mulai (t=5).
        const AT = 5;
        if (logo) {
          introTimeline.fromTo(
            logo,
            { opacity: 0, scale: 0.86, yPercent: 12 },
            {
              opacity: 1,
              scale: 1,
              yPercent: 0,
              duration: 0.9,
              ease: MOTION.text.ease,
            },
            AT,
          );
        }
        if (vline) {
          introTimeline.fromTo(
            vline,
            { scaleY: 0 },
            { scaleY: 1, duration: 0.5, ease: "power2.out" },
            AT + 0.35,
          );
        }
        if (hline) {
          introTimeline.fromTo(
            hline,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: MOTION.text.ease },
            AT + 0.55,
          );
        }
        introTimeline.fromTo(
          creditSplit.chars,
          { opacity: 0, yPercent: 60, filter: "blur(6px)" },
          {
            opacity: 1,
            yPercent: 0,
            filter: "blur(0px)",
            duration: 1,
            stagger: { each: 0.016, from: "center" },
            ease: MOTION.text.ease,
          },
          AT + 0.7,
        );
        // Menahan cukup lama untuk terbaca, lalu pergi satu tarikan napas.
        introTimeline.to(
          credit,
          { opacity: 0, yPercent: -12, duration: 0.8, ease: "power2.in" },
          AT + 4,
        );
      }

      /*
       * Kartu judul resmi menyusul kredit: "KEDIRI — A Century of History,
       * Kings, and Industry". Nama besar naik per-huruf, garis emas
       * menggambar diri, subjudul mengalir dari tengah; menahan, lalu pamit
       * sebelum koreografi gulir memimpin.
       */
      const titleCard = root.querySelector<HTMLElement>(".prologue-title-card");
      if (titleCard) {
        touched.push(titleCard);
        const name = titleCard.querySelector<HTMLElement>(
          '[data-title-card="name"]',
        );
        const rule = titleCard.querySelector<HTMLElement>(
          '[data-title-card="rule"]',
        );
        const sub = titleCard.querySelector<HTMLElement>(
          '[data-title-card="sub"]',
        );
        const TITLE_AT = 10;
        gsap.set(titleCard, { opacity: 1 });
        if (name) {
          const nameSplit = SplitText.create(name, {
            type: "chars",
            mask: "chars",
          });
          splits.push(nameSplit);
          introTimeline.fromTo(
            nameSplit.chars,
            { yPercent: 110, rotateX: -40, transformOrigin: "50% 100% -30px" },
            {
              yPercent: 0,
              rotateX: 0,
              duration: 1.1,
              stagger: 0.05,
              ease: MOTION.text.ease,
            },
            TITLE_AT,
          );
        }
        if (rule) {
          introTimeline.fromTo(
            rule,
            { scaleX: 0 },
            { scaleX: 1, duration: 0.8, ease: MOTION.text.ease },
            TITLE_AT + 0.55,
          );
        }
        if (sub) {
          const subSplit = SplitText.create(sub, { type: "chars,words" });
          splits.push(subSplit);
          introTimeline.fromTo(
            subSplit.chars,
            { opacity: 0, yPercent: 50, filter: "blur(5px)" },
            {
              opacity: 1,
              yPercent: 0,
              filter: "blur(0px)",
              duration: 0.9,
              stagger: { each: 0.012, from: "center" },
              ease: MOTION.text.ease,
            },
            TITLE_AT + 0.75,
          );
        }
        introTimeline.to(
          titleCard,
          { opacity: 0, yPercent: -10, duration: 0.9, ease: "power2.in" },
          TITLE_AT + 4.6,
        );
      }
      introTimeline.call(
        () => {
          // Muted + playsinline: play() dari timeline selalu diizinkan; bila
          // browser tetap menolak, poster diam adalah fallback yang sah.
          video?.play().catch(() => undefined);
        },
        undefined,
        2,
      );
      introTimeline.to(
        surface,
        { opacity: 1, duration: 0.9, ease: "power1.inOut" },
        2,
      );
      // Cahaya membuka bingkai lewat mask --lit yang sama dengan scene lain:
      // videonya tidak sekadar muncul — ia disingkap.
      introTimeline.to(
        surface,
        { "--lit": 1, duration: 1.6, ease: MOTION.text.ease },
        2.15,
      );
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
        // Keberadaan sebelum presisi: TAHUN lebih dulu (unit terakhir).
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
        // Konsolidasi ADALAH argumennya: potongan tarikh menyatu dari dua sisi.
        gsap.set(units, {
          opacity: 0,
          xPercent: (index: number) => (index % 2 === 0 ? -14 : 14),
        });
        cues.push({
          at: 0.3,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(units, {
            opacity: 1,
            xPercent: 0,
            duration: 0.9,
            stagger: MOTION.text.unit.stagger,
            ease: MOTION.read.ease,
          }),
        });
      } else {
        // Sumbu dan arah kedatangan tarikh mengikuti rasa scene-nya.
        const from =
          flavor.unitAxis === "x"
            ? { opacity: 0, xPercent: 10 * flavor.unitDir }
            : { opacity: 0, yPercent: 14 * flavor.unitDir };
        gsap.set(units, from);
        cues.push({
          at: 0.28,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(units, {
            opacity: 1,
            xPercent: 0,
            yPercent: 0,
            duration: MOTION.text.unit.duration,
            stagger: MOTION.text.unit.stagger,
            ease: MOTION.read.ease,
          }),
        });
      }
    }

    /* ---------- nama (921: namanya adalah peristiwanya) ---------- */
    if (key === "nameEmerges" && names.length > 0) {
      const nameSplit = SplitText.create(names, { type: "chars" });
      splits.push(nameSplit);
      gsap.set(nameSplit.chars, {
        opacity: 0,
        yPercent: 24,
        rotateX: -20,
        transformOrigin: "50% 100% -40px",
      });
      cues.push({
        at: 0.34,
        played: false,
        timeline: gsap.timeline({ paused: true }).to(nameSplit.chars, {
          opacity: 1,
          yPercent: 0,
          rotateX: 0,
          duration: MOTION.text.char.duration,
          stagger: { each: MOTION.text.char.stagger, from: "center" },
          ease: MOTION.text.ease,
        }),
      });
    }

    /* ---------- kalimat pemikul + konteks ---------- */
    const masterTl = gsap.timeline({ paused: true });
    if (context.length > 0) {
      touched.push(...context);
      gsap.set(context, { opacity: 0 });
      masterTl.to(
        context,
        { opacity: 1, duration: 0.5, ease: "power1.out" },
        0,
      );
    }
    if (master.length > 0) {
      /*
       * Kontainer master ikut dipudarkan, bukan hanya barisnya. Topeng
       * SplitText menyembunyikan TEKS, tetapi dekorasi kontainer (mis.
       * border-left emas .prologue-lead / .master-line beberapa scene) tetap
       * tercat — meninggalkan satu garis vertikal yatim di atas citra
       * (temuan Chief 2026-08-28). Opacity, bukan visibility: naskah tidak
       * pernah keluar dari pohon aksesibilitas.
       */
      touched.push(...master);
      gsap.set(master, { opacity: 0 });
      masterTl.to(
        master,
        { opacity: 1, duration: 0.45, ease: "power1.out" },
        0.05,
      );
      // Register BACA (direktif editorial 2026-08-29): offset 16px + fade,
      // per baris, tanpa topeng perjalanan besar.
      const masterSplit = SplitText.create(master, { type: "lines" });
      splits.push(masterSplit);
      gsap.set(masterSplit.lines, { opacity: 0, y: MOTION.read.y });
      masterTl.to(
        masterSplit.lines,
        {
          opacity: 1,
          y: 0,
          duration: MOTION.read.duration,
          stagger: MOTION.read.stagger,
          ease: MOTION.read.ease,
        },
        0.1,
      );
    }
    if (masterTl.getChildren().length > 0) {
      cues.push({ at: 0.42, played: false, timeline: masterTl });
    }

    /*
     * ---------- beat editorial ----------
     * 879 (inscriptionReveal) DAN 921 (nameEmerges) DIKECUALIKAN dari giliran
     * satu-per-satu (revisi Chief 2026-08-30): jendela scroll lebar sekalipun
     * tidak menjamin `pendingEntrance` (delayedCall di bawah) sempat memutar
     * sebelum beat berikutnya jadi target dan membatalkannya — pengunjung
     * melaporkan kalimat "hilang" walau sudah scroll pelan di 879; 921 kini
     * juga naik dari 3 jadi 7 beat (paragraf brief lebih banyak), jendela per
     * beat-nya ikut menyempit ke risiko yang sama. Beats-nya dibiarkan TIDAK
     * disentuh sama sekali di sini: tetap pada keadaan baca server-rendered
     * (CSS `.stage-beat` scene-scoped memaksanya alur statis, semua tampak
     * sekaligus, tidak pernah ada yang kelewat). `directBeats()` otomatis
     * no-op karena `beatTimelines` kosong.
     */
    const still = beatStyle(key) === "still";
    const skipBeatCycle = key === "inscriptionReveal" || key === "nameEmerges";
    if (skipBeatCycle && beats.length > 0) {
      /*
       * 879 dan 921 tetap dapat gerak GSAP (revisi Chief 2026-08-30), tetapi
       * bukan cycling satu-per-satu yang terbukti buggy (delayedCall
       * `pendingEntrance` dibatalkan sebelum sempat mutar). Di sini SATU
       * cue sederhana: seluruh beat fade+naik BERSAMAAN dengan stagger,
       * lalu TIDAK PERNAH disembunyikan lagi — sama persis pola context/
       * master di atas yang sudah terbukti stabil, tidak seperti mesin
       * hide/show per-beat.
       */
      touched.push(...beats);
      gsap.set(beats, { opacity: 0, y: MOTION.read.y });
      cues.push({
        at: 0.5,
        played: false,
        timeline: gsap.timeline({ paused: true }).to(beats, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          /*
           * `amount` (total rentang tetap), BUKAN `each` (per-item) — 921
           * punya 7 beat vs 879 punya 5; `each` tetap membuat rentang
           * TOTAL membengkak seiring jumlah beat (7 item × stagger 0.15 =
           * hampir 1.9 detik, melewati tahanan-settle situs 1.2 detik,
           * terbukti pada e2e "early secondary beats" — beat terakhir
           * baru opacity 0.657 saat sampel diambil). `amount` menjaga
           * rentang tetap ~0.4 detik berapa pun jumlah beatnya.
           */
          stagger: { amount: 0.4, from: "start" },
          ease: MOTION.read.ease,
        }),
      });
    }
    if (!skipBeatCycle)
      beats.forEach((beat, index) => {
        touched.push(beat);
        // Hanyut horizontal per rasa scene; tanda berganti bila berdialog.
        const drift = flavor.alternate
          ? flavor.beatX * (index % 2 === 0 ? 1 : -1)
          : flavor.beatX;
        gsap.set(beat, { visibility: "hidden", opacity: 0, xPercent: drift });
        const timeline = gsap.timeline({ paused: true });
        timeline.set(beat, { visibility: "visible" }, 0);
        timeline.to(
          beat,
          { opacity: 1, xPercent: 0, duration: 0.6, ease: MOTION.read.ease },
          0,
        );
        if (still) {
          // Research Hold: menjadi ada tanpa perpindahan.
        } else {
          const lineSplit = SplitText.create(beat.querySelectorAll("p"), {
            type: "lines",
          });
          splits.push(lineSplit);
          gsap.set(lineSplit.lines, { opacity: 0, y: MOTION.read.y });
          timeline.to(
            lineSplit.lines,
            {
              opacity: 1,
              y: 0,
              duration: MOTION.read.duration,
              stagger: MOTION.read.stagger,
              ease: MOTION.read.ease,
            },
            0.05,
          );
        }
        beatTimelines.push(timeline);
      });

    // Pelat prolog dilepas dari pegangan boot HANYA setelah seluruh keadaan
    // awal anak-anaknya (master, beat, konteks) terpasang di atas.
    if (key === "prologueReveal") {
      const plate = root.querySelector<HTMLElement>(".prologue-plate");
      if (plate) gsap.set(plate, { opacity: 1 });
    }

    // Kedatangan tertunda (deep-link mendarat di tengah shot): mainkan cue
    // yang ambangnya sudah terlewati, langsung dari keadaan sekarang.
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
      ease: "power1.in",
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
      if (!cue.played && progress >= cue.at) {
        cue.timeline.play();
        cue.played = true;
      } else if (cue.played && progress < cue.at - REVERSE_SLACK) {
        cue.timeline.reverse();
        cue.played = false;
      }
    }
    directBeats(progress);
  }

  return {
    onProgress,
    destroy() {
      destroyed = true;
      introTimeline?.kill();
      for (const call of pendingCalls) call.kill();
      for (const tween of fadeTweens) tween?.kill();
      for (const cue of cues) cue.timeline.kill();
      for (const timeline of beatTimelines) timeline.kill();
      for (const split of splits) split.revert();
      if (touched.length > 0) gsap.set(touched, { clearProps: "all" });
    },
  };
}
