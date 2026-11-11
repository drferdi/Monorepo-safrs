import { analyseFace } from './face'
import type { FacePixels } from './face'
import { axonCenter, faceDepth, hubs, makeAxon, makeDust, makeEmbryo, makeFace, makeNetwork, makeNeuron, makeSynapse } from './geometry'
import type { Geometry, Vec3 } from './geometry'
import { carrierStyle, handoffAt, hubBlend } from './handoff'
import type { Host } from './handoff'
import { clamp, divisions, smooth } from './story'
import { facePlacement } from './tactile'
import { reveal } from './timeline'
import type { StageCamera } from './timeline'

type Layer = { geometry: Geometry; points?: WebGLBuffer; lines?: WebGLBuffer; pointNormals?: WebGLBuffer; lineNormals?: WebGLBuffer; pointTargets?: WebGLBuffer; lineTargets?: WebGLBuffer }
type View = { alpha: number; growth: number; camera: Vec3; rotation: number; scale: number; offset: Vec3; roll: number; pulse: number; highlight: Vec3; hover: number; order: number; sync: number; attract: number }
// `node` is the eased glow of the division the pointer is on (0 → 1), its hub the last one pointed at.
export type Look = { turn: number; highlight: Vec3; hover: number; node: number }
const baseView = (): View => ({ alpha: 1, growth: 1, camera: [0, 0, 7], rotation: 0, scale: 1, offset: [0, 0, 0], roll: 0, pulse: 0, highlight: [0, 0, 0], hover: 0, order: 0, sync: 0, attract: 0 })
const still: Look = { turn: 0, highlight: [0, 0, 0], hover: 0, node: 0 }
const silence = new Float32Array(24)
const level: StageCamera = { scale: 1, x: 0, y: 0, roll: 0 }
const envelope = (phase: number, start: number, end: number, fade = 2) => smooth((phase - start) / fade) * (1 - smooth((phase - end) / fade))
export type Carrier = { x: number; y: number; size: number; color: readonly [number, number, number]; alpha: number }
const hubColors = divisions.map(division => division.color)
// Where the thought sits in the face model (makeFace's units, a square portrait): the forehead.
const MIND: Vec3 = [-.042, 1.11, faceDepth(.486, .13)]
const view = (options: Partial<View>): View => ({ ...baseView(), ...options })
const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
// The network's camera through the divisions: which hub it leans toward, by how much, and the
// field's turn. `render` draws with it and `hitTest` maps the pointer with it, so they agree.
function networkFocus(phase: number) {
  const { index, next, blend } = hubBlend(phase)
  return { hub: lerp3(hubs[index], hubs[next], blend), amount: .25 * smooth(phase - 65) * (1 - smooth(phase - 90)), rotation: -.08 + clamp((phase - 64) / 26) * .16 }
}

// Every layer's view at `phase`, one formula each: the frame draws with them and the carrier finds
// its host through the same camera.
function sceneAt(phase: number, reduced: boolean, look: Look, mobile: boolean, seat: ReturnType<typeof facePlacement>) {
  const right: Vec3 = [mobile ? 0 : 1.15, mobile ? .7 : 0, 0]
  const travel = reduced ? -8 : -smooth((phase - 36) / 18) * 26
  const center = axonCenter(travel)
  const tunnel: Vec3 = [center[0], center[1], travel + 2.6]
  const separate = smooth((phase - 10) / 5), crossing = smooth((phase - 53) / 5)
  const near: Vec3 = [0, 0, mobile ? 6 : 4.4]
  const focus = networkFocus(phase)
  const order = smooth((phase - reveal.order.at) / reveal.order.in)
  return {
    order,
    neuron: view({ alpha: phase < 7 ? 1 : phase < 17 ? 1 - envelope(phase, 7, 16, 2) * .85 : 1 - smooth((phase - 26) / 4), growth: clamp((phase - 17) / 8, 0, 1), scale: phase < 8 ? .45 + smooth(phase / 8) * 3 : phase < 17 ? .6 : 1.6 - smooth((phase - 24) / 6) * .85, rotation: reduced ? .1 : phase * .027, offset: right, camera: [0, 0, 5.4] }),
    embryo: view({ alpha: envelope(phase, 6, 17, 3), growth: clamp((phase - 8) / 8), rotation: reduced ? .2 : phase * .035, offset: right, camera: [0, 0, 6.5] }),
    daughter: (side: number) => view({ alpha: envelope(phase, 9, 17, 2), growth: 0, scale: .8, offset: [right[0] + side * separate * .4, .1 - separate * .4, 1.2], camera: [0, 0, 6.5] }),
    face: view({ alpha: envelope(phase, 25, 36, 4), growth: smooth((phase - 26) / 5), offset: [seat.offset.x, seat.offset.y, 0], scale: seat.scale, camera: [0, 0, seat.depth - smooth((phase - 34) / 6) * 2.5], rotation: reduced ? 0 : Math.sin(phase * .15) * .045 + look.turn * .085, pulse: .55, highlight: look.highlight, hover: look.hover }),
    axon: view({ alpha: envelope(phase, 35, 51, 3), camera: tunnel, roll: reduced || mobile ? 0 : Math.sin(travel * .18) * .12, pulse: 1 }),
    signal: view({ alpha: envelope(phase, 36, 50, 3) * .9, growth: 0, scale: .22, offset: axonCenter(travel - 2), camera: tunnel, pulse: 1 }),
    synapse: view({ alpha: envelope(phase, 49, 60, 3), rotation: reduced ? .05 : -.15 + smooth((phase - 51) / 9) * .3, camera: near, offset: right, pulse: smooth((phase - 56) / 4) }),
    release: (i: number) => view({ alpha: envelope(phase, 52 + i * .06, 58.5, 1.5), growth: 0, scale: .055, camera: near, offset: [right[0] - .45 + crossing * .92, (i % 5 - 2) * .16, Math.sin(i * 4) * .4], pulse: 1 }),
    network: view({ alpha: smooth((phase - 58) / 5) * (1 - smooth((phase - 94) / 1.8)), camera: [focus.hub[0] * focus.amount, focus.hub[1] * focus.amount, 8 + smooth((phase - 60) / 6) * 4], rotation: reduced ? 0 : focus.rotation, pulse: .85, scale: 1 - smooth((phase - 93) / 6) * .6, order, sync: Math.max(smooth((phase - reveal.sync.at) / reveal.sync.in) * (1 - smooth((phase - reveal.sync.out) / .5)), smooth((phase - reveal.unify.at) / reveal.unify.in)) }),
  }
}
type Scene = ReturnType<typeof sceneAt>

const vertexSource = `
attribute vec3 a_position;
attribute vec3 a_color;
attribute float a_size;
attribute float a_birth;
attribute float a_phase;
attribute vec4 a_normal;
attribute vec3 a_target;
uniform float u_lit;
uniform float u_order;
uniform float u_sync;
uniform float u_attract;
uniform float u_focus;
uniform float u_height;
uniform mediump float u_points;
uniform vec4 u_signal[6];
uniform vec3 u_camera;
uniform vec3 u_offset;
uniform float u_aspect;
uniform float u_rotation;
uniform float u_roll;
uniform float u_scale;
uniform float u_alpha;
uniform float u_growth;
uniform float u_time;
uniform float u_dpr;
uniform float u_pulse;
uniform vec3 u_highlight;
uniform float u_hover;
uniform vec4 u_stage;
varying vec4 v_color;
void main() {
  // Activity (spec 2026-10-08): the tag names the lane and the kind (0 soma or dendrite, 1 axon,
  // 2 release particle) and carries +50 on sheath sprites; the lane state is (impulse, terminal,
  // release, response).
  float kind = floor((a_normal.w+1.0)/100.0);
  float rem = a_normal.w-kind*100.0;
  float sheath = step(48.5, rem);
  float lane = rem-sheath*50.0;
  vec4 sig = vec4(0.0);
  for (int i = 0; i < 6; i++) { if (float(i) == lane) sig = u_signal[i]; }
  sig = mix(sig, u_signal[5], u_sync*step(-.5, lane));
  float particle = step(1.5, kind);
  float axon = step(.5, kind)*(1.0-particle);
  // The constellation (brief 2026-10-09 §7): each vertex moves toward its place as u_order rises.
  vec3 base = mix(a_position, a_target, u_order);
  // Pointer instrumentation (brief 2026-10-09 §8): nodes near the pointed hub brighten and drift a
  // little toward it; only the network attracts (u_attract), the face never deforms.
  float nearby = exp(-distance(base, u_highlight)*1.4)*u_hover;
  base += (u_highlight - base)*nearby*u_attract;
  vec3 p = (base + a_normal.xyz*sig.z*.35*particle) * u_scale;
  float c = cos(u_rotation), s = sin(u_rotation);
  p = vec3(p.x*c+p.z*s, p.y, -p.x*s+p.z*c) + u_offset - u_camera;
  float depth = -p.z;
  float rc = cos(u_roll), rs = sin(u_roll);
  vec2 xy = vec2(p.x*rc-p.y*rs,p.x*rs+p.y*rc);
  // The stage camera (brief 2026-10-09 §4): zoom, roll and pan of the whole field about the centre;
  // the pan (u_stage.yz, fractions of the viewport height) is applied in clip space, so it is
  // the same number of pixels at every depth.
  float sc = cos(u_stage.w), sn = sin(u_stage.w);
  xy = vec2(xy.x*sc-xy.y*sn, xy.x*sn+xy.y*sc)*u_stage.x;
  gl_Position = vec4(xy.x*1.85/u_aspect + 2.0*u_stage.y*depth/u_aspect, xy.y*1.85 + 2.0*u_stage.z*depth, depth*.99-.1, depth);
  // Focus (spec 2026-10-08): lit layers soften away from the focus plane, size up to x2, alpha to .4.
  float coc = clamp(abs(depth-u_focus)/6.0, 0.0, 1.0)*u_lit;
  // Sheath sprites store the shaft radius in a_size: a world size, scaled with the view and the
  // canvas height (device pixels) so a trunk reads as a tube at every chapter's scale, widened 2.8×
  // because a gaussian sprite only reads as solid over about a third of its width.
  float sized = a_size*u_dpr*6.0/max(depth, .2);
  float world = a_size*u_scale*2.8*u_height/max(depth, .2);
  gl_PointSize = clamp(mix(sized, world, sheath), .6, mix(22.0, 120.0, sheath)*u_dpr)*(1.0+coc);
  float born = 1.0-smoothstep(u_growth, u_growth+.07, a_birth);
  float fog = clamp(1.6-depth/28.0, .12, 1.0);
  // The impulse front travels along the axon's path fraction, flashes at the terminal and the
  // response brightens the next lane's soma and dendrites; particles live only while releasing.
  float front = axon*step(.001, sig.x)*exp(-pow((a_phase-sig.x)*8.0, 2.0));
  float flash = axon*sig.y*smoothstep(.85, 1.0, a_phase);
  float activity = max(front, flash);
  float pulse = max(pow(max(0.0, sin(a_phase*19.0-u_time*1.3)), 22.0)*u_pulse, activity);
  // For lines a_size is a brightness weight that follows the shaft radius; points keep it as a size.
  vec3 color = (mix(a_color, vec3(1.0,.75,.43), max(pulse*.85, activity)) + vec3(.22,.3,.4)*nearby + a_color*sig.w*.9*(1.0-axon))*mix(a_size, 1.0, u_points);
  float alive = mix(1.0, sig.z*(1.0-sig.z)*4.0, particle);
  // Emission-based lighting (spec 2026-10-08): a warm key, a cool rim, less glow on the far side
  // (additive blending cannot darken; the floor is .7, not the spec's .45, because one-pixel lines
  // have no area to carry shading and the far half of a neuron vanished) and a specular highlight
  // only while an impulse passes.
  vec3 n = a_normal.xyz;
  n = vec3(n.x*c+n.z*s, n.y, -n.x*s+n.z*c);
  vec3 eye = normalize(-p);
  vec3 key = normalize(vec3(-.4, .7, .6));
  float facing = dot(n, key);
  float rim = pow(1.0-abs(dot(n, eye)), 3.0);
  float occlusion = .7+.3*smoothstep(-.6, .3, facing);
  float specular = pulse*pow(max(0.0, dot(reflect(-key, n), eye)), 32.0)*.9;
  float luma = (color.r+color.g+color.b)/3.0;
  vec3 lit = color*(.6+.55*max(0.0, facing)*vec3(1.0,.94,.86))*occlusion + vec3(.62,.78,1.0)*.35*rim*luma + vec3(1.0,.95,.85)*specular;
  color = mix(color, lit, u_lit);
  v_color = vec4(color, u_alpha*born*fog*(.6+pulse*.65)*(1.0-.6*coc)*alive);
}`
const fragmentSource = `
precision mediump float;
uniform float u_points;
varying vec4 v_color;
void main() {
  float alpha = v_color.a;
  if(u_points > .5) {
    float d = length(gl_PointCoord-.5)*2.0;
    if(d > 1.0) discard;
    alpha *= exp(-d*d*3.0);
  }
  gl_FragColor = vec4(v_color.rgb, alpha);
}`

export class NeuralRenderer {
  private gl: WebGLRenderingContext | null
  private ctx: CanvasRenderingContext2D | null = null
  private program: WebGLProgram | null = null
  private layers = new Map<string, Layer>()
  private width = 1
  private height = 1
  private dpr = 1
  private lost = false
  private uniforms = new Map<string, WebGLUniformLocation | null>()
  private attributes: number[] = []
  private normalAttribute = -1
  private targetAttribute = -1
  private signal: Float32Array = silence
  private stage: StageCamera = level
  private density: number
  private disposed = false
  private face: Geometry | null = null
  private lastHub = 0
  readonly mode: 'webgl' | 'canvas' | 'svg'

  constructor(private canvas: HTMLCanvasElement, private fallback: HTMLCanvasElement, private mobile: boolean, private onLoss: () => void) {
    this.density = mobile ? .35 : .85
    let context: WebGLRenderingContext | null = null
    try { context = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power', depth: false, premultipliedAlpha: false }) } catch { context = null }
    this.gl = context
    if (context) {
      try { this.setup(context) } catch { this.releaseGL(); this.gl = null }
    }
    if (!this.gl) { this.ctx = fallback.getContext('2d'); this.density = mobile ? .18 : .3 }
    this.mode = this.gl ? 'webgl' : this.ctx ? 'canvas' : 'svg'
    canvas.style.display = this.gl ? 'block' : 'none'
    fallback.style.display = this.ctx ? 'block' : 'none'
    canvas.addEventListener('webglcontextlost', this.contextLost)
    this.resize()
  }

  private contextLost = (event: Event) => {
    event.preventDefault()
    this.lost = true
    this.ctx = this.fallback.getContext('2d')
    this.canvas.style.display = 'none'
    this.fallback.style.display = 'block'
    this.onLoss()
  }

  private setup(gl: WebGLRenderingContext) {
    const shaders: WebGLShader[] = []
    try {
      const compile = (type: number, source: string) => {
        const shader = gl.createShader(type)
        if (!shader) throw new Error('Shader allocation failed')
        shaders.push(shader)
        gl.shaderSource(shader, source); gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Shader compilation failed')
        return shader
      }
      const program = gl.createProgram()
      if (!program) throw new Error('Program allocation failed')
      this.program = program
      gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Shader linking failed')
      gl.useProgram(program)
      this.attributes = ['a_position', 'a_color', 'a_size', 'a_birth', 'a_phase'].map(name => gl.getAttribLocation(program, name))
      this.normalAttribute = gl.getAttribLocation(program, 'a_normal')
      this.targetAttribute = gl.getAttribLocation(program, 'a_target')
      for (const name of ['camera', 'offset', 'aspect', 'rotation', 'roll', 'scale', 'alpha', 'growth', 'time', 'dpr', 'pulse', 'points', 'highlight', 'hover', 'lit', 'focus', 'height', 'order', 'sync', 'attract']) this.uniforms.set(name, gl.getUniformLocation(program, `u_${name}`))
      this.uniforms.set('signal', gl.getUniformLocation(program, 'u_signal[0]'))
      this.uniforms.set('stage', gl.getUniformLocation(program, 'u_stage'))
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
      gl.clearColor(0, 0, 0, 0)
    } finally { shaders.forEach(shader => gl.deleteShader(shader)) }
  }

  resize() {
    const surface = this.ctx ? this.fallback : this.canvas
    this.width = surface.clientWidth || window.innerWidth
    this.height = surface.clientHeight || window.innerHeight
    this.dpr = Math.min(window.devicePixelRatio || 1, this.mobile ? 1.25 : 1.7)
    for (const canvas of [this.canvas, this.fallback]) { canvas.width = Math.round(this.width * this.dpr); canvas.height = Math.round(this.height * this.dpr) }
    this.gl?.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  private layer(name: string, factory: (density: number) => Geometry) {
    const cached = this.layers.get(name)
    if (cached) return cached
    const geometry = factory(this.density)
    const layer: Layer = { geometry }
    if (this.gl && !this.lost) {
      for (const key of ['points', 'lines', 'pointNormals', 'lineNormals', 'pointTargets', 'lineTargets'] as const) {
        const data = geometry[key]
        if (!data) continue
        const buffer = this.gl.createBuffer()
        if (!buffer) continue
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
        this.gl.bufferData(this.gl.ARRAY_BUFFER, data, this.gl.STATIC_DRAW)
        layer[key] = buffer
      }
    }
    this.layers.set(name, layer)
    return layer
  }

  private draw(layer: Layer, view: View, time: number) {
    if (view.alpha < .005) return
    const gl = this.lost ? null : this.gl
    if (gl && this.program) {
      gl.useProgram(this.program)
      const uniform = (key: string) => this.uniforms.get(key) ?? null
      gl.uniform3fv(uniform('camera'), view.camera)
      gl.uniform3fv(uniform('offset'), view.offset)
      gl.uniform3fv(uniform('highlight'), view.highlight)
      gl.uniform4fv(uniform('signal'), this.signal)
      gl.uniform4f(uniform('stage'), this.stage.scale, this.stage.x, this.stage.y, this.stage.roll)
      // Lit layers are the ones that carry normals; their focus plane is the depth of the model origin.
      const lit = layer.geometry.lineNormals ? 1 : 0
      const values = { aspect: this.width / this.height, rotation: view.rotation, roll: view.roll, scale: view.scale, alpha: view.alpha, growth: view.growth, time, dpr: this.dpr, pulse: view.pulse, hover: view.hover, lit, focus: view.camera[2] - view.offset[2], height: this.height * this.dpr, order: layer.geometry.pointTargets ? view.order : 0, sync: view.sync, attract: view.attract }
      for (const [key, value] of Object.entries(values)) gl.uniform1f(uniform(key), value)
      for (const key of ['lines', 'points'] as const) {
        if (!layer[key] || !layer.geometry[key].length) continue
        gl.bindBuffer(gl.ARRAY_BUFFER, layer[key]!)
        const sizes = [3, 3, 1, 1, 1], offsets = [0, 3, 6, 7, 8]
        this.attributes.forEach((location, i) => {
          if (location < 0) return
          gl.enableVertexAttribArray(location)
          gl.vertexAttribPointer(location, sizes[i], gl.FLOAT, false, 36, offsets[i] * 4)
        })
        const normals = layer[key === 'points' ? 'pointNormals' : 'lineNormals']
        if (this.normalAttribute >= 0) {
          if (normals) {
            gl.bindBuffer(gl.ARRAY_BUFFER, normals)
            gl.enableVertexAttribArray(this.normalAttribute)
            gl.vertexAttribPointer(this.normalAttribute, 4, gl.FLOAT, false, 16, 0)
          } else {
            gl.disableVertexAttribArray(this.normalAttribute)
            gl.vertexAttrib4f(this.normalAttribute, 0, 0, 1, -1)
          }
        }
        const targets = layer[key === 'points' ? 'pointTargets' : 'lineTargets']
        if (this.targetAttribute >= 0) {
          if (targets) {
            gl.bindBuffer(gl.ARRAY_BUFFER, targets)
            gl.enableVertexAttribArray(this.targetAttribute)
            gl.vertexAttribPointer(this.targetAttribute, 3, gl.FLOAT, false, 12, 0)
          } else {
            gl.disableVertexAttribArray(this.targetAttribute)
            gl.vertexAttrib3f(this.targetAttribute, 0, 0, 0)
          }
        }
        gl.uniform1f(uniform('points'), key === 'points' ? 1 : 0)
        gl.drawArrays(key === 'points' ? gl.POINTS : gl.LINES, 0, layer.geometry[key].length / 9)
      }
    } else if (this.ctx) this.drawCanvas(layer.geometry, view)
  }

  private drawCanvas(geometry: Geometry, view: View) {
    const ctx = this.ctx!
    const mixed = (array: Float32Array, targets: Float32Array | undefined, i: number) => {
      const k = i / 9 * 3, t = targets ? view.order : 0
      return this.project(array[i] + ((targets?.[k] ?? array[i]) - array[i]) * t, array[i + 1] + ((targets?.[k + 1] ?? array[i + 1]) - array[i + 1]) * t, array[i + 2] + ((targets?.[k + 2] ?? array[i + 2]) - array[i + 2]) * t, view)
    }
    ctx.globalAlpha = view.alpha * .5
    ctx.lineWidth = .65
    ctx.strokeStyle = '#7799b7'
    ctx.beginPath()
    for (let i = 0; i < geometry.lines.length; i += 36) {
      if (geometry.lines[i + 7] > view.growth) continue
      const a = mixed(geometry.lines, geometry.lineTargets, i), b = mixed(geometry.lines, geometry.lineTargets, i + 9)
      if (a.depth < .2 || b.depth < .2) continue
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y)
    }
    ctx.stroke()
    ctx.fillStyle = '#b5c8dc'
    for (let i = 0; i < geometry.points.length; i += 27) {
      if (geometry.points[i + 7] > view.growth) continue
      // Release particles only move in the shader and sheath sprites are a WebGL glow; the static
      // fallback leaves both out.
      if (geometry.pointNormals) { const tag = geometry.pointNormals[i / 9 * 4 + 3], kind = Math.floor((tag + 1) / 100); if (kind === 2 || tag - kind * 100 >= 48.5) continue }
      const p = mixed(geometry.points, geometry.pointTargets, i)
      if (p.depth < .2) continue
      const size = clamp(geometry.points[i + 6] * p.scale * .008, .4, 3)
      ctx.fillRect(p.x, p.y, size, size)
    }
  }

  // A point relative to the stage centre (CSS pixels, y up) through the stage camera, to screen pixels.
  private toScreen(x: number, y: number) {
    const { scale, x: panX, y: panY, roll } = this.stage, c = Math.cos(roll), s = Math.sin(roll)
    return { x: this.width / 2 + (x * c - y * s) * scale + panX * this.height, y: this.height / 2 - ((x * s + y * c) * scale + panY * this.height) }
  }

  // A model-space point through a layer's view and the stage camera: the shader's projection in CSS pixels.
  private project(x: number, y: number, z: number, view: View) {
    x *= view.scale; y *= view.scale; z *= view.scale
    const c = Math.cos(view.rotation), s = Math.sin(view.rotation)
    const px = x * c + z * s + view.offset[0] - view.camera[0]
    const py = y + view.offset[1] - view.camera[1]
    const depth = view.camera[2] - (-x * s + z * c + view.offset[2])
    const scale = this.height * .925 / Math.max(depth, .1)
    const screen = this.toScreen((px * Math.cos(view.roll) - py * Math.sin(view.roll)) * scale, (px * Math.sin(view.roll) + py * Math.cos(view.roll)) * scale)
    return { x: screen.x, y: screen.y, depth, scale: scale * this.stage.scale }
  }

  // Where the face sits (Chief 2026-10-08): right of the chapter text on desktop, above it on
  // phones, bent by the viewport so it stays on screen and clear of the text. NeuralJourney
  // reads the same view to map the pointer onto the face plane.
  faceView() { return facePlacement({ width: this.width, height: this.height }, this.mobile) }

  setFace(pixels: FacePixels) {
    if (this.disposed) return
    this.face = makeFace(analyseFace(pixels, { density: this.density }))
  }

  // `signal` is the activity cycle state, six lanes of (impulse, terminal, release, response).
  render(phase: number, time: number, reduced = false, hover = -1, look: Look = still, signal: Float32Array = silence, stage: StageCamera = level): Carrier | null {
    if (this.disposed) return null
    this.signal = signal
    this.stage = stage
    if (this.gl && !this.lost) this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    if (this.ctx) { this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); this.ctx.clearRect(0, 0, this.width, this.height) }
    const s = sceneAt(phase, reduced, look, this.mobile, this.faceView())
    const draw = (name: string, factory: (density: number) => Geometry, options: View) => this.draw(this.layer(name, factory), options, time)
    // The dust leaves with the network, so the legacy opens on black (Chief 2026-10-08).
    draw('dust', makeDust, view({ alpha: .4 * (1 - .55 * s.order) * (1 - smooth((phase - 94) / 1.5)), rotation: reduced ? 0 : time * .006 }))
    if (phase < 30) draw('neuron', makeNeuron, s.neuron)
    if (phase > 6 && phase < 20) {
      draw('embryo', makeEmbryo, s.embryo)
      // Daughter cells separate as the selected progenitor differentiates.
      for (const side of [-1, 1]) draw('neuron', makeNeuron, s.daughter(side))
    }
    // Chapter 03 shows the founder's face in place of the generic body (Chief 2026-10-08): it
    // grows in, sways, and the camera closes in as the signal chapter takes over.
    const face = this.face
    if (face && phase > 25 && phase < 40) draw('face', () => face, s.face)
    if (phase > 35 && phase < 54) { draw('axon', makeAxon, s.axon); draw('neuron', makeNeuron, s.signal) }
    if (phase > 49 && phase < 63) {
      draw('synapse', makeSynapse, s.synapse)
      for (let i = 0; i < 14; i++) draw('neuron', makeNeuron, s.release(i))
    }
    // The network dissolves from 94 into the final chapter's void and film (Chief 2026-10-09:
    // nothing stands between SENTRA and the film).
    if (hover >= 0) this.lastHub = hover
    if (phase > 58 && phase < 99) draw('network', makeNetwork, { ...s.network, highlight: hubs[this.lastHub], hover: look.node, attract: .05 })
    return this.mode === 'svg' ? null : this.carrier(phase, time, reduced, s)
  }

  // The carrier (`handoff.ts`): where its hosts are on screen at this phase, mixed by the handoff.
  private carrier(phase: number, time: number, reduced: boolean, s: Scene): Carrier {
    const { from, to, blend } = handoffAt(phase)
    const a = this.host(from, phase, s), b = from === to ? a : this.host(to, phase, s)
    const style = carrierStyle(phase, hubColors)
    const breath = reduced ? 1 : 1 + style.breath * Math.sin(time * 1.1)
    return { x: a.x + (b.x - a.x) * blend, y: a.y + (b.y - a.y) * blend, size: style.size * breath * (this.mobile ? .75 : 1), color: style.color, alpha: style.alpha }
  }

  private host(host: Host, phase: number, s: Scene) {
    switch (host) {
      case 'origin': case 'soma': return this.project(0, 0, 0, s.neuron)
      case 'progenitor': return this.project(0, 0, 0, s.daughter(-1))
      case 'mind': return this.project(MIND[0], MIND[1], MIND[2], s.face)
      case 'impulse': return this.project(0, 0, 0, s.signal)
      case 'cleft': return this.project(0, 0, 0, s.release(7))
      case 'centre': case 'unified': return this.project(0, 0, 0, s.network)
      case 'hub': { const { index, next, blend } = hubBlend(phase), p = lerp3(hubs[index], hubs[next], blend); return this.project(p[0], p[1], p[2], s.network) }
    }
  }

  hitTest(x: number, y: number, phase: number) {
    if (phase < 60 || phase > 94) return -1
    const { hub: focus, amount, rotation } = networkFocus(phase)
    return hubs.findIndex(hub => {
      const depth = 12 + hub[0] * Math.sin(rotation) - hub[2] * Math.cos(rotation)
      const scale = this.height * .925 / depth
      const p = this.toScreen((hub[0] * Math.cos(rotation) + hub[2] * Math.sin(rotation) - focus[0] * amount) * scale, (hub[1] - focus[1] * amount) * scale)
      return Math.hypot(x - p.x, y - p.y) < 65
    })
  }

  private releaseGL() {
    const gl = this.gl
    if (!gl) return
    for (const layer of this.layers.values()) for (const key of ['points', 'lines', 'pointNormals', 'lineNormals', 'pointTargets', 'lineTargets'] as const) { if (layer[key]) gl.deleteBuffer(layer[key]!) }
    if (this.program) gl.deleteProgram(this.program)
  }

  dispose() {
    this.disposed = true
    this.canvas.removeEventListener('webglcontextlost', this.contextLost)
    this.releaseGL()
    this.layers.clear()
  }
}
