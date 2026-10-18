'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { totalCount, folderTotalCount, findFolderWithPath, type SearchItem } from './brain-data'
import type { BrainQuadrant, View } from './types'

type Store = Record<string, THREE.Vector3>

export type ContextNodeInfo =
  | { kind: 'doc'; slug: string; title: string; description: string | null; quadrantKey: string }
  | { kind: 'folder'; folderId: string; name: string; quadrantKey: string; docCount: number }
  | { kind: 'quadrant'; quadrantKey: string }

interface DynNode {
  id: string
  kind: 'folder' | 'doc'
  label: string
  count: number
  color: string
  target: THREE.Vector3
  onActivate: () => void
  info: ContextNodeInfo
}

interface OControls {
  getAzimuthalAngle(): number
  setAzimuthalAngle(v: number): void
  getPolarAngle(): number
  setPolarAngle(v: number): void
  update(): void
  object: THREE.PerspectiveCamera
  target: THREE.Vector3
}

const UP = new THREE.Vector3(0, 1, 0)
const RIGHT = new THREE.Vector3(1, 0, 0)
const ORIGIN = new THREE.Vector3(0, 0, 0)

function spherePoints(n: number, r: number): THREE.Vector3[] {
  if (n <= 1) return [new THREE.Vector3(0, 0, r)]
  const pts: THREE.Vector3[] = []
  const off = 2 / n
  const inc = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < n; i++) {
    const y = i * off - 1 + off / 2
    const rad = Math.sqrt(Math.max(0, 1 - y * y))
    const phi = i * inc
    pts.push(new THREE.Vector3(Math.cos(phi) * rad * r, y * r, Math.sin(phi) * rad * r))
  }
  return pts
}

const folderSize = (count: number) => 0.3 + Math.min(count, 34) * 0.022
const truncate = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s)

/* ---------- etiqueta sprite ---------- */

function makeTextSprite(main: string, sub: string | null, color: string) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  const mainPx = 52
  const subPx = 34
  ctx.font = `${mainPx}px sans-serif`
  const mainW = ctx.measureText(main).width
  ctx.font = `${subPx}px sans-serif`
  const subW = sub ? ctx.measureText(sub).width : 0
  const pad = 18
  const gap = sub ? 10 : 0
  const w = Math.ceil(Math.max(mainW, subW)) + pad * 2
  const h = mainPx + (sub ? subPx + gap : 0) + pad * 2
  canvas.width = w
  canvas.height = h
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.shadowColor = 'rgba(0,0,0,0.95)'
  ctx.shadowBlur = 8
  ctx.font = `${mainPx}px sans-serif`
  ctx.fillStyle = color
  ctx.fillText(main, w / 2, pad)
  if (sub) {
    ctx.font = `${subPx}px sans-serif`
    ctx.fillStyle = 'rgba(244,244,250,0.6)'
    ctx.fillText(sub, w / 2, pad + mainPx + gap)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.minFilter = THREE.LinearFilter
  tex.anisotropy = 4
  return { tex, w, h }
}

function Label({ main, sub, color, y }: { main: string; sub: string | null; color: string; y: number }) {
  const { tex, w, h } = useMemo(() => makeTextSprite(main, sub, color), [main, sub, color])
  useEffect(() => () => tex.dispose(), [tex])
  const s = 0.0055
  return (
    <sprite position={[0, y, 0]} scale={[w * s, h * s, 1]}>
      <spriteMaterial map={tex} transparent depthWrite={false} depthTest={false} toneMapped={false} />
    </sprite>
  )
}

/* ---------- nodo ---------- */

interface NodeProps {
  id: string
  kind: 'core' | 'folder' | 'doc'
  color: string
  size: number
  label: string
  sub: string | null
  visible: boolean
  showLabel: boolean
  seed: number
  store: Store
  onActivate?: () => void
  onPreview?: (clientX: number, clientY: number) => void
}

function Node(props: NodeProps) {
  const { id, kind, color, size, label, sub, visible, showLabel, seed, store, onActivate, onPreview } = props
  const group = useRef<THREE.Group>(null)
  const mesh = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const lastTap = useRef(0)
  const desired = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const tgt = store[id] ?? ORIGIN
    desired.copy(tgt)
    desired.x += Math.sin(t * 0.6 + seed) * 0.12
    desired.y += Math.cos(t * 0.5 + seed * 1.7) * 0.14
    desired.z += Math.sin(t * 0.4 + seed * 2.3) * 0.12
    g.position.lerp(desired, 0.07)
    const baseScale = visible ? (hovered ? 1.3 : 1) : 0.0001
    g.scale.setScalar(THREE.MathUtils.lerp(g.scale.x, baseScale, 0.14))
    if (mat.current) mat.current.emissiveIntensity = (hovered ? 2.6 : 1.7) + Math.sin(t * 1.6 + seed) * 0.4
    if (kind === 'doc' && mesh.current) mesh.current.rotation.y = t * 0.6 + seed
  })

  function handleClick(e: { stopPropagation: () => void; clientX?: number; clientY?: number }) {
    e.stopPropagation()
    if (!visible) return
    const now = performance.now()
    if (now - lastTap.current < 330) {
      lastTap.current = 0
      onActivate?.()
    } else {
      lastTap.current = now
      if (onPreview && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
        onPreview(e.clientX, e.clientY)
      }
    }
  }

  return (
    <group ref={group}>
      <mesh
        ref={mesh}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!visible) return
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        {kind === 'doc' ? <octahedronGeometry args={[size, 0]} /> : <sphereGeometry args={[size, 32, 32]} />}
        <meshStandardMaterial
          ref={mat}
          color={color}
          emissive={color}
          emissiveIntensity={1.7}
          roughness={0.25}
          metalness={0.1}
          flatShading={kind === 'doc'}
          toneMapped={false}
        />
      </mesh>
      {showLabel && <Label main={label} sub={sub} color={kind === 'doc' ? '#F4F4FA' : color} y={-size - 0.55} />}
    </group>
  )
}

/* ---------- sinapsis ---------- */

const SYN_SEG = 26

function Synapse({ fromId, toId, color, strong, store, seed }: { fromId: string; toId: string; color: string; strong: boolean; store: Store; seed: number }) {
  const pulse = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const attr = new THREE.BufferAttribute(new Float32Array((SYN_SEG + 1) * 3), 3)
    attr.setUsage(THREE.DynamicDrawUsage)
    g.setAttribute('position', attr)
    return g
  }, [])
  const tmp = useMemo(
    () => ({
      curve: new THREE.QuadraticBezierCurve3(new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()),
      mid: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      perp: new THREE.Vector3(),
      pt: new THREE.Vector3(),
    }),
    [],
  )
  useEffect(() => () => geo.dispose(), [geo])

  useFrame((state) => {
    const a = store[fromId]
    const b = store[toId]
    if (!a || !b) return
    tmp.dir.subVectors(b, a)
    const len = tmp.dir.length()
    tmp.perp.crossVectors(tmp.dir, UP)
    if (tmp.perp.lengthSq() < 0.0001) tmp.perp.crossVectors(tmp.dir, RIGHT)
    tmp.perp.normalize().multiplyScalar(len * 0.16)
    tmp.mid.copy(a).add(b).multiplyScalar(0.5).add(tmp.perp)
    tmp.curve.v0.copy(a)
    tmp.curve.v1.copy(tmp.mid)
    tmp.curve.v2.copy(b)
    const posAttr = geo.attributes.position as THREE.BufferAttribute
    const arr = posAttr.array as Float32Array
    for (let i = 0; i <= SYN_SEG; i++) {
      tmp.curve.getPoint(i / SYN_SEG, tmp.pt)
      arr[i * 3] = tmp.pt.x
      arr[i * 3 + 1] = tmp.pt.y
      arr[i * 3 + 2] = tmp.pt.z
    }
    posAttr.needsUpdate = true
    if (pulse.current) {
      const speed = strong ? 0.45 : 0.28
      tmp.curve.getPoint((state.clock.elapsedTime * speed + seed) % 1, tmp.pt)
      pulse.current.position.copy(tmp.pt)
    }
  }, 1)

  return (
    <group>
      {/* @ts-expect-error three line element */}
      <line geometry={geo}>
        <lineBasicMaterial color={color} transparent opacity={strong ? 0.32 : 0.13} toneMapped={false} />
      </line>
      <mesh ref={pulse}>
        <sphereGeometry args={[strong ? 0.07 : 0.05, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

/* ---------- trackpad ---------- */

function TrackpadControls({ controls }: { controls: React.MutableRefObject<OControls | null> }) {
  const { gl } = useThree()
  const vel = useRef({ az: 0, pol: 0, dist: 0 })
  const scratch = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    const el = gl.domElement
    const MAX = 0.12
    const clamp = (x: number) => Math.max(-MAX, Math.min(MAX, x))
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (e.ctrlKey || e.metaKey) {
        vel.current.dist += e.deltaY * 0.01
      } else {
        vel.current.az = clamp(vel.current.az + e.deltaX * 0.0042)
        vel.current.pol = clamp(vel.current.pol + e.deltaY * 0.0042)
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [gl])

  useFrame(() => {
    const c = controls.current
    if (!c) return
    const v = vel.current
    if (Math.abs(v.az) < 1e-4 && Math.abs(v.pol) < 1e-4 && Math.abs(v.dist) < 1e-4) return
    c.setAzimuthalAngle(c.getAzimuthalAngle() + v.az)
    c.setPolarAngle(Math.min(Math.PI - 0.2, Math.max(0.2, c.getPolarAngle() + v.pol)))
    if (Math.abs(v.dist) > 1e-4) {
      const offset = scratch.copy(c.object.position).sub(c.target)
      const d = Math.min(20, Math.max(4, offset.length() + v.dist))
      c.object.position.copy(c.target).add(offset.setLength(d))
    }
    c.update()
    v.az *= 0.88
    v.pol *= 0.88
    v.dist *= 0.85
  })
  return null
}

/* ---------- escena ---------- */

export function Scene({
  data,
  crossLinks,
  view,
  setView,
  onOpenDoc,
  onPreviewNode,
  coreName = 'Knowledge',
  coreColor = '#EBD9A8',
}: {
  data: BrainQuadrant[]
  crossLinks: [string, string][]
  view: View
  setView: (v: View) => void
  onOpenDoc: (slug: string) => void
  /** Primer tap en un doc → preview (card flotante con título completo y descripción). */
  onPreviewNode?: (info: ContextNodeInfo, clientX: number, clientY: number) => void
  /**
   * Nombre del proyecto en la bola central del cerebro 3D. El skill es
   * genérico: cada proyecto pasa el suyo (AcmeSaaS, MiEcosistema, etc).
   * Default "Knowledge" para mantener el render aunque no se configure.
   */
  coreName?: string
  /** Color del núcleo central. Default dorado claro. */
  coreColor?: string
}) {
  const controls = useRef<OControls | null>(null)
  const zoom = useRef<THREE.Group>(null)

  const QUAD_POS = useMemo(() => spherePoints(data.length, 4.4), [data.length])

  // Cuadrante + path actuales
  const selectedQ = useMemo(() => {
    if (view.level === 'quadrant') return data.find((q) => q.key === view.q) ?? null
    if (view.level === 'folder') {
      const found = findFolderWithPath(data, view.folderId)
      return found?.quadrant ?? null
    }
    return null
  }, [data, view])

  const totalDocs = useMemo(() => data.reduce((n, q) => n + totalCount(q), 0), [data])

  // Store de posiciones (vivo: nodes escriben, synapses leen)
  const store = useMemo<Store>(() => {
    const s: Store = { core: new THREE.Vector3() }
    data.forEach((q, i) => {
      s[q.key] = QUAD_POS[i].clone()
    })
    return s
  }, [data, QUAD_POS])

  // Nodos dinámicos del nivel actual (folder o quadrant)
  const dynNodes = useMemo<DynNode[]>(() => {
    if (view.level === 'overview') return []
    if (!selectedQ) return []

    let folders: typeof selectedQ.rootFolders = []
    let docs: typeof selectedQ.rootDocs = []
    if (view.level === 'quadrant') {
      folders = selectedQ.rootFolders
      docs = selectedQ.rootDocs
    } else {
      const found = findFolderWithPath(data, view.folderId)
      const current = found?.path[found.path.length - 1]
      if (!current) return []
      folders = current.subFolders
      docs = current.docs
    }

    const items: DynNode[] = []
    folders.forEach((f) => {
      const count = folderTotalCount(f)
      items.push({
        id: `folder:${f.id}`,
        kind: 'folder',
        label: f.name,
        count,
        color: selectedQ.color,
        target: new THREE.Vector3(),
        onActivate: () => setView({ level: 'folder', folderId: f.id }),
        info: { kind: 'folder', folderId: f.id, name: f.name, quadrantKey: selectedQ.key, docCount: count },
      })
    })
    docs.forEach((doc) => {
      items.push({
        id: `doc:${doc.id}`,
        kind: 'doc',
        label: doc.title,
        count: 0,
        color: selectedQ.color,
        target: new THREE.Vector3(),
        onActivate: () => onOpenDoc(doc.slug),
        info: { kind: 'doc', slug: doc.slug, title: doc.title, description: doc.description, quadrantKey: selectedQ.key },
      })
    })

    const pts = spherePoints(items.length, view.level === 'quadrant' ? 3.1 : 2.7)
    items.forEach((it, i) => it.target.copy(pts[i]))
    // Inicializar posiciones de items recién aparecidos
    for (const it of items) {
      if (!store[it.id]) store[it.id] = new THREE.Vector3()
    }
    return items
  }, [data, view, selectedQ, setView, onOpenDoc, store])

  useFrame(() => {
    store.core.set(0, 0, 0)
    data.forEach((q, i) => {
      const s = store[q.key]
      if (view.level === 'overview') s.copy(QUAD_POS[i])
      else if (selectedQ && q.key === selectedQ.key) s.set(0, 0, 0)
      else s.copy(QUAD_POS[i]).multiplyScalar(2.6)
    })
    dynNodes.forEach((n) => store[n.id]?.copy(n.target))
    if (zoom.current) {
      const target = view.level === 'overview' ? 1 : view.level === 'quadrant' ? 1.5 : 1.95
      zoom.current.scale.setScalar(THREE.MathUtils.lerp(zoom.current.scale.x, target, 0.08))
    }
  })

  // Sinapsis
  const synapses = useMemo(() => {
    const out: { from: string; to: string; color: string; strong: boolean; seed: number }[] = []
    if (view.level === 'overview') {
      data.forEach((q, i) => out.push({ from: 'core', to: q.key, color: q.color, strong: true, seed: i * 0.3 }))
      crossLinks.forEach(([a, b], i) => out.push({ from: a, to: b, color: '#C2A665', strong: false, seed: 0.5 + i * 0.2 }))
    } else if (selectedQ) {
      dynNodes.forEach((n, i) => out.push({ from: selectedQ.key, to: n.id, color: selectedQ.color, strong: n.kind === 'folder', seed: i * 0.3 }))
    }
    return out
  }, [view, selectedQ, dynNodes, data, crossLinks])

  return (
    <>
      <color attach="background" args={['#050505']} />
      <fog attach="fog" args={['#050505', 10, 26]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 8]} intensity={40} color="#C2A665" />
      <pointLight position={[-8, -4, -6]} intensity={25} color="#460DA1" />
      <Stars radius={70} depth={50} count={700} factor={3} saturation={0} fade speed={0.4} />

      <group ref={zoom}>
        <Node
          id="core"
          kind="core"
          color={coreColor}
          size={0.7}
          label={coreName}
          sub={`${totalDocs} docs`}
          visible={view.level === 'overview'}
          showLabel={view.level === 'overview'}
          seed={0}
          store={store}
          onActivate={() => setView({ level: 'overview' })}
        />

        {data.map((q, i) => {
          const isSelected = !!selectedQ && q.key === selectedQ.key && view.level !== 'overview'
          // En vista quadrant mostramos la esfera del cuadrante en el centro.
          // En vista folder no la mostramos (la folder activa toma el centro vía dynNodes implícito).
          const showLabel = view.level === 'overview' || (view.level === 'quadrant' && isSelected)
          return (
            <Node
              key={q.key}
              id={q.key}
              kind="folder"
              color={q.color}
              size={folderSize(totalCount(q))}
              label={q.label}
              sub={`${totalCount(q)} docs`}
              visible={view.level === 'overview' || (view.level === 'quadrant' && isSelected)}
              showLabel={showLabel}
              seed={i * 1.3}
              store={store}
              onActivate={() => view.level === 'overview' ? setView({ level: 'quadrant', q: q.key }) : setView({ level: 'overview' })}
            />
          )
        })}

        {dynNodes.map((n, i) => (
          <Node
            key={n.id}
            id={n.id}
            kind={n.kind}
            color={n.color}
            size={n.kind === 'doc' ? 0.24 : folderSize(n.count)}
            label={truncate(n.label, n.kind === 'doc' ? 22 : 18)}
            sub={n.kind === 'folder' ? `${n.count} docs` : null}
            visible
            showLabel
            seed={6 + i * 0.7}
            store={store}
            onActivate={n.onActivate}
            onPreview={
              onPreviewNode && n.info.kind === 'doc'
                ? (x, y) => onPreviewNode(n.info, x, y)
                : undefined
            }
          />
        ))}

        {synapses.map((s) => (
          <Synapse key={`${s.from}->${s.to}`} fromId={s.from} toId={s.to} color={s.color} strong={s.strong} store={store} seed={s.seed} />
        ))}
      </group>

      <OrbitControls
        ref={(r) => {
          controls.current = r as unknown as OControls | null
        }}
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={view.level === 'overview' ? 0.45 : 0.18}
        enableDamping
        dampingFactor={0.1}
        rotateSpeed={0.9}
      />
      <TrackpadControls controls={controls} />
      <EffectComposer>
        <Bloom intensity={1.15} luminanceThreshold={0.2} luminanceSmoothing={0.4} mipmapBlur radius={0.7} />
      </EffectComposer>
    </>
  )
}

export type { SearchItem }
