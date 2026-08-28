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
    key === "prologueReveal" || key === "inscriptionReveal"
      ? 0.56
      : key === "nameEmerges"
        ? 0.5
        : 0.54;
  const end =
    key === "inscriptionReveal" || key === "nameEndures" ? 0.74 : 0.82;
  return { start, end };
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
  const flavor = flavorFor(key);

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
            ease: MOTION.text.ease,
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
            ease: MOTION.text.ease,
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
            ease: MOTION.text.ease,
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
            ease: MOTION.text.ease,
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
        yPercent: 55,
        rotateX: -55,
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
      const masterSplit = SplitText.create(master, {
        type: "lines",
        mask: "lines",
      });
      splits.push(masterSplit);
      gsap.set(masterSplit.lines, { yPercent: MOTION.text.line.travel });
      masterTl.to(
        masterSplit.lines,
        {
          yPercent: 0,
          duration: MOTION.text.line.duration,
          stagger: MOTION.text.line.stagger,
          ease: MOTION.text.ease,
        },
        0.1,
      );
    }
    if (masterTl.getChildren().length > 0) {
      cues.push({ at: 0.42, played: false, timeline: masterTl });
    }

    /* ---------- beat editorial ---------- */
    const still = beatStyle(key) === "still";
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
        { opacity: 1, xPercent: 0, duration: 0.5, ease: MOTION.text.ease },
        0,
      );
      if (still) {
        // Research Hold: menjadi ada tanpa perpindahan.
      } else {
        const lineSplit = SplitText.create(beat.querySelectorAll("p"), {
          type: "lines",
          mask: "lines",
        });
        splits.push(lineSplit);
        gsap.set(lineSplit.lines, { yPercent: MOTION.text.line.travel });
        timeline.to(
          lineSplit.lines,
          {
            yPercent: 0,
            duration: MOTION.text.line.duration,
            stagger: MOTION.text.line.stagger,
            ease: MOTION.text.ease,
          },
          0.05,
        );
      }
      beatTimelines.push(timeline);
    });

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
      duration: 0.2,
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
    const { start, end } = passageWindow(key);
    const slot = (end - start) / beats.length;

    let target = -1;
    if (progress >= start) {
      target = Math.min(
        beats.length - 1,
        Math.floor((progress - start) / slot),
      );
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
        pendingEntrance = gsap.delayedCall(0.22, () => {
          pendingEntrance = null;
          fadeTweens[target]?.kill();
          fadeTweens[target] = null;
          entering.pause(0).timeScale(1).play();
        });
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
      for (const call of pendingCalls) call.kill();
      for (const tween of fadeTweens) tween?.kill();
      for (const cue of cues) cue.timeline.kill();
      for (const timeline of beatTimelines) timeline.kill();
      for (const split of splits) split.revert();
      if (touched.length > 0) gsap.set(touched, { clearProps: "all" });
    },
  };
}
