export type RGB = [number, number, number]

/** Colours for the WebGL renderer (0..1, can exceed 1 for emissive). */
export interface GlPalette {
  bg0: RGB
  bg1: RGB
  fog: RGB
  deep: RGB
  body: RGB
  rim: RGB
  spec: RGB
  inner: RGB
  pulse: RGB
  warm: RGB
  cool: RGB
  bloom: number
}

export interface Palette {
  bg: string
  nebula: RGB[]
  body: RGB
  edge: RGB
  hi: RGB
  somaCore: RGB
  somaMid: RGB
  somaDeep: RGB
  glow: RGB
  pulse: RGB
  warm: RGB
  cool: RGB
  farBody: RGB
  midBody: RGB
  fore: RGB
  lineFar: RGB
  lineMid: RGB
  lineNear: RGB
  gl: GlPalette
}

/** Handle returned by the field renderers (2D canvas and WebGL). */
export interface FieldHandle {
  destroy(): void
  skipIntro(): void
  redraw(): void
}

/** Handle returned by the opening lens overlay. */
export interface LensHandle {
  destroy(): void
  skip(): void
}

// Reference look: deep blue volume, cyan-white light, warm sparks.
export const PALETTE: Palette = {
  bg: '#030611',
  nebula: [[20, 62, 160], [8, 92, 158], [44, 34, 128]],
  body: [58, 112, 214],
  edge: [140, 190, 255],
  hi: [228, 243, 255],
  somaCore: [208, 241, 255],
  somaMid: [50, 116, 226],
  somaDeep: [9, 26, 82],
  glow: [58, 136, 255],
  pulse: [190, 236, 255],
  warm: [255, 158, 66],
  cool: [170, 215, 255],
  farBody: [40, 80, 186],
  midBody: [58, 108, 214],
  fore: [112, 158, 238],
  lineFar: [120, 150, 205],
  lineMid: [198, 218, 240],
  lineNear: [120, 214, 236],
  gl: {
    bg0: [0.005, 0.009, 0.028],
    bg1: [0.015, 0.048, 0.17],
    fog: [0.01, 0.028, 0.095],
    deep: [0.014, 0.045, 0.16],
    body: [0.07, 0.2, 0.52],
    rim: [0.42, 0.7, 1.0],
    spec: [0.92, 0.97, 1.0],
    inner: [0.32, 0.72, 1.0],
    pulse: [0.72, 0.92, 1.0],
    warm: [1.0, 0.52, 0.17],
    cool: [0.55, 0.8, 1.0],
    bloom: 0.6,
  },
}
