'use client'

import { useEffect, useRef, useState } from 'react'
import { COUNTRY_PATHS, MAP_W, MAP_H, project } from './world-map'

/* ============================================================================
 * Dashboard del OS — Home. Estilo brandkit moderno (surface-elevated rounded-2xl,
 * gradiente dorado, escala ink) + núcleo de IA vivo (bola de energía), funnel,
 * mapa mundi, feed en vivo, telemetría. Optimizado (DPR capado, capas cacheadas,
 * sin shadowBlur en bucles). TODO el acento = token `brand` (white-label).
 * Datos de EJEMPLO. Sin dependencias.
 * ========================================================================== */

const RANGES = ['Hoy', 'Esta semana', 'Este mes', 'Este año', 'Q1', 'Q2', 'Q3', 'Q4', 'Últimos 7 días', 'Últimos 15 días', 'Últimos 30 días', 'Personalizado…']
const REVENUE = [28, 31, 30, 35, 38, 42, 39, 41, 44, 46, 45, 48]
const PROFIT = [16, 18, 17, 21, 23, 26, 24, 25, 27, 29, 28, 30]
const AREAS = [{ k: 'Marketing', v: 0.82 }, { k: 'Ventas', v: 0.68 }, { k: 'Producto', v: 0.9 }, { k: 'Finanzas', v: 0.74 }, { k: 'Personal', v: 0.6 }, { k: 'Reglas', v: 0.5 }]
const RANK = [{ k: 'Plan Anual', v: 92 }, { k: 'Plan Mensual', v: 74 }, { k: 'Add-on Pro', v: 58 }, { k: 'Consultoría', v: 41 }, { k: 'Setup', v: 27 }]
const FUNNEL = [
  { l: 'Visitantes', v: 120000, col: 'rgb(var(--brand))', fade: 'rgb(var(--brand)/0.12)' },
  { l: 'Leads', v: 45000, col: '#5b8def', fade: 'rgba(91,141,239,0.12)' },
  { l: 'Prospectos', v: 18000, col: '#22d3ee', fade: 'rgba(34,211,238,0.12)' },
  { l: 'Clientes', v: 6750, col: '#34d399', fade: 'rgba(52,211,153,0.12)' },
]
const GEO = [{ k: 'España', v: 42, lat: 40.4, lon: -3.7 }, { k: 'México', v: 18, lat: 23.6, lon: -102.5 }, { k: 'Argentina', v: 12, lat: -38.4, lon: -63.6 }, { k: 'Colombia', v: 9, lat: 4.6, lon: -74.3 }, { k: 'USA', v: 7, lat: 39.8, lon: -98.6 }]
const FEED = [{ t: 'Nuevo pedido', s: '€149 · Plan Anual', a: 'ahora', hot: true }, { t: 'Nuevo cliente', s: 'María G.', a: '2 min' }, { t: 'Pago recibido', s: '€980 · Confrater', a: '8 min' }, { t: 'Reembolso', s: '€37', a: '21 min' }, { t: 'Nuevo lead', s: 'desde Instagram', a: '34 min' }]
const sp = (b: number, a: number) => Array.from({ length: 16 }, (_, i) => b + Math.sin(i / 1.5) * a + Math.cos(i / 3) * a * 0.5)
type Kpi = { label: string; value: number; fmt: (n: number) => string; delta: string; up: boolean; spark: number[] }
const KPIS: Kpi[] = [
  { label: 'Clientes', value: 1284, fmt: (n) => Math.round(n).toLocaleString('es-ES'), delta: '+8,1%', up: true, spark: sp(30, 8) },
  { label: 'Ticket medio', value: 37.6, fmt: (n) => '€' + n.toFixed(2).replace('.', ','), delta: '+3,2%', up: true, spark: sp(34, 5) },
  { label: 'Frecuencia', value: 2.4, fmt: (n) => n.toFixed(1).replace('.', ',') + '×', delta: '+0,3', up: true, spark: sp(20, 4) },
  { label: 'Margen', value: 62, fmt: (n) => Math.round(n) + '%', delta: '-1,1%', up: false, spark: sp(60, 4) },
  { label: 'Beneficio', value: 29910, fmt: (n) => '€' + Math.round(n).toLocaleString('es-ES'), delta: '+14,0%', up: true, spark: sp(26, 9) },
  { label: 'Retención', value: 71, fmt: (n) => Math.round(n) + '%', delta: '+2,0%', up: true, spark: sp(66, 5) },
  { label: 'Churn', value: 5.2, fmt: (n) => n.toFixed(1).replace('.', ',') + '%', delta: '-0,6%', up: true, spark: sp(7, 3) },
  { label: 'LTV', value: 312, fmt: (n) => '€' + Math.round(n), delta: '+9,7%', up: true, spark: sp(28, 9) },
]
const DPR = () => Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 1, 1.5)

/* ---------- hooks ---------- */
function useCountUp(target: number, duration = 1600, delay = 0) {
  const [val, setVal] = useState(0)
  useEffect(() => { let raf = 0, start: number | null = null; const t0 = setTimeout(() => { const tick = (t: number) => { if (start === null) start = t; const p = Math.min(1, (t - start) / duration); setVal(target * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }; raf = requestAnimationFrame(tick) }, delay); return () => { clearTimeout(t0); cancelAnimationFrame(raf) } }, [target, duration, delay]); return val
}
function useLiveTick(base: number, jitter: number, ms = 2000) { const [v, setV] = useState(base); useEffect(() => { const id = setInterval(() => setV(base + (Math.random() - 0.5) * jitter * 2), ms); return () => clearInterval(id) }, [base, jitter, ms]); return v }
function useNow() { const [d, setD] = useState<Date | null>(null); useEffect(() => { const f = () => setD(new Date()); f(); const id = setInterval(f, 1000); return () => clearInterval(id) }, []); return d }

/* ---------- bola de energía (núcleo IA) · throttle 30fps ---------- */
function EnergyOrb() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const cv = ref.current!; const ctx = cv.getContext('2d')!; const brand = getComputedStyle(cv).getPropertyValue('--brand').trim() || '194 166 101'
    let w = 0, h = 0, raf = 0, t = 0, run = true, last = 0; const dpr = DPR()
    const parts = Array.from({ length: 20 }, () => ({ a: Math.random() * 7, r: 0.5 + Math.random() * 0.55, sp: 0.006 + Math.random() * 0.01, z: Math.random(), s: Math.random() * 1.4 + 0.5 }))
    const resize = () => { w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0) }
    resize(); const ro = new ResizeObserver(resize); ro.observe(cv)
    const vis = () => { run = !document.hidden }; document.addEventListener('visibilitychange', vis)
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!run || now - last < 33) return
      last = now
      ctx.clearRect(0, 0, w, h); const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.26; t += 0.045
      let g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.3); g.addColorStop(0, `rgb(${brand} / 0.22)`); g.addColorStop(0.4, `rgb(${brand} / 0.06)`); g.addColorStop(1, `rgb(${brand} / 0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 2.3, 0, 7); ctx.fill()
      for (let k = 0; k < 3; k++) { const pr = ((t * 0.12 + k / 3) % 1); ctx.strokeStyle = `rgb(${brand} / ${(1 - pr) * 0.25})`; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(cx, cy, R * (1.15 + pr * 1.25), 0, 7); ctx.stroke() }
      for (let layer = 0; layer < 2; layer++) {
        ctx.beginPath(); const amp = R * 0.14, segs = 64
        for (let i = 0; i <= segs; i++) { const ang = (i / segs) * Math.PI * 2; const wv = Math.sin(ang * 3 + t + layer * 1.7) * amp * 0.5 + Math.sin(ang * 6 - t * 1.4 + layer) * amp * 0.35; const rr = R + wv; const x = cx + Math.cos(ang) * rr, y = cy + Math.sin(ang) * rr; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) }
        ctx.closePath(); ctx.fillStyle = `rgb(${brand} / ${layer === 0 ? 0.1 : 0.05})`; ctx.fill(); ctx.strokeStyle = `rgb(${brand} / ${layer === 0 ? 0.6 : 0.28})`; ctx.lineWidth = layer === 0 ? 1.6 : 1; ctx.stroke()
      }
      const pulse = 1 + Math.sin(t * 1.6) * 0.09
      g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7 * pulse); g.addColorStop(0, 'rgb(255 255 255 / 0.95)'); g.addColorStop(0.28, `rgb(${brand} / 0.85)`); g.addColorStop(1, `rgb(${brand} / 0)`); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.6 * pulse, 0, 7); ctx.fill()
      for (const p of parts) { p.a += p.sp; const rr = R * (1.05 + p.r * 0.7); const x = cx + Math.cos(p.a) * rr, y = cy + Math.sin(p.a) * rr * 0.55; ctx.fillStyle = `rgb(${brand} / ${0.35 + p.z * 0.5})`; ctx.beginPath(); ctx.arc(x, y, p.s, 0, 7); ctx.fill() }
    }
    raf = requestAnimationFrame(loop); return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', vis) }
  }, [])
  return <canvas ref={ref} className="h-full w-full" />
}

/* ---------- mapa mundi REAL · SVG con fronteras reales (177 países) ---------- */
function WorldMap() {
  return (
    <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" className="h-full w-full">
      {COUNTRY_PATHS.map((d, i) => (
        <path key={i} d={d} fill="rgb(var(--brand)/0.07)" stroke="rgb(var(--brand)/0.24)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
      ))}
      {GEO.map((g) => {
        const [x, y] = project(g.lat, g.lon)
        return (
          <g key={g.k}>
            <circle cx={x} cy={y} r={7 + g.v / 5} className="pulse-dot" fill="rgb(var(--brand)/0.16)" />
            <circle cx={x} cy={y} r={4.5} fill="rgb(var(--brand))" stroke="#0d0b18" strokeWidth={1} />
          </g>
        )
      })}
    </svg>
  )
}

/* ---------- card brandkit (surface-elevated rounded-2xl) ---------- */
function Card({ children, className = '', title, delay = 0, glow = false }: { children: React.ReactNode; className?: string; title?: string; delay?: number; glow?: boolean }) {
  return (
    <div className={`hud-in relative rounded-2xl border border-white/[0.08] transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 ${className}`}
      style={{ animationDelay: `${delay}ms`, background: 'linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0) 55%), #16161a', boxShadow: glow ? '0 12px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06), 0 0 70px -22px rgb(var(--brand)/0.5)' : '0 12px 32px rgba(0,0,0,0.6)' }}>
      {title && <div className="flex items-center gap-2.5 px-5 pt-5"><span className="h-3.5 w-0.5 rounded bg-brand" /><span className="eyebrow">{title}</span></div>}
      {children}
    </div>
  )
}

function KpiCard({ k, i }: { k: Kpi; i: number }) {
  const v = useCountUp(k.value, 1400, 300 + i * 45)
  return (
    <Card delay={80 + i * 35} className="group relative overflow-hidden p-5 sm:p-6">
      <span className="absolute left-0 top-0 h-full w-[3px] bg-brand/70" />
      <span className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(circle, rgb(var(--brand)/0.18), transparent 70%)' }} />
      <div className="flex items-center gap-2">
        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{k.label}</span>
      </div>
      <div className="mt-3 text-[26px] font-bold leading-none tabular-nums text-neutral-50 sm:text-[30px]">{k.fmt(v)}</div>
      <div className="mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ background: k.up ? 'rgba(52,211,153,0.14)' : 'rgba(251,113,133,0.14)', color: k.up ? '#6ee7b7' : '#fda4af' }}>
        <span className="text-[9px]">{k.up ? '▲' : '▼'}</span> {k.delta}
      </div>
    </Card>
  )
}
const MONTHS_FULL = ['Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun']
function AreaChart() {
  const [hi, setHi] = useState<number | null>(null)
  const W = 640, H = 220, padL = 46, padR = 18, padT = 18, padB = 30
  const plotW = W - padL - padR, plotH = H - padT - padB
  const max = Math.max(...REVENUE, ...PROFIT) * 1.12, r = max || 1
  const x = (i: number) => padL + (i / (REVENUE.length - 1)) * plotW
  const y = (val: number) => padT + plotH - (val / r) * plotH
  const line = (d: number[]) => d.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(val).toFixed(1)}`).join(' ')
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round((r * t) / 5) * 5)
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect(); const rel = ((e.clientX - rect.left) / rect.width) * W
    const idx = Math.round(((rel - padL) / plotW) * (REVENUE.length - 1)); setHi(Math.max(0, Math.min(REVENUE.length - 1, idx)))
  }
  return (
    <div className="relative w-full" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
        {ticks.map((gv, i) => { const yy = y(gv); return (<g key={i}><line x1={padL} x2={W - padR} y1={yy} y2={yy} className="stroke-white/[0.06]" /><text x={padL - 10} y={yy + 3.5} textAnchor="end" className="fill-neutral-500" style={{ fontSize: 11 }}>€{gv}k</text></g>) })}
        <path d={`${line(REVENUE)} L${x(REVENUE.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} className="fill-brand/[0.12]" />
        <path d={line(REVENUE)} fill="none" className="stroke-brand" strokeWidth={2.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <path d={line(PROFIT)} fill="none" className="stroke-white/50" strokeWidth={1.6} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        {REVENUE.map((_, i) => (<text key={i} x={x(i)} y={H - 9} textAnchor="middle" className={hi === i ? 'fill-brand' : 'fill-neutral-500'} style={{ fontSize: 11, fontWeight: hi === i ? 700 : 400 }}>{MONTHS_FULL[i]}</text>))}
        {hi !== null && (<g><line x1={x(hi)} x2={x(hi)} y1={padT} y2={padT + plotH} className="stroke-brand/50" strokeWidth={1} /><circle cx={x(hi)} cy={y(REVENUE[hi])} r={4.5} className="fill-brand" stroke="#0d0b18" strokeWidth={1.5} /><circle cx={x(hi)} cy={y(PROFIT[hi])} r={3.5} fill="#fff" stroke="#0d0b18" strokeWidth={1.5} /></g>)}
      </svg>
      {hi !== null && (
        <div className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-white/12 bg-neutral-900/95 px-3.5 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" style={{ left: `${(x(hi) / W) * 100}%`, top: 4 }}>
          <div className="text-[12px] font-bold text-neutral-100">{MONTHS_FULL[hi]}</div>
          <div className="mt-1.5 flex items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-brand"><span className="h-1.5 w-3.5 rounded-full bg-brand" />Ingresos €{REVENUE[hi]}k</div>
          <div className="mt-1 flex items-center gap-2 whitespace-nowrap text-[11px] font-medium text-neutral-300"><span className="h-0.5 w-3.5 rounded-full bg-white/60" />Beneficio €{PROFIT[hi]}k</div>
        </div>
      )}
    </div>
  )
}
function Radar() {
  const cx = 90, cy = 84, R = 58, n = AREAS.length, ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2
  const pt = (i: number, rr: number) => `${(cx + Math.cos(ang(i)) * R * rr).toFixed(1)},${(cy + Math.sin(ang(i)) * R * rr).toFixed(1)}`
  return (<svg viewBox="0 0 180 172" className="mx-auto w-full max-w-[200px]">{[0.33, 0.66, 1].map((g) => <polygon key={g} points={AREAS.map((_, i) => pt(i, g)).join(' ')} fill="none" className="stroke-white/[0.08]" />)}{AREAS.map((_, i) => <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(ang(i)) * R} y2={cy + Math.sin(ang(i)) * R} className="stroke-white/[0.06]" />)}<polygon points={AREAS.map((a, i) => pt(i, a.v)).join(' ')} className="radar-in fill-brand/20 stroke-brand" strokeWidth={1.6} />{AREAS.map((a, i) => <text key={i} x={cx + Math.cos(ang(i)) * (R + 12)} y={cy + Math.sin(ang(i)) * (R + 12)} textAnchor="middle" dominantBaseline="middle" className="fill-neutral-400" style={{ fontSize: 8 }}>{a.k}</text>)}</svg>)
}
function Funnel() {
  const max = FUNNEL[0].v
  return (<div className="space-y-2 px-5 pb-4 pt-4">{FUNNEL.map((s, i) => { const wid = 24 + 76 * (s.v / max); return (<div key={s.l} className="flex items-center gap-3"><div className="relative mx-auto h-9" style={{ width: `${wid}%` }}><div className="funnel-in absolute inset-0" style={{ clipPath: 'polygon(6% 0,94% 0,82% 100%,18% 100%)', background: `linear-gradient(180deg, ${s.col}, ${s.fade})`, border: `1px solid ${s.col}`, boxShadow: `0 0 18px -5px ${s.col}`, animationDelay: `${i * 110}ms` }} /><div className="absolute inset-0 flex items-center justify-center"><span className="text-[11px] font-bold text-white">{s.v.toLocaleString('es-ES')}</span></div></div><span className="w-20 shrink-0 text-[10px] font-semibold uppercase tracking-wide" style={{ color: s.col }}>{s.l}</span></div>) })}<div className="mt-2 flex justify-between border-t border-white/[0.08] pt-3 text-[11px]"><span className="text-neutral-400">Conversión total</span><span className="font-bold text-brand">3,42%</span></div></div>)
}
function ClientMap() {
  return (<div className="px-5 pb-5"><div className="mt-3 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] p-2"><div className="aspect-[2/1] w-full"><WorldMap /></div></div><div className="mt-4 space-y-2.5">{GEO.map((l, i) => (<div key={l.k}><div className="flex justify-between text-[12px]"><span className="font-medium text-neutral-200">{l.k}</span><span className="font-bold text-brand">{l.v}%</span></div><div className="mt-1.5 h-1.5 rounded-full bg-white/[0.08]"><div className="barw h-full rounded-full bg-brand" style={{ width: `${l.v * 2.2}%`, animationDelay: `${i * 80}ms` }} /></div></div>))}</div></div>)
}
function RecentFeed() {
  return (<div className="space-y-2.5 px-5 pb-4 pt-4">{FEED.map((it, i) => (<div key={i} className="flex items-center gap-3"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.hot ? 'pulse-dot bg-emerald-400' : 'bg-brand'}`} /><div className="min-w-0 flex-1"><div className="truncate text-[12px] text-neutral-200">{it.t}</div><div className="truncate text-[10px] text-neutral-500">{it.s}</div></div><span className="text-[10px] text-neutral-600">{it.a}</span></div>))}</div>)
}
function Weather() { const t = useLiveTick(22, 0.3, 5000); return (<div className="flex items-center gap-2.5"><span className="text-2xl leading-none">☀</span><div className="leading-tight"><div className="text-lg font-bold text-neutral-100">{t.toFixed(1)}°</div><div className="text-[10px] text-neutral-400">Madrid · Despejado</div></div></div>) }

/* ---------- pantalla ---------- */
export function DashboardClient({ brandName = 'tu negocio' }: { brandName?: string }) {
  const [range, setRange] = useState('Este mes')
  const now = useNow()
  const rev = useCountUp(48250, 1800, 200)
  const live = useLiveTick(342, 12)
  const ingresos = useLiveTick(1240, 40, 2600)
  const clock = now ? now.toLocaleTimeString('es-ES', { hour12: false }) : '--:--:--'
  const date = now ? now.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const custom = range === 'Personalizado…'

  return (
    <div className="relative min-h-full overflow-hidden bg-transparent text-neutral-100">
      <style>{`
        @keyframes hud-in{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:none}}.hud-in{opacity:0;animation:hud-in .7s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes draw{from{stroke-dashoffset:700}to{stroke-dashoffset:0}}.draw{stroke-dasharray:700;animation:draw 1.7s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes spin{to{transform:rotate(360deg)}}.spin-slow{animation:spin 60s linear infinite}.spin-rev{animation:spin 26s linear infinite reverse}
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.35}}.pulse-dot{animation:pulse-dot 1.8s ease-in-out infinite}
        @keyframes radar-in{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}.radar-in{animation:radar-in 1s cubic-bezier(.16,1,.3,1) .4s both;transform-box:fill-box;transform-origin:center}
        @keyframes barw{from{width:0}}.barw{animation:barw 1.2s cubic-bezier(.16,1,.3,1) forwards}
        @keyframes funnel-in{from{opacity:0;transform:scaleX(.3)}to{opacity:1;transform:scaleX(1)}}.funnel-in{animation:funnel-in .8s cubic-bezier(.16,1,.3,1) both}
        .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.28em;color:rgb(var(--brand));font-weight:600}
        .tgold{background:linear-gradient(180deg,#fff 0%,rgb(var(--brand)) 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
        .font-disp{font-family:var(--font-display,inherit)}
        .pin{box-shadow:0 0 8px rgb(var(--brand));animation:pinpulse 2.4s ease-in-out infinite}
        @keyframes pinpulse{0%,100%{opacity:1}50%{opacity:.45}}
        .pin::after{content:'';position:absolute;inset:-3px;border-radius:9999px;border:1px solid rgb(var(--brand)/.5);animation:pinping 2.4s ease-out infinite}
        @keyframes pinping{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.2);opacity:0}}
      `}</style>

      {/* motif-light-glow (dorado arriba) */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(circle at 50% 0%, rgb(var(--brand)/0.15) 0%, transparent 55%)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgb(var(--brand)/0.4) 1px, transparent 1.5px)', backgroundSize: '30px 30px', opacity: 0.2, maskImage: 'radial-gradient(ellipse at 50% 22%, black, transparent 72%)', WebkitMaskImage: 'radial-gradient(ellipse at 50% 22%, black, transparent 72%)' }} />

      <div className="relative mx-auto max-w-6xl p-4 pt-16 sm:p-6 md:pt-6">
        {/* TELEMETRÍA */}
        <div className="hud-in flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="eyebrow flex items-center gap-2"><span className="pulse-dot h-1.5 w-1.5 rounded-full bg-brand" /> Centro de operaciones · en vivo</div>
            <h1 className="tgold font-disp mt-1.5 text-3xl font-bold leading-none tracking-tight sm:text-[40px]">Centro de mando · {brandName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end justify-center"><div className="text-3xl font-bold tabular-nums leading-none text-neutral-100 sm:text-[38px]">{clock}</div><div className="mt-1 text-[11px] capitalize text-neutral-400">{date}</div></div>
            <div className="h-9 w-px bg-white/10" /><Weather /><div className="h-9 w-px bg-white/10" />
            <div className="flex flex-col items-end gap-1.5">
              <div className="relative">
                <select value={range} onChange={(e) => setRange(e.target.value)} className="w-full appearance-none rounded-full border border-white/[0.12] bg-white/[0.05] py-2.5 pl-5 pr-11 text-sm font-semibold text-neutral-100 outline-none transition-colors hover:border-brand/50 focus:border-brand">{RANGES.map((r) => <option key={r} className="bg-neutral-900">{r}</option>)}</select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400">▼</span>
              </div>
              {custom && (<div className="flex items-center gap-1.5 text-xs text-neutral-400"><input type="date" defaultValue="2026-06-01" className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-neutral-200 [color-scheme:dark]" /><span>→</span><input type="date" defaultValue="2026-06-30" className="rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-neutral-200 [color-scheme:dark]" /></div>)}
            </div>
          </div>
        </div>

        {/* mini-lecturas */}
        <div className="hud-in mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4" style={{ animationDelay: '40ms' }}>
          {[{ l: 'Visitantes ahora', v: Math.round(live).toString(), live: true }, { l: 'Ingresos hoy', v: '€' + Math.round(ingresos).toLocaleString('es-ES'), live: true }, { l: 'Pedidos hoy', v: '37' }, { l: 'Conversión', v: '3,42%' }].map((r, i) => (<div key={i} className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3"><span className="text-[10px] uppercase tracking-wider text-neutral-400">{r.l}</span><span className="text-sm font-bold text-neutral-50">{r.v}{r.live && <span className="pulse-dot ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />}</span></div>))}
        </div>

        {/* aviso mockup (copy nuevo) */}
        <div className="hud-in mt-4 flex items-center gap-3 rounded-xl border border-brand/25 bg-brand/[0.06] px-5 py-3.5" style={{ animationDelay: '80ms' }}><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/20 text-[12px] font-bold text-brand">✦</span><p className="text-[13px] text-neutral-200"><strong className="font-semibold text-brand">Esto es un mockup con datos de ejemplo.</strong> Habla con la IA para configurar tus métricas y añadir tus datos reales.</p></div>

        {/* HÉROE */}
        <Card delay={100} glow className="mt-5 overflow-hidden">
          <div className="relative grid items-center gap-2 md:grid-cols-[1fr_1.1fr_1fr]" style={{ minHeight: 360 }}>
            <div className="z-10 px-6 py-6">
              <div className="eyebrow">Facturación acumulada</div>
              <div className="mt-2 text-[36px] font-extrabold leading-none text-neutral-100 sm:text-[44px]">€{Math.round(rev).toLocaleString('es-ES')}</div>
              <div className="mt-5 space-y-3">{[{ l: 'Operaciones activas', v: '3.705', d: '+12%' }, { l: 'Ingresos vs mes ant.', v: '+8,1%', d: '↑' }, { l: 'Objetivo del mes', v: '72%', d: '€67k' }].map((s) => (<div key={s.l} className="flex items-center gap-3 border-l-2 border-brand/40 pl-3"><div><div className="text-base font-bold text-neutral-100">{s.v}</div><div className="text-[10px] uppercase tracking-wide text-neutral-500">{s.l}</div></div><span className="ml-auto text-[11px] font-bold text-brand">{s.d}</span></div>))}</div>
            </div>
            <div className="relative h-[360px]">
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><svg viewBox="0 0 340 340" className="h-[320px] w-[320px] opacity-60"><g className="spin-slow" style={{ transformOrigin: 'center' }}><circle cx="170" cy="170" r="162" fill="none" stroke="rgb(var(--brand)/0.15)" strokeWidth="1" strokeDasharray="2 10" /></g><g className="spin-rev" style={{ transformOrigin: 'center' }}><circle cx="170" cy="170" r="146" fill="none" stroke="rgb(var(--brand)/0.18)" strokeWidth="1.5" strokeDasharray="40 24" /></g></svg></div>
              <EnergyOrb />
            </div>
            <div className="z-10 px-6 py-6">
              <div className="eyebrow">Top productos</div>
              <div className="mt-3 space-y-3">{RANK.map((r, i) => (<div key={r.k}><div className="flex justify-between text-[11px]"><span className="text-neutral-300">{r.k}</span><span className="font-bold text-brand">{r.v}</span></div><div className="mt-1 h-1 rounded bg-white/[0.06]"><div className="barw h-full rounded bg-brand" style={{ width: `${r.v}%`, animationDelay: `${300 + i * 90}ms` }} /></div></div>))}</div>
            </div>
          </div>
        </Card>

        {/* funnel + mapa + feed */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <Card delay={120} title="Embudo de conversión"><Funnel /></Card>
          <Card delay={160} title="De dónde son tus clientes"><ClientMap /></Card>
          <Card delay={200} title="Actividad en vivo"><RecentFeed /></Card>
        </div>

        {/* KPIs */}
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">{KPIS.map((k, i) => <KpiCard key={k.label} k={k} i={i} />)}</div>

        {/* knowledge por área + facturación */}
        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.7fr]">
          <Card delay={120} title="Knowledge por área" className="pb-5"><div className="px-5 pt-1"><Radar /></div><p className="mt-2 px-5 text-center text-[11px] text-neutral-400">Crece a medida que añades conocimiento en cada área</p></Card>
          <Card delay={160} title="Facturación total" className="pb-5">
            <div className="mt-3 flex items-center gap-4 px-5 text-[11px]"><span className="flex items-center gap-1.5 font-semibold text-brand"><span className="h-1.5 w-4 rounded-full bg-brand" />Ingresos</span><span className="flex items-center gap-1.5 text-neutral-300"><span className="h-0.5 w-4 rounded-full bg-white/60" />Beneficio</span><span className="ml-auto text-neutral-500">pasa el cursor para ver el detalle</span></div>
            <div className="mt-2 px-5"><AreaChart /></div>
          </Card>
        </div>
      </div>
    </div>
  )
}
