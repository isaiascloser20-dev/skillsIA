'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateKnowledgeSettings } from '@/actions/knowledge'
import { QUADRANTS, type QuadrantMeta } from '../../services/quadrants'

interface QuadrantEdit {
  key: string
  label: string
  blurb: string
  color: string
}

/**
 * Modal de configuración del Knowledge. El admin puede cambiar:
 *   - Nombre del proyecto (lo que sale en la bola central del 3D).
 *   - Color del núcleo central.
 *   - Para cada cuadrante: label, descripción corta, color.
 *
 * Los keys de los cuadrantes son fijos (no editables) porque están enlazados
 * a los datos en BD. Solo se edita la "fachada visual".
 */
export function SettingsPanel({
  open,
  onClose,
  initialProjectName,
  initialCoreColor,
  initialQuadrants,
}: {
  open: boolean
  onClose: () => void
  initialProjectName: string
  initialCoreColor: string
  initialQuadrants: QuadrantMeta[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [projectName, setProjectName] = useState(initialProjectName)
  const [coreColor, setCoreColor] = useState(initialCoreColor)
  const [quadrants, setQuadrants] = useState<QuadrantEdit[]>(() =>
    initialQuadrants.map((q) => ({ key: q.key, label: q.label, blurb: q.blurb, color: q.color })),
  )

  // Reset cuando el modal se abre con nuevos valores iniciales
  useEffect(() => {
    if (!open) return
    setProjectName(initialProjectName)
    setCoreColor(initialCoreColor)
    setQuadrants(initialQuadrants.map((q) => ({ key: q.key, label: q.label, blurb: q.blurb, color: q.color })))
  }, [open, initialProjectName, initialCoreColor, initialQuadrants])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function updateQuadrant(key: string, patch: Partial<QuadrantEdit>) {
    setQuadrants((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)))
  }

  function onResetQuadrants() {
    if (!confirm('¿Restaurar los cuadrantes a sus valores por defecto? Pierdes los cambios.')) return
    setQuadrants(QUADRANTS.map((q) => ({ key: q.key, label: q.label, blurb: q.blurb, color: q.color })))
  }

  function onSave() {
    start(async () => {
      try {
        await updateKnowledgeSettings({
          project_name: projectName,
          core_color: coreColor,
          quadrants,
        })
        router.refresh()
        onClose()
      } catch (e) {
        alert((e as Error).message || 'Error al guardar')
      }
    })
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed z-[100] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,92vw)] max-h-[88vh] overflow-y-auto rounded-2xl border border-amber-400/30 bg-[#1E1E1E] shadow-2xl"
        role="dialog"
        aria-label="Configuración del Knowledge"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b border-amber-400/15 bg-[#1E1E1E]">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-body">Configuración</p>
            <h2 className="font-display text-lg text-neutral-100">Personaliza tu Knowledge</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 inline-flex items-center justify-center rounded text-neutral-100/55 hover:text-amber-400 hover:bg-white/5"
            aria-label="Cerrar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-5 space-y-6">

          {/* Nombre del proyecto */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-amber-400/70 font-body mb-2">Nombre del proyecto</h3>
            <p className="text-[11px] text-neutral-100/50 font-body mb-2 leading-relaxed">
              Aparece en la bola central del cerebro 3D y en la cabecera.
            </p>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Ej: Mi Proyecto"
              className="w-full bg-white/5 border border-amber-400/20 focus:border-amber-400/50 rounded px-3 py-2 text-sm font-body text-neutral-100 outline-none"
            />
          </section>

          {/* Color del núcleo */}
          <section>
            <h3 className="text-[10px] uppercase tracking-widest text-amber-400/70 font-body mb-2">Color del núcleo central</h3>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={coreColor}
                onChange={(e) => setCoreColor(e.target.value)}
                className="w-12 h-10 rounded border border-amber-400/20 bg-transparent cursor-pointer"
              />
              <input
                value={coreColor}
                onChange={(e) => setCoreColor(e.target.value)}
                placeholder="#EBD9A8"
                className="flex-1 bg-white/5 border border-amber-400/20 focus:border-amber-400/50 rounded px-3 py-2 text-sm font-mono text-neutral-100 outline-none"
              />
            </div>
          </section>

          {/* Cuadrantes */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-[10px] uppercase tracking-widest text-amber-400/70 font-body">Cuadrantes</h3>
                <p className="text-[11px] text-neutral-100/50 font-body mt-1 leading-relaxed">
                  Las 6 carpetas raíz del Knowledge. Cambia el nombre, descripción y color de cada una.
                </p>
              </div>
              <button
                onClick={onResetQuadrants}
                className="text-[10px] uppercase tracking-widest text-neutral-100/50 hover:text-amber-400 border border-amber-400/20 hover:border-amber-400/40 px-2 py-1 rounded transition-colors"
              >
                Restaurar default
              </button>
            </div>

            <div className="space-y-3">
              {quadrants.map((q) => (
                <div key={q.key} className="rounded-lg border border-amber-400/15 bg-white/[0.02] p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ background: q.color }}
                    />
                    <span className="text-[10px] uppercase tracking-widest text-neutral-100/40 font-body shrink-0">
                      {q.key}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                    <input
                      value={q.label}
                      onChange={(e) => updateQuadrant(q.key, { label: e.target.value })}
                      placeholder="Nombre visible"
                      className="bg-white/5 border border-amber-400/20 focus:border-amber-400/50 rounded px-3 py-1.5 text-sm font-body text-neutral-100 outline-none"
                    />
                    <input
                      type="color"
                      value={q.color}
                      onChange={(e) => updateQuadrant(q.key, { color: e.target.value })}
                      className="w-12 h-9 rounded border border-amber-400/20 bg-transparent cursor-pointer"
                      title="Color del cuadrante"
                    />
                  </div>
                  <input
                    value={q.blurb}
                    onChange={(e) => updateQuadrant(q.key, { blurb: e.target.value })}
                    placeholder="Descripción corta"
                    className="w-full bg-white/5 border border-amber-400/20 focus:border-amber-400/50 rounded px-3 py-1.5 text-[12px] font-body text-neutral-100/80 outline-none"
                  />
                </div>
              ))}
            </div>
          </section>

        </div>

        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 px-5 py-3 border-t border-amber-400/15 bg-[#1E1E1E]">
          <button
            onClick={onClose}
            className="text-[11px] uppercase tracking-widest text-neutral-100/60 hover:text-neutral-100 border border-amber-400/15 hover:border-amber-400/30 px-4 py-2 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={pending}
            className="text-[11px] uppercase tracking-widest text-amber-400 bg-amber-400/15 hover:bg-amber-400/25 border border-amber-400/40 px-4 py-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </>
  )
}
