import React, { useEffect, useRef, useState } from 'react';
import { createIntelligenceField, PALETTES } from '../visual/engine.js';
import { createNeuralField } from '../visual/neuralGL.js';
import { createLensIntro } from '../visual/lens.js';

/**
 * Decorative neural field. Renders in WebGL2 (3D, depth of field) and falls
 * back to the 2D canvas renderer where WebGL2 is unavailable. Hidden from
 * assistive technology, paused off-screen, and still under reduced motion.
 *
 * playIntro (read at mount): start with the opening sequence.
 * skipIntro: when it turns true, fast-forward the opening.
 * renderer: 'auto' (default) picks WebGL when a real GPU is present and hands
 *   over to 2D if frames stay slow; 'webgl' or 'canvas' force one renderer.
 */
export default function IntelligenceVisual({
  palette = 'clinical',
  playIntro = false,
  skipIntro = false,
  renderer = 'auto',
  className = '',
}) {
  const [mode, setMode] = useState(renderer === 'canvas' ? '2d' : 'gl'); // 'gl' | '2d'
  const [withIntro] = useState(playIntro); // fixed for the life of this mount
  const canvasRef = useRef(null);
  const lensRef = useRef(null);
  const fieldRef = useRef(null);
  const lensFieldRef = useRef(null);
  const handedOver = useRef(false); // true once WebGL gave way to 2D mid-session
  const paletteRef = useRef(PALETTES[palette] ?? PALETTES.clinical);
  const getPalette = () => paletteRef.current;

  useEffect(() => {
    let field;
    let lens = null;
    if (mode === 'gl') {
      const forced = renderer === 'webgl';
      field = createNeuralField(canvasRef.current, getPalette, {
        intro: withIntro,
        allowSoftware: forced,
        adaptive: !forced,
        onTooSlow: forced
          ? undefined
          : () => {
              handedOver.current = true;
              setMode('2d');
            },
      });
      if (!field) {
        setMode('2d'); // remounts a fresh canvas for the 2D renderer
        return undefined;
      }
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (withIntro && !reduced && lensRef.current) lens = createLensIntro(lensRef.current, getPalette);
    } else {
      // After a mid-session handover the opening has already played.
      field = createIntelligenceField(canvasRef.current, getPalette, { intro: withIntro && !handedOver.current });
    }
    fieldRef.current = field;
    lensFieldRef.current = lens;
    return () => {
      field.destroy();
      lens?.destroy();
      fieldRef.current = null;
      lensFieldRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!skipIntro) return;
    fieldRef.current?.skipIntro();
    lensFieldRef.current?.skip();
  }, [skipIntro]);

  useEffect(() => {
    paletteRef.current = PALETTES[palette] ?? PALETTES.clinical;
    fieldRef.current?.redraw();
  }, [palette]);

  return (
    <>
      <canvas
        key={mode}
        ref={canvasRef}
        aria-hidden="true"
        className={`absolute inset-0 h-full w-full ${className}`}
      />
      {mode === 'gl' && withIntro && (
        <canvas ref={lensRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      )}
    </>
  );
}
