import * as THREE from 'three'
import { frames, type CommitView } from './effects'
import { motionPresets, type MotionTuning } from './motion-presets'

export interface PortalRenderer {
  play: (commit: CommitView, signal: AbortSignal, tuning?: MotionTuning) => Promise<void>
  dispose: () => void
}

export function createPortal(canvas: HTMLCanvasElement, primary: string, accent: string): PortalRenderer {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  const scene = new THREE.Scene()
  const camera = new THREE.Camera()
  const geometry = new THREE.PlaneGeometry(2, 2)
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      progress: { value: 0 },
      aspect: { value: 1 },
      richness: { value: 1 },
      primary: { value: new THREE.Color(primary) },
      accent: { value: new THREE.Color(accent) },
    },
    vertexShader: `varying vec2 vUv;
      void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform float progress;
      uniform float aspect;
      uniform float richness;
      uniform vec3 primary;
      uniform vec3 accent;
      float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      void main(){
        vec2 uv=(vUv-.5)*vec2(aspect,1.0);
        float angle=atan(uv.y,uv.x);
        float ripple=sin(angle*9.0+progress*10.0)*.012*sin(progress*3.14159);
        float radius=progress*(length(vec2(aspect,1.0))*.5+.08);
        float radial=length(uv);
        float distanceToEdge=radial+ripple-radius;
        float cover=1.0-smoothstep(-.025,.025,distanceToEdge);
        float ring=exp(-abs(distanceToEdge)*95.0)*sin(progress*3.14159);
        vec2 cell=floor(vUv*vec2(90.0*aspect,90.0));
        float star=step(.985,hash(cell))*pow(max(0.0,1.0-length(fract(vUv*vec2(90.0*aspect,90.0))-.5)*2.0),8.0);
        float depth=0.0;
        if(richness>0.0){
          float tunnel=pow(.5+.5*cos(radial*28.0-progress*9.0+sin(angle*3.0)*.4),8.0);
          depth=tunnel*exp(-radial*1.8)*sin(progress*3.14159)*richness;
        }
        vec3 color=mix(primary,accent,clamp(ring*.9+star*.35+depth*.24,0.0,1.0));
        color+=ring*.22;
        gl_FragColor=vec4(color,max(cover,ring*.7)*smoothstep(0.0,.015,progress));
      }`,
  })
  scene.add(new THREE.Mesh(geometry, material))
  let lost = false
  let activeSignal: AbortSignal | null = null
  const onContextLost = (event: Event) => {
    event.preventDefault()
    lost = true
    canvas.dataset.portalState = 'lost'
    canvas.style.visibility = 'hidden'
  }
  canvas.addEventListener('webglcontextlost', onContextLost)

  return {
    async play(commit, signal, tuning = motionPresets.cinematic) {
      if (lost) throw new Error('Portal context unavailable')
      activeSignal = signal
      const bounds = canvas.getBoundingClientRect()
      renderer.setSize(Math.max(1, bounds.width), Math.max(1, bounds.height), false)
      material.uniforms.aspect.value = Math.max(1, bounds.width) / Math.max(1, bounds.height)
      material.uniforms.richness.value = tuning.portalDepth
      canvas.dataset.portalState = 'rendering'
      const draw = (p: number) => {
        if (lost || signal.aborted) return
        material.uniforms.progress.value = p
        renderer.render(scene, camera)
      }
      try {
        await frames(tuning.portalCoverMs, draw, signal, tuning.frameCurve)
        await commit()
        await frames(tuning.portalRevealMs, (p) => draw(1 - p), signal, tuning.frameCurve)
      } finally {
        if (activeSignal === signal) {
          if (!lost) renderer.clear()
          canvas.dataset.portalState = lost ? 'lost' : 'idle'
          activeSignal = null
        }
      }
    },
    dispose() {
      canvas.removeEventListener('webglcontextlost', onContextLost)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
