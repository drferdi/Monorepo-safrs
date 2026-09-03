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

interface TextEntranceStyle {
  readonly initial: gsap.TweenVars | ((index: number) => gsap.TweenVars);
  readonly tween: gsap.TweenVars;
}

function textEntranceProps(key: string): TextEntranceStyle {
  switch (key) {
    case "prologueReveal":
      return {
        initial: { opacity: 0, y: 20, filter: "blur(4px)" },
        tween: {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.85,
          ease: "power2.out",
          stagger: 0.08,
        },
      };
    case "inscriptionReveal":
      return {
        initial: { opacity: 0, x: -22, y: 4 },
        tween: {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.07,
        },
      };
    case "nameEmerges":
      return {
        initial: { opacity: 0, y: 28, scale: 0.96 },
        tween: {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.8,
          ease: "back.out(1.15)",
          stagger: 0.08,
        },
      };
    case "nameEndures":
      return {
        initial: { opacity: 0, x: -16, y: 8 },
        tween: {
          opacity: 1,
          x: 0,
          y: 0,
          duration: 0.7,
          ease: "power2.out",
          stagger: 0.06,
        },
      };
    case "dividedKingdom":
      return {
        initial: (index: number) => ({
          opacity: 0,
          x: index % 2 === 0 ? -28 : 28,
        }),
        tween: {
          opacity: 1,
          x: 0,
          duration: 0.75,
          ease: "power3.out",
          stagger: 0.08,
        },
      };
    case "dahaLiving":
      return {
        initial: { opacity: 0, y: 14 },
        tween: {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "sine.out",
          stagger: 0.1,
        },
      };
    default:
      return {
        initial: { opacity: 0, y: MOTION.read.y },
        tween: {
          opacity: 1,
          y: 0,
          duration: MOTION.read.duration,
          ease: MOTION.read.ease,
          stagger: MOTION.read.stagger,
        },
      };
  }
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

  if (key === "prologueReveal") {
    const opening = root.querySelector<HTMLElement>(".prologue-opening");
    const surface = root.querySelector<HTMLElement>(".prologue-surface");
    const copy = opening?.querySelector<HTMLElement>(".prologue-opening-copy");

    if (opening && surface) {
      touched.push(opening, surface);
      const introTl = gsap.timeline();

      if (copy) {
        // Tipografi gerak modern: kata-kata terkuak secara kinetik dari kabut atmosferik
        const split = SplitText.create(copy, { type: "words,lines" });
        splits.push(split);
        gsap.set(opening, { opacity: 1 });
        gsap.set(split.words, {
          opacity: 0,
          y: 28,
          scale: 0.96,
          filter: "blur(8px)",
        });

        introTl
          .to(
            split.words,
            {
              opacity: 1,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
              duration: 1.1,
              stagger: { each: 0.04, from: "start" },
              ease: "power3.out",
            },
            0.4,
          )
          // Tahanan baca hening yang berwibawa
          .to(
            split.words,
            {
              opacity: 0,
              y: -18,
              filter: "blur(6px)",
              duration: 0.7,
              stagger: { each: 0.015, from: "start" },
              ease: "power2.inOut",
            },
            3.6,
          )
          // Putar video tepat saat permukaan terbuka agar video ditonton utuh dari detik 00:00
          .call(
            () => {
              window.dispatchEvent(new Event("kediri:prologue-video-start"));
            },
            undefined,
            4.0,
          )
          // Masuk video sungai Brantas secara perlahan dan megah setelah teks bersih
          .to(
            surface,
            {
              opacity: 1,
              "--lit": 1,
              duration: 1.4,
              ease: "power2.inOut",
            },
            4.0,
          );
      } else {
        gsap.set(opening, { opacity: 0, y: MOTION.read.y });
        introTl
          .to(
            opening,
            { opacity: 1, y: 0, duration: 0.8, ease: "power3.out" },
            0.4,
          )
          .to(opening, { opacity: 0, duration: 0.6, ease: "power2.inOut" }, 4.2)
          .to(
            surface,
            { opacity: 1, "--lit": 1, duration: 1.5, ease: "power2.inOut" },
            4.0,
          );
      }

      const scrollCue = root.querySelector<HTMLElement>(
        '[data-motion="scroll-cue"]',
      );
      if (scrollCue) {
        touched.push(scrollCue);
        gsap.set(scrollCue, { opacity: 0, y: 12 });
        introTl.to(
          scrollCue,
          {
            opacity: 0.9,
            y: 0,
            duration: 0.8,
            ease: "power2.out",
          },
          4.8,
        );
        const icon = scrollCue.querySelector(".scroll-cue-icon");
        if (icon) {
          gsap.to(icon, {
            y: 5,
            duration: 1.1,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        }
      }
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
            ease: MOTION.read.ease,
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
            ease: MOTION.read.ease,
          }),
        });
      }
    }

    /* ---------- konteks ---------- */
    if (context.length > 0) {
      touched.push(...context);
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

    /* ---------- nama ---------- */
    if (names.length > 0) {
      touched.push(...names);
      if (key === "nameEmerges") {
        const nameSplit = SplitText.create(names, { type: "chars" });
        splits.push(nameSplit);
        gsap.set(nameSplit.chars, { opacity: 0, scale: 0.75, y: 12 });
        cues.push({
          at: 0.34,
          played: false,
          timeline: gsap.timeline({ paused: true }).to(nameSplit.chars, {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: MOTION.text.char.duration,
            stagger: MOTION.text.char.stagger,
            ease: MOTION.read.ease,
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
      gsap.set(master, { opacity: 0 });
      masterTl.to(
        master,
        { opacity: 1, duration: 0.45, ease: "power1.out" },
        0.05,
      );
      const masterSplit = SplitText.create(master, { type: "lines" });
      splits.push(masterSplit);
      const entrance = textEntranceProps(key);
      if (typeof entrance.initial === "function") {
        masterSplit.lines.forEach((line, idx) => {
          gsap.set(
            line,
            (entrance.initial as (i: number) => gsap.TweenVars)(idx),
          );
        });
      } else {
        gsap.set(masterSplit.lines, entrance.initial);
      }
      masterTl.to(masterSplit.lines, entrance.tween, 0.1);
    }
    if (masterTl.getChildren().length > 0) {
      cues.push({ at: 0.42, played: false, timeline: masterTl });
    }

    /* ---------- beat editorial ---------- */
    const still = beatStyle(key) === "still";
    const skipBeatCycle = key !== "prologueReveal";
    if (skipBeatCycle && beats.length > 0) {
      touched.push(...beats);
      const entrance = textEntranceProps(key);
      if (typeof entrance.initial === "function") {
        beats.forEach((beat, idx) => {
          gsap.set(
            beat,
            (entrance.initial as (i: number) => gsap.TweenVars)(idx),
          );
        });
      } else {
        gsap.set(beats, entrance.initial);
      }
      cues.push({
        at: 0.5,
        played: false,
        timeline: gsap.timeline({ paused: true }).to(beats, {
          ...entrance.tween,
          stagger: { amount: 0.4, from: "start" },
        }),
      });
    }
    if (!skipBeatCycle)
      beats.forEach((beat, index) => {
        touched.push(beat);
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
          // Research Hold
        } else {
          const lineSplit = SplitText.create(beat.querySelectorAll("p"), {
            type: "lines",
          });
          splits.push(lineSplit);
          if (key === "prologueReveal") {
            gsap.set(lineSplit.lines, {
              opacity: 0,
              y: 18,
              filter: "blur(4px)",
            });
            timeline.to(
              lineSplit.lines,
              {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.8,
                ease: "power2.out",
                stagger: 0.08,
              },
              0.05,
            );
          } else {
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
        }
        beatTimelines.push(timeline);
      });

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

    if (key === "prologueReveal") {
      const scrollCue = root.querySelector<HTMLElement>(
        '[data-motion="scroll-cue"]',
      );
      if (scrollCue) {
        if (progress > 0.04) {
          gsap.to(scrollCue, { opacity: 0, duration: 0.25, overwrite: "auto" });
        } else if (progress <= 0.02) {
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
      for (const cue of cues) cue.timeline.kill();
      for (const timeline of beatTimelines) timeline.kill();
      for (const split of splits) split.revert();
      if (touched.length > 0) gsap.set(touched, { clearProps: "all" });
    },
  };
}
