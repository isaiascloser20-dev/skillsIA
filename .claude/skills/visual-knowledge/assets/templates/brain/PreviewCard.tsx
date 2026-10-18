'use client'

import { useEffect, useRef } from 'react'

export interface PreviewState {
  slug: string
  title: string
  description: string | null
  /** Coordenadas del tap original. La card se sitúa cerca pero clamped al viewport. */
  x: number
  y: number
}

/**
 * Card flotante que muestra el nombre completo + descripción de un doc al
 * hacer tap único sobre su nodo del 3D (o hover prolongado). el usuario la usa
 * para verificar qué documento es ANTES de entrar y evitar abrir el
 * incorrecto (un tap más = abrir, click fuera = cerrar).
 */
export function PreviewCard({
  state,
  onOpen,
  onClose,
}: {
  state: PreviewState | null
  onOpen: (slug: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state) return
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    // Delay para no atrapar el mismo tap que abrió la card.
    const t = window.setTimeout(() => {
      document.addEventListener('mousedown', onDocClick)
      document.addEventListener('touchstart', onDocClick as unknown as EventListener)
    }, 0)
    document.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick as unknown as EventListener)
      document.removeEventListener('keydown', onKey)
    }
  }, [state, onClose])

  if (!state) return null

  // Posicionado relativo al tap pero clamped al viewport. Offset 16px arriba/derecha
  // para no taparlo con el cursor o el dedo.
  const W = 320
  const H = 180  // alto aproximado, suficiente para evitar overflow vertical
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768
  const left = Math.min(Math.max(state.x + 16, 8), vw - W - 8)
  const top = Math.min(Math.max(state.y - H - 16, 8), vh - H - 8)

  return (
    <div
      ref={ref}
      className="fixed z-[90] w-[320px] rounded-lg border border-amber-400/35 bg-[#1E1E1E]/95 p-4 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.8)] backdrop-blur-md animate-fade-in"
      style={{ left, top }}
      role="dialog"
      aria-label="Previsualización del documento"
    >
      <p className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-1.5 font-body">Documento</p>
      <h3 className="font-display text-base text-neutral-100 leading-snug mb-2">{state.title}</h3>
      {state.description && (
        <p className="text-[12px] font-body text-neutral-100/65 leading-relaxed line-clamp-4 mb-3">
          {state.description}
        </p>
      )}
      <div className="flex gap-1.5">
        <button
          onClick={() => {
            onOpen(state.slug)
            onClose()
          }}
          className="flex-1 text-[11px] uppercase tracking-widest text-amber-400 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 px-3 py-2 font-body transition-colors"
        >
          Abrir documento
        </button>
        <button
          onClick={onClose}
          className="text-[11px] uppercase tracking-widest text-neutral-100/60 hover:text-neutral-100 border border-amber-400/15 hover:border-amber-400/30 px-3 py-2 font-body transition-colors"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
