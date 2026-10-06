// 3D stage of Atlas Anatomi. Ported from Human Atlas (MIT, © 2026 ashemag, licence in src/lib/atlas/LICENSE-human-atlas.txt):
// https://github.com/slorksmo/Human-Atlas. Geometry is merged per system and drawn with per-structure
// GPU textures for offset, visibility and selection; separate per-structure meshes serve picking.
'use client'

import { useEffect, useRef } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { SYSTEMS, type Atlas, type Part, type SceneState, type SystemId } from '@/lib/atlas/anatomy'
import { createExplosionLayout } from '@/lib/atlas/explosion-layout'
import { decodeModelResponse } from '@/lib/atlas/model-download'
import { PointerTap } from '@/lib/atlas/pointer-tap'

interface Props {
  atlas: Atlas
  state: SceneState
  reducedMotion: boolean
  nameOf: (part: Part) => string
  hoverClassName: string
  className: string
  onSelect: (id: string) => void
  onProgress: (percent: number) => void
  onError: (message: string) => void
}

type Target = { index: number; x: number; y: number; left: number; right: number; top: number; bottom: number }

/** Below this stage width the page stacks its cards (atlas.module.css, container atlas-stage). */
const NARROW = 900

export default function AtlasScene({ atlas, state, reducedMotion, nameOf, hoverClassName, className, onSelect, onProgress, onError }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(state)
  const select = useRef(onSelect)
  const naming = useRef(nameOf)
  const still = useRef(reducedMotion)
  const report = useRef({ onProgress, onError })
  useEffect(() => {
    latest.current = state
    select.current = onSelect
    naming.current = nameOf
    still.current = reducedMotion
    report.current = { onProgress, onError }
  })

  useEffect(() => {
    const el = host.current
    if (!el) return undefined
    let disposed = false
    let frame = 0
    let dirty = true
    let ready = false
    let lastView = ''
    let lastReset = -1
    let lastIsolate = ''
    let layoutKey = ''
    let amount = 0
    let lastState: SceneState | null = null
    const abort = new AbortController()

    let renderer: T.WebGLRenderer
    try {
      renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      report.current.onError('Peramban ini tidak bisa menjalankan tampilan 3D. Gunakan peramban dengan WebGL aktif.')
      return undefined
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth < 768 ? 1.5 : 2))
    // Transparent stage: the page's white shows through (Chief 2026-10-07).
    renderer.setClearColor(0x000000, 0)
    renderer.outputColorSpace = T.SRGBColorSpace
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.12
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute(
      'aria-label',
      'Anatomi tubuh manusia interaktif. Seret untuk memutar, cubit atau gulir untuk memperbesar, ketuk struktur untuk melihat detail.'
    )

    const scene = new T.Scene()
    const camera = new T.PerspectiveCamera(34, 1, 0.005, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    camera.position.set(1.4, 1.05, 3.6)
    controls.target.set(0, 0.85, 0)
    controls.enableDamping = !still.current
    controls.dampingFactor = 0.085
    controls.minDistance = 0.07
    controls.maxDistance = 40
    controls.maxPolarAngle = Math.PI * 0.96
    controls.addEventListener('change', () => {
      dirty = true
    })

    const pmrem = new T.PMREMGenerator(renderer)
    const room = new RoomEnvironment()
    const env = pmrem.fromScene(room, 0.04)
    scene.environment = env.texture
    room.dispose()
    pmrem.dispose()
    scene.add(new T.HemisphereLight(0xffffff, 0xa7acb2, 1.05))
    const key = new T.DirectionalLight(0xfffaf4, 2.3)
    key.position.set(-2, 4, 3)
    scene.add(key)
    const rim = new T.DirectionalLight(0xe9f0ff, 1.8)
    rim.position.set(2, 2, -3)
    scene.add(rim)

    const platform = new T.Mesh(
      new T.CylinderGeometry(0.68, 0.7, 0.028, 100),
      new T.MeshStandardMaterial({ color: 0xf1f2f2, metalness: 0.12, roughness: 0.67 })
    )
    platform.position.y = -0.016
    scene.add(platform)
    const ring = new T.Mesh(
      new T.RingGeometry(0.63, 0.632, 128),
      new T.MeshBasicMaterial({ color: 0x8c969f, transparent: true, opacity: 0.4, side: T.DoubleSide })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.001
    scene.add(ring)
    const innerRing = new T.Mesh(
      new T.RingGeometry(0.55, 0.551, 128),
      new T.MeshBasicMaterial({ color: 0xa4aeb8, transparent: true, opacity: 0.16, side: T.DoubleSide })
    )
    innerRing.rotation.x = -Math.PI / 2
    innerRing.position.y = 0.001
    scene.add(innerRing)

    const width = T.MathUtils.ceilPowerOfTwo(atlas.parts.length)
    const data = new Float32Array(width * 4)
    const partTexture = new T.DataTexture(data, width, 1, T.RGBAFormat, T.FloatType)
    partTexture.needsUpdate = true
    const selectedData = new Uint8Array(width * 4)
    const selectionTexture = new T.DataTexture(selectedData, width, 1)
    selectionTexture.needsUpdate = true

    const materials: T.Material[] = []
    const geometries: T.BufferGeometry[] = []
    const pickers: Array<T.Mesh | undefined> = []
    const bounds = atlas.parts.map((part) => new T.Box3(new T.Vector3().fromArray(part.bounds[0]), new T.Vector3().fromArray(part.bounds[1])))
    const centers = bounds.map((box) => box.getCenter(new T.Vector3()))
    const offsets: T.Vector3[] = []
    let packingWidth = 1
    let packingHeight = 1

    const markerPositions = new Float32Array(atlas.parts.length * 3)
    const markerGeometry = new T.BufferGeometry()
    markerGeometry.setAttribute('position', new T.BufferAttribute(markerPositions, 3))
    const markerMaterial = new T.PointsMaterial({ color: 0x64748b, size: 5, sizeAttenuation: false, transparent: true, opacity: 0.72, depthTest: false })
    markerMaterial.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <clipping_planes_fragment>',
        '#include <clipping_planes_fragment>\nif (distance(gl_PointCoord, vec2(0.5)) > 0.5) discard;'
      )
    }
    const markers = new T.Points(markerGeometry, markerMaterial)
    markers.frustumCulled = false
    markers.renderOrder = 10
    markers.visible = false
    scene.add(markers)

    const hover = document.createElement('div')
    hover.className = hoverClassName
    hover.setAttribute('role', 'tooltip')
    hover.hidden = true
    el.appendChild(hover)

    let targets: Target[] = []
    const projected = new T.Vector3()
    const findTarget = (x: number, y: number, radius: number) => {
      let best = -1
      let score = Infinity
      for (const target of targets) {
        const dx = Math.max(target.left - x, 0, x - target.right)
        const dy = Math.max(target.top - y, 0, y - target.bottom)
        const distance = Math.hypot(dx, dy)
        if (distance > radius) continue
        const candidate = distance + Math.hypot(target.x - x, target.y - y) * 0.025
        if (candidate < score) {
          score = candidate
          best = target.index
        }
      }
      return best
    }

    const materialFor = (system: SystemId) => {
      const surface = system === 'integumentary'
      const material = new T.MeshStandardMaterial({
        color: SYSTEMS.find((entry) => entry.id === system)?.color ?? '#aebbb8',
        metalness: 0.08,
        roughness: 0.53,
        side: T.DoubleSide,
        transparent: surface,
        opacity: surface ? 0.1 : 1,
        depthWrite: !surface,
      })
      material.onBeforeCompile = (shader) => {
        shader.uniforms.partState = { value: partTexture }
        shader.uniforms.selectionState = { value: selectionTexture }
        shader.uniforms.stateWidth = { value: width }
        shader.vertexShader =
          'attribute float partIndex; uniform sampler2D partState; uniform sampler2D selectionState; uniform float stateWidth; varying float partVisible; varying float partSelected;\n' +
          shader.vertexShader
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\nvec2 stateUv = vec2((partIndex + 0.5) / stateWidth, 0.5); vec4 state = texture2D(partState, stateUv); transformed += state.xyz; partVisible = state.w; partSelected = texture2D(selectionState, stateUv).r;'
        )
        shader.fragmentShader = 'varying float partVisible; varying float partSelected;\n' + shader.fragmentShader
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <clipping_planes_fragment>',
          '#include <clipping_planes_fragment>\nif (partVisible < 0.5) discard;'
        )
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <color_fragment>',
          '#include <color_fragment>\ndiffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.85, 0.78), partSelected * 0.75);'
        )
      }
      materials.push(material)
      return material
    }
    const systemMaterials = new Map(SYSTEMS.map((system) => [system.id, materialFor(system.id)]))

    let loaded = 0
    const loadChunk = async (index: number) => {
      const chunk = atlas.chunks[index]
      const response = await fetch(chunk.url, { signal: abort.signal })
      const buffer = await decodeModelResponse(response, chunk.bytes)
      if (disposed) return
      const groups = new Map<SystemId, T.BufferGeometry[]>()
      atlas.parts.forEach((part, i) => {
        if (part.chunk !== index) return
        const geometry = new T.BufferGeometry()
        geometry.setAttribute('position', new T.BufferAttribute(new Float32Array(buffer, part.positions, part.vertexCount * 3), 3))
        // GPU-normalised signed-short normals keep the whole atlas compact in memory.
        geometry.setAttribute('normal', new T.BufferAttribute(new Int16Array(buffer, part.normals, part.vertexCount * 3), 3, true))
        geometry.setIndex(new T.BufferAttribute(new Uint32Array(buffer, part.indices, part.indexCount), 1))
        geometry.boundingBox = bounds[i].clone()
        geometry.computeBoundingSphere()
        const pick = new T.Mesh(geometry)
        pick.matrixAutoUpdate = false
        pickers[i] = pick
        geometries.push(geometry)
        geometry.setAttribute('partIndex', new T.BufferAttribute(new Float32Array(part.vertexCount).fill(i), 1))
        const list = groups.get(part.system) ?? []
        list.push(geometry)
        groups.set(part.system, list)
      })
      groups.forEach((list, system) => {
        const merged = mergeGeometries(list, false)
        if (!merged) throw new Error('Geometri anatomi tidak bisa disusun.')
        geometries.push(merged)
        const mesh = new T.Mesh(merged, systemMaterials.get(system))
        mesh.frustumCulled = false
        scene.add(mesh)
      })
      lastState = null
      loaded++
      report.current.onProgress(Math.round((loaded / atlas.chunks.length) * 100))
      dirty = true
    }
    void (async () => {
      try {
        let cursor = 0
        await Promise.all(
          Array.from({ length: 3 }, async () => {
            while (cursor < atlas.chunks.length) await loadChunk(cursor++)
          })
        )
        if (!disposed) {
          ready = true
          dirty = true
        }
      } catch (error) {
        if (!disposed) report.current.onError(error instanceof Error ? error.message : 'Anatomi tidak bisa dimuat.')
      }
    })()

    const fit = (view: string, extent = 0) => {
      const mobile = el.clientWidth < NARROW
      const halfFov = 2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2))
      const normalDistance = mobile ? Math.max(4.5, (1.8 * el.clientHeight) / Math.max(160, el.clientHeight - 350) / halfFov) : 4
      const reservedHeight = mobile ? 350 : 270
      const availableAspect = Math.max(0.35, (el.clientWidth - (mobile ? 40 : 340)) / Math.max(160, el.clientHeight - reservedHeight))
      const atlasDistance =
        (Math.max(packingHeight, packingWidth / availableAspect) / halfFov) * (el.clientHeight / Math.max(160, el.clientHeight - reservedHeight)) * 1.08
      const distance = T.MathUtils.lerp(normalDistance, Math.max(0.2, atlasDistance), extent)
      const facing = extent > 0.8 ? 'front' : view
      const direction =
        facing === 'front'
          ? new T.Vector3(0, 0.02, 1)
          : facing === 'back'
            ? new T.Vector3(0, 0.02, -1)
            : facing === 'side'
              ? new T.Vector3(1, 0.02, 0)
              : new T.Vector3(0.35, 0.06, 1).normalize()
      controls.target.set(extent > 0.1 && !mobile ? -packingWidth * 0.12 : 0, extent > 0.1 || mobile ? 0.85 : 0.68, 0)
      camera.position.copy(controls.target).addScaledVector(direction, distance)
      controls.update()
      dirty = true
    }
    const resize = () => {
      layoutKey = ''
      lastState = null
      renderer.setPixelRatio(Math.min(devicePixelRatio, el.clientWidth < 768 || el.clientHeight < 600 ? 1.5 : 2))
      camera.aspect = el.clientWidth / Math.max(1, el.clientHeight)
      camera.updateProjectionMatrix()
      renderer.setSize(el.clientWidth, el.clientHeight)
      fit(latest.current.view, amount)
    }
    const observer = new ResizeObserver(resize)
    observer.observe(el)

    const raycaster = new T.Raycaster()
    const pointer = new T.Vector2()
    const tap = new PointerTap()
    const worldBox = new T.Box3()
    const hitPoint = new T.Vector3()
    const hasSolid = () => atlas.parts.some((part, i) => part.system !== 'integumentary' && data[i * 4 + 3] > 0.5)
    const down = (event: PointerEvent) => {
      hover.hidden = true
      tap.down(event.pointerId, event.clientX, event.clientY, event.pointerType === 'touch' ? 12 : 5)
    }
    const move = (event: PointerEvent) => {
      tap.move(event.pointerId, event.clientX, event.clientY)
      if (event.buttons || amount < 0.5 || event.pointerType === 'touch') {
        hover.hidden = true
        return
      }
      const rect = el.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const index = findTarget(x, y, 12)
      hover.hidden = index < 0
      renderer.domElement.style.cursor = index < 0 ? 'grab' : 'pointer'
      if (index >= 0) {
        hover.textContent = naming.current(atlas.parts[index])
        hover.style.left = `${Math.max(8, Math.min(x + 14, el.clientWidth - 260))}px`
        hover.style.top = `${Math.max(8, Math.min(y + 18, el.clientHeight - 55))}px`
      }
    }
    const cancel = (event: PointerEvent) => tap.cancel(event.pointerId)
    const up = (event: PointerEvent) => {
      if (!tap.up(event.pointerId, event.clientX, event.clientY) || !ready) return
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, (-(event.clientY - rect.top) / rect.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      let nearest = Infinity
      let found = -1
      const solid = hasSolid()
      pickers.forEach((mesh, i) => {
        if (!mesh || data[i * 4 + 3] < 0.5 || (solid && atlas.parts[i].system === 'integumentary')) return
        worldBox.copy(bounds[i]).translate(mesh.position)
        if (!raycaster.ray.intersectBox(worldBox, hitPoint)) return
        const hits = raycaster.intersectObject(mesh, false)
        if (hits[0] && hits[0].distance < nearest) {
          nearest = hits[0].distance
          found = i
        }
      })
      if (found < 0 && amount > 0.45) found = findTarget(event.clientX - rect.left, event.clientY - rect.top, event.pointerType === 'touch' ? 24 : 16)
      if (found >= 0) {
        hover.hidden = true
        select.current(atlas.parts[found].id)
      }
    }
    renderer.domElement.addEventListener('pointerdown', down)
    renderer.domElement.addEventListener('pointermove', move)
    renderer.domElement.addEventListener('pointerup', up)
    renderer.domElement.addEventListener('pointercancel', cancel)

    const clock = new T.Clock()
    let lastExtent = -1
    const animate = () => {
      if (disposed) return
      frame = requestAnimationFrame(animate)
      const dt = Math.min(clock.getDelta(), 0.05)
      const s = latest.current
      const changed = lastState?.visible !== s.visible || lastState?.selected !== s.selected || lastState?.isolate !== s.isolate
      const moving = Math.abs(amount - s.explode) > 0.0001
      if (moving) {
        // Calm, damped approach; with reduced motion the body jumps straight to the new spacing.
        amount = still.current ? s.explode : T.MathUtils.damp(amount, s.explode, 8, dt)
        dirty = true
      }
      if (changed || moving || lastExtent < 0) {
        const visible = new Set(s.visible)
        const selection = new Set(s.selected)
        const visibleParts = atlas.parts.filter((part) => (s.isolate ? selection.has(part.id) : visible.has(part.system) || selection.has(part.id)))
        const nextLayoutKey = visibleParts.map((part) => part.id).join(',') + ':' + camera.aspect.toFixed(3)
        if (nextLayoutKey !== layoutKey) {
          const layout = createExplosionLayout(visibleParts, camera.aspect)
          packingWidth = layout.width
          packingHeight = layout.height
          atlas.parts.forEach((part, i) => {
            const cell = layout.cells.get(part.id)
            offsets[i] = cell ? new T.Vector3(cell.x, cell.y + 0.85, 0) : centers[i].clone()
          })
          layoutKey = nextLayoutKey
          if (amount > 0.05 && !s.isolate) fit(s.view, Math.max(0, (amount - 0.3) / 0.7))
        }
        atlas.parts.forEach((part, i) => {
          const center = centers[i]
          const destination = offsets[i]
          const group = SYSTEMS.findIndex((system) => system.id === part.system)
          const angle = (group / SYSTEMS.length) * Math.PI * 2
          let dx: number
          let dy: number
          let dz: number
          if (amount <= 0.45) {
            const t = amount / 0.45
            dx = Math.sin(angle) * t * 0.48
            dy = (center.y - 0.85) * t * 0.28
            dz = Math.cos(angle) * t * 0.48
          } else {
            const t = (amount - 0.45) / 0.55
            dx = T.MathUtils.lerp(Math.sin(angle) * 0.48, destination.x - center.x, t)
            dy = T.MathUtils.lerp((center.y - 0.85) * 0.28, destination.y - center.y, t)
            dz = T.MathUtils.lerp(Math.cos(angle) * 0.48, -center.z, t)
          }
          const selected = selection.has(part.id)
          const shown = s.isolate ? selected : visible.has(part.system) || selected
          data.set([dx, dy, dz, shown ? 1 : 0], i * 4)
          selectedData[i * 4] = selected ? 255 : 0
          markerPositions.set(shown ? [center.x + dx, center.y + dy, center.z + dz] : [10000, 10000, 10000], i * 3)
          const mesh = pickers[i]
          if (mesh) {
            mesh.position.set(dx, dy, dz)
            mesh.updateMatrix()
            mesh.updateMatrixWorld(true)
          }
        })
        partTexture.needsUpdate = true
        selectionTexture.needsUpdate = true
        markerGeometry.attributes.position.needsUpdate = true
        lastState = s
        lastExtent = amount
        dirty = true
      }
      if (s.view !== lastView || s.reset !== lastReset) {
        fit(s.view, amount)
        lastView = s.view
        lastReset = s.reset
      }
      if (moving && !s.isolate) fit(amount > 0.5 ? 'front' : s.view, Math.max(0, (amount - 0.3) / 0.7))

      const isolateKey = s.isolate ? `${s.selected.join(',')}:${s.reset}:${s.inspectorOpen}:${camera.aspect}` : ''
      if (isolateKey !== lastIsolate || (s.isolate && moving)) {
        if (s.isolate) {
          const box = new T.Box3()
          atlas.parts.forEach((part, i) => {
            if (s.selected.includes(part.id)) box.union(bounds[i].clone().translate(new T.Vector3(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])))
          })
          if (!box.isEmpty()) {
            const center = box.getCenter(new T.Vector3())
            const size = box.getSize(new T.Vector3())
            const w = el.clientWidth
            const h = el.clientHeight
            const mobile = w < NARROW
            const landscape = w > h && h <= 600
            let left = 20
            let right = w - 20
            let top = mobile ? 120 : 80
            let bottom = h - 150
            if (s.inspectorOpen) {
              const stage = el.getBoundingClientRect()
              const detail = el.parentElement?.querySelector('[data-atlas-detail]')?.getBoundingClientRect()
              if (landscape) {
                right = w - 335
                top = 70
                bottom = h - 110
              } else if (mobile) {
                top = 110
                bottom = (detail ? detail.top - stage.top : h * 0.55) - 16
              } else {
                right = w - 370
                left = w > 1100 ? 305 : 25
              }
            }
            const availableWidth = Math.max(150, right - left)
            const availableHeight = Math.max(40, bottom - top)
            camera.setViewOffset(w, h, w / 2 - (left + right) / 2, h / 2 - (top + bottom) / 2, w, h)
            const distance = Math.max(
              0.07,
              (Math.max((size.y * h) / availableHeight, (size.x * w) / availableWidth / camera.aspect, size.z) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)))) * 1.35
            )
            controls.maxDistance = Math.max(40, distance * 2)
            controls.target.copy(center)
            camera.position.copy(center).add(new T.Vector3(0.2, 0.1, 1).normalize().multiplyScalar(distance))
            controls.update()
            dirty = true
          }
        } else if (lastIsolate) {
          camera.clearViewOffset()
          fit(s.view, amount)
        }
        lastIsolate = isolateKey
      }

      controls.enableRotate = amount < 0.8
      controls.mouseButtons.LEFT = amount < 0.8 ? T.MOUSE.ROTATE : T.MOUSE.PAN
      controls.touches.ONE = amount < 0.8 ? T.TOUCH.ROTATE : T.TOUCH.PAN
      platform.visible = ring.visible = innerRing.visible = amount < 0.5 && !s.isolate
      markers.visible = amount > 0.75
      controls.autoRotate = s.rotate && !s.isolate && amount < 0.4
      controls.autoRotateSpeed = 0.65
      controls.update()
      if (controls.autoRotate) dirty = true

      if (dirty) {
        renderer.render(scene, camera)
        targets = []
        if (amount > 0.45) {
          const solid = hasSolid()
          atlas.parts.forEach((part, i) => {
            if (data[i * 4 + 3] < 0.5 || (solid && part.system === 'integumentary')) return
            let left = Infinity
            let right = -Infinity
            let top = Infinity
            let bottom = -Infinity
            for (let corner = 0; corner < 8; corner++) {
              projected
                .set(
                  part.bounds[corner & 1 ? 1 : 0][0] + data[i * 4],
                  part.bounds[corner & 2 ? 1 : 0][1] + data[i * 4 + 1],
                  part.bounds[corner & 4 ? 1 : 0][2] + data[i * 4 + 2]
                )
                .project(camera)
              const x = ((projected.x + 1) * el.clientWidth) / 2
              const y = ((1 - projected.y) * el.clientHeight) / 2
              left = Math.min(left, x)
              right = Math.max(right, x)
              top = Math.min(top, y)
              bottom = Math.max(bottom, y)
            }
            projected.copy(centers[i]).add(new T.Vector3(data[i * 4], data[i * 4 + 1], data[i * 4 + 2])).project(camera)
            if (projected.z < -1 || projected.z > 1) return
            targets.push({ index: i, x: ((projected.x + 1) * el.clientWidth) / 2, y: ((1 - projected.y) * el.clientHeight) / 2, left, right, top, bottom })
          })
        }
        dirty = false
      }
    }
    animate()

    const contextLost = (event: Event) => {
      event.preventDefault()
      report.current.onError('Tampilan 3D dihentikan oleh perangkat. Muat ulang untuk melanjutkan.')
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost)

    return () => {
      disposed = true
      abort.abort()
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      scene.traverse((object) => {
        if (object instanceof T.Mesh && !geometries.includes(object.geometry)) {
          object.geometry.dispose()
          const list: T.Material[] = Array.isArray(object.material) ? object.material : [object.material]
          list.forEach((material) => material.dispose())
        }
      })
      env.dispose()
      partTexture.dispose()
      selectionTexture.dispose()
      markerGeometry.dispose()
      markerMaterial.dispose()
      hover.remove()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [atlas, hoverClassName])

  return <div className={className} ref={host} data-lenis-prevent />
}
