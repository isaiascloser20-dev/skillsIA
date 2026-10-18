'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Sidebar (toggle) del OS.
 * - Desktop (md+): columna colapsable (boton «/»).
 * - Movil (<md): drawer que entra desde la izquierda con backdrop (hamburguesa abre, tap-fuera cierra).
 *
 * Arranca con UNA sola seccion: Knowledge. Cada plugin que se enchufe añade su
 * entrada a `sections`. Estilo NEUTRO a proposito (sin color de marca): new-ecoai
 * aplica el brandkit DEL USUARIO en el build. NUNCA un color de marca por defecto.
 */
const sections = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: '▦' },
  { id: 'knowledge', label: 'Knowledge', href: '/knowledge', icon: '◇' },
]

export function OsSidebar({ hasApp, userEmail }: { hasApp: boolean; userEmail: string }) {
  const [collapsed, setCollapsed] = useState(false) // colapso de desktop (en movil siempre expandido)
  const [mobileOpen, setMobileOpen] = useState(false) // drawer movil
  const pathname = usePathname()

  const item =
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors'
  const close = () => setMobileOpen(false)

  return (
    <>
      {/* Hamburguesa (solo movil) */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Abrir menu"
        className="fixed left-3 top-3 z-30 grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-neutral-900/90 text-neutral-200 backdrop-blur md:hidden"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      {/* Backdrop (solo movil, cuando el drawer esta abierto) */}
      {mobileOpen && (
        <div onClick={close} aria-hidden className="fixed inset-0 z-40 bg-black/60 md:hidden" />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 transform flex-col border-r border-white/10 bg-neutral-950 text-neutral-200 transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:z-auto md:translate-x-0 md:transition-[width] ${collapsed ? 'md:w-16' : 'md:w-60'}`}
      >
        {/* Header: nombre + colapsar (desktop) / cerrar (movil) */}
        <div className="flex items-center justify-between gap-2 px-3 py-4">
          {!collapsed && <span className="truncate text-sm font-semibold tracking-wide">Mi OS</span>}
          <button
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? 'Expandir' : 'Colapsar'}
            className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white md:grid"
          >
            <span className="text-lg leading-none">{collapsed ? '»' : '«'}</span>
          </button>
          <button
            onClick={close}
            aria-label="Cerrar menu"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white md:hidden"
          >
            <span className="text-lg leading-none">✕</span>
          </button>
        </div>

        {/* Secciones (empieza con Knowledge) */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2">
          {sections.map((s) => {
            const active = pathname === s.href || pathname.startsWith(s.href + '/')
            return (
              <Link
                key={s.id}
                href={s.href}
                title={s.label}
                onClick={close}
                className={`${item} ${active ? 'bg-brand/15 text-brand' : 'text-neutral-400 hover:bg-white/5 hover:text-white'}`}
              >
                <span className="grid w-5 shrink-0 place-items-center text-base leading-none">{s.icon}</span>
                {!collapsed && <span className="truncate">{s.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Abajo: boton "Ir a la APP" (solo OS+APP) + Perfil */}
        <div className="space-y-1 border-t border-white/10 p-2">
          {hasApp && (
            <Link
              href="/app"
              title="Ir a la APP"
              onClick={close}
              className={`${item} text-neutral-400 hover:bg-white/5 hover:text-white`}
            >
              <span className="grid w-5 shrink-0 place-items-center text-base leading-none">{'▶'}</span>
              {!collapsed && <span className="truncate">Ir a la APP</span>}
            </Link>
          )}
          <Link
            href="/perfil"
            title="Perfil"
            onClick={close}
            className={`${item} text-neutral-400 hover:bg-white/5 hover:text-white`}
          >
            <span className="grid w-5 shrink-0 place-items-center text-base leading-none">{'☉'}</span>
            {!collapsed && <span className="truncate text-xs">{userEmail || 'Perfil'}</span>}
          </Link>
        </div>
      </aside>
    </>
  )
}
