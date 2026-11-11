import React, { useCallback, useEffect, useRef, useState } from 'react';
import IntelligenceVisual from './IntelligenceVisual.jsx';
import IntroLockup from './IntroLockup.jsx';
import SentraBrand from './SentraBrand.jsx';
import StatusIndicator from './StatusIndicator.jsx';
import LoginForm from './LoginForm.jsx';
import AccessNotice from './AccessNotice.jsx';

const ACCENTS = [
  { id: 'clinical', label: 'Brief' },
  { id: 'sentra', label: 'Sentra' },
];

/**
 * Opening sequence (milliseconds), kept in step with INTRO in visual/engine.js:
 *   logo   lines sweep in and draw the lockup
 *   field  lockup fades, lines release into the full-screen field
 *   split  field moves left, sign-in column opens on the right
 *   ready  resting state
 */
const LOGO_OUT_AT = 3700;
const SPLIT_AT = 5400;
const SPLIT_MS = 1150;
const INTRO_SEEN_KEY = 'sentra-smartboard-intro-seen';

function wantsIntro(mode) {
  if (mode === 'never' || typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  if (mode === 'always') return true;
  try {
    return !window.sessionStorage.getItem(INTRO_SEEN_KEY);
  } catch {
    return true;
  }
}

/** Design-review only: accent palette switch and intro replay. Not part of the product UI. */
function ReviewControls({ accent, onAccent, onReplay }) {
  const chip =
    'rounded-full px-2.5 py-1 tracking-[0.14em] uppercase outline-none transition-colors duration-200 hover:text-white focus-visible:ring-2 focus-visible:ring-glow';
  return (
    <div
      role="group"
      aria-label="Design review controls"
      className="hidden animate-rise items-center gap-1 rounded-full border border-white/15 bg-ink-950/60 p-1 font-mono text-[10px] tracking-[0.14em] text-white/60 uppercase backdrop-blur-sm md:flex"
    >
      <span className="px-2">Palette</span>
      {ACCENTS.map((item) => (
        <button
          key={item.id}
          type="button"
          aria-pressed={accent === item.id}
          onClick={() => onAccent(item.id)}
          className={`${chip} aria-pressed:bg-white aria-pressed:text-ink-950`}
        >
          {item.label}
        </button>
      ))}
      <span aria-hidden="true" className="mx-1 h-3 w-px bg-white/20" />
      <button type="button" onClick={onReplay} className={chip}>
        Replay intro
      </button>
    </div>
  );
}

/**
 * Full-screen sign-in: intelligence field on the left, authentication on the right,
 * preceded by an optional opening sequence.
 *
 * intro: 'session' (once per browser session, default) | 'always' | 'never'
 * Authentication is injected through onSignIn / onMicrosoftSignIn (see src/lib/auth.js).
 */
export default function LoginPage({
  onSignIn,
  onMicrosoftSignIn,
  onForgotPassword,
  accent: initialAccent = 'clinical',
  intro = 'session',
  visualRenderer = 'auto',
  reviewControls = false,
}) {
  const [accent, setAccent] = useState(initialAccent);
  const [phase, setPhase] = useState(() => (wantsIntro(intro) ? 'logo' : 'ready'));
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const introPlayed = useRef(phase === 'logo');
  const timers = useRef([]);

  const docked = phase === 'split' || phase === 'ready';
  const inIntro = !docked;

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
  }, [accent]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // Drives the opening sequence for the current run.
  useEffect(() => {
    if (!introPlayed.current) return undefined;
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, '1');
    } catch {
      /* storage unavailable: the intro simply plays again next time */
    }
    timers.current = [
      setTimeout(() => setPhase('field'), LOGO_OUT_AT),
      setTimeout(() => setPhase('split'), SPLIT_AT),
      setTimeout(() => setPhase('ready'), SPLIT_AT + SPLIT_MS),
    ];
    return clearTimers;
  }, [run]);

  const skip = useCallback(() => {
    clearTimers();
    setSkipped(true);
    setPhase('split');
    timers.current = [setTimeout(() => setPhase('ready'), SPLIT_MS)];
  }, []);

  const replay = () => {
    clearTimers();
    introPlayed.current = true;
    setSkipped(false);
    setPhase('logo');
    setRun((n) => n + 1);
  };

  // Any key skips the opening.
  useEffect(() => {
    if (!inIntro) return undefined;
    const onKey = (event) => {
      if (['Escape', 'Enter', ' ', 'Tab'].includes(event.key)) {
        event.preventDefault();
        skip();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inIntro, skip]);

  // After the opening, put the cursor where work starts (pointer devices only).
  useEffect(() => {
    if (phase !== 'ready' || !introPlayed.current) return;
    if (window.matchMedia('(pointer: fine)').matches) {
      document.getElementById('email')?.focus({ preventScroll: true });
    }
  }, [phase]);

  // Content entrances wait for the split to settle when the opening has played.
  const base = introPlayed.current ? 750 : 120;
  const stagger = (index) => ({ animationDelay: `${base + index * 90}ms` });

  return (
    <div
      className={`flex flex-col bg-paper font-sans text-ink antialiased md:h-full md:flex-row md:overflow-hidden ${
        inIntro ? 'h-full overflow-hidden' : 'min-h-full'
      }`}
    >
      {/* Intelligence field */}
      <section
        aria-label="Sentra Medical Smartboard"
        onClick={inIntro ? skip : undefined}
        className={`relative isolate shrink-0 overflow-hidden bg-ink-950 text-white transition-[height] duration-[1150ms] ease-calm md:h-auto md:min-w-0 md:flex-1 md:shrink ${
          docked ? 'h-56' : 'h-[100dvh]'
        }`}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 78% 18%, var(--stage-a) 0%, transparent 62%), linear-gradient(180deg, var(--stage-b), var(--stage-b))',
          }}
        />
        <IntelligenceVisual
          key={run}
          palette={accent}
          playIntro={introPlayed.current && phase === 'logo'}
          skipIntro={skipped}
          renderer={visualRenderer}
          className={introPlayed.current ? '' : 'animate-rise'}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_42%,rgb(2_4_9/0.6)_100%)]"
        />

        {inIntro && (
          <>
            <IntroLockup key={`lockup-${run}`} leaving={phase !== 'logo'} />
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                skip();
              }}
              className="intro-fade absolute right-6 bottom-6 rounded-full border border-white/20 px-4 py-2 font-mono text-[10.5px] tracking-[0.18em] text-white/70 uppercase outline-none transition-colors duration-200 hover:border-white/50 hover:text-white focus-visible:ring-2 focus-visible:ring-glow md:right-10 md:bottom-10"
              style={{ animationDelay: '600ms' }}
            >
              Skip intro
            </button>
          </>
        )}

        {docked && (
          <>
            {/* Keeps the text corners legible without boxing them in */}
            <div
              aria-hidden="true"
              className="intro-fade absolute inset-0 bg-[radial-gradient(85%_62%_at_0%_100%,rgb(3_5_10/0.94)_18%,transparent_72%),radial-gradient(52%_32%_at_0%_0%,rgb(3_5_10/0.8),transparent_72%)]"
              style={{ animationDelay: `${base - 100}ms` }}
            />
            {/* Ruled seam: fine instrument ticks where the field meets the form */}
            <div aria-hidden="true" className="intro-fade absolute inset-y-0 right-0 hidden w-3 md:block" style={{ animationDelay: `${base}ms` }}>
              <div
                className="h-full w-full opacity-20"
                style={{
                  background:
                    'repeating-linear-gradient(180deg, #fff 0 1px, transparent 1px 60px) right / 12px 100% no-repeat, repeating-linear-gradient(180deg, #fff 0 1px, transparent 1px 12px) right / 5px 100% no-repeat',
                }}
              />
            </div>

            <div className="relative flex h-full flex-col justify-between p-6 md:p-10 xl:p-14">
              <div className="flex items-start justify-between gap-6">
                <SentraBrand tone="light" className="animate-rise" style={stagger(0)} />
                {reviewControls && (
                  <ReviewControls accent={accent} onAccent={setAccent} onReplay={replay} />
                )}
              </div>

              <div className="flex flex-col gap-6 md:gap-10">
                <p
                  className="max-w-[17ch] animate-rise text-[19px] [text-shadow:0_1px_20px_rgb(3_5_10/0.95)] leading-[1.2] font-normal tracking-[-0.01em] text-balance text-white md:text-[30px] xl:text-[36px]"
                  style={stagger(1)}
                >
                  Clinical intelligence, organized around the patient.
                </p>
                <div className="hidden animate-rise md:block" style={stagger(2)}>
                  <StatusIndicator label="AI Clinical Workspace" state="System Ready" />
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Authentication */}
      <main
        className={`relative flex flex-col overflow-x-hidden bg-paper font-body transition-[width] duration-[1150ms] ease-calm md:shrink-0 md:overflow-y-auto ${
          docked ? 'flex-1 md:w-[45%] md:flex-none lg:w-[40%]' : 'md:w-0'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-20 bg-linear-to-r from-ink-950/[0.07] to-transparent md:block"
        />
        {docked && (
          <div className="relative flex min-h-full flex-1 flex-col gap-10 px-6 py-8 md:px-12 md:py-10 lg:px-16 xl:px-24 xl:py-14">
            <header className="hidden animate-rise md:block" style={stagger(0)}>
              <SentraBrand showProduct={false} />
            </header>

            <div className="flex w-full max-w-[25rem] flex-1 flex-col justify-center gap-8">
              <div className="flex animate-rise flex-col gap-2.5" style={stagger(1)}>
                <h1 className="font-sans text-[30px] leading-[1.1] font-semibold tracking-[-0.02em] text-balance md:text-[34px]">
                  Welcome back
                </h1>
                <p className="text-[15px] leading-6 text-muted">
                  Sign in to access Sentra Medical Smartboard.
                </p>
              </div>
              <div className="animate-rise" style={stagger(2)}>
                <LoginForm
                  onSubmit={onSignIn}
                  onMicrosoftSignIn={onMicrosoftSignIn}
                  onForgotPassword={onForgotPassword}
                />
              </div>
            </div>

            <AccessNotice baseDelay={base + 270} />
          </div>
        )}
      </main>
    </div>
  );
}
