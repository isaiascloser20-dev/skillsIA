'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BrainFolder, BrainQuadrant } from './types'

interface FlatNode {
  kind: 'quadrant-root' | 'folder'
  label: string
  /** Cuadrante destino. Siempre presente. */
  quadrantKey: string
  /** Si es folder, su id. Si es quadrant-root (raíz del cuadrante), null. */
  folderId: string | null
  /** Profundidad para indentación. */
  depth: number
  /** Color del cuadrante (para puntito). */
  color: string
  /** Si está deshabilitado (no se puede mover ahí). */
  disabled?: boolean
  disabledReason?: string
}

/**
 * Aplana el árbol de cuadrantes + folders en una lista navegable para el
 * picker. El picker filtra los destinos NO válidos según el item que se
 * está moviendo (un folder no puede ir dentro de sí mismo o sus descendientes).
 */
function flattenTree(
  data: BrainQuadrant[],
  excludeFolderId: string | null,
): FlatNode[] {
  const out: FlatNode[] = []

  // Descendientes del folder excluido (para deshabilitarlos)
  const excluded = new Set<string>()
  if (excludeFolderId) {
    excluded.add(excludeFolderId)
    function collect(folders: BrainFolder[]) {
      for (const f of folders) {
        if (excluded.has(f.parentId ?? '')) {
          excluded.add(f.id)
        }
        if (f.id === excludeFolderId) {
          // Marcar este y propagar a hijos
          for (const sub of f.subFolders) {
            excluded.add(sub.id)
            collect([sub])
          }
        } else {
          collect(f.subFolders)
        }
      }
    }
    for (const q of data) collect(q.rootFolders)
  }

  for (const q of data) {
    out.push({
      kind: 'quadrant-root',
      label: `${q.label} · (raíz del cuadrante)`,
      quadrantKey: q.key,
      folderId: null,
      depth: 0,
      color: q.color,
    })
    function visit(folder: BrainFolder, depth: number) {
      const isExcluded = excluded.has(folder.id)
      out.push({
        kind: 'folder',
        label: folder.name,
        quadrantKey: q.key,
        folderId: folder.id,
        depth,
        color: q.color,
        disabled: isExcluded,
        disabledReason: isExcluded ? 'No puedes mover una carpeta dentro de sí misma o sus subcarpetas.' : undefined,
      })
      for (const sub of folder.subFolders) visit(sub, depth + 1)
    }
    for (const root of q.rootFolders) visit(root, 1)
  }
  return out
}

/**
 * Modal "Mover a..." para docs y folders. Muestra árbol completo de
 * cuadrantes + carpetas. El usuario selecciona destino y se ejecuta la
 * acción de mover (callback). Auto-excluye destinos inválidos
 * (descendientes propios) cuando se mueve una folder.
 */
export function FolderPicker({
  open,
  onClose,
  data,
  /** Si estamos moviendo una folder, su id (para excluir descendientes). null si es un doc. */
  excludeFolderId,
  onPick,
  title = 'Mover a…',
}: {
  open: boolean
  onClose: () => void
  data: BrainQuadrant[]
  excludeFolderId: string | null
  onPick: (target: { folderId: string | null; quadrantKey: string }) => void
  title?: string
}) {
  const [query, setQuery] = useState('')

  const flat = useMemo(() => flattenTree(data, excludeFolderId), [data, excludeFolderId])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return flat
    return flat.filter((n) => n.label.toLowerCase().includes(q))
  }, [query, flat])

  useEffect(() => {
    if (!open) return
    setQuery('')
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed z-[120] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(480px,92vw)] max-h-[80vh] flex flex-col rounded-2xl border border-amber-400/30 bg-[#1E1E1E] shadow-2xl"
        role="dialog"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-400/15">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-body">Mover a</p>
            <h2 className="font-display text-base text-neutral-100">{title}</h2>
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

        <div className="px-3 py-2 border-b border-amber-400/15">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar carpetas…"
            className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-100/30 outline-none px-2 py-1.5"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-sm italic text-neutral-100/40 text-center py-6">Sin resultados.</p>
          ) : (
            <ul>
              {filtered.map((n, i) => (
                <li key={`${n.kind}-${n.folderId ?? n.quadrantKey}-${i}`}>
                  <button
                    onClick={() => {
                      if (n.disabled) return
                      onPick({ folderId: n.folderId, quadrantKey: n.quadrantKey })
                      onClose()
                    }}
                    disabled={n.disabled}
                    title={n.disabledReason}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-left text-sm font-body transition-colors ${
                      n.disabled
                        ? 'text-neutral-100/25 cursor-not-allowed'
                        : 'text-neutral-100/85 hover:bg-white/5 hover:text-amber-400'
                    }`}
                    style={{ paddingLeft: `${1 + n.depth * 1}rem` }}
                  >
                    {n.kind === 'quadrant-root' ? (
                      <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: n.color }} />
                    ) : (
                      <span className="inline-block w-2.5 h-2.5 rotate-45 shrink-0" style={{ background: n.color, opacity: n.disabled ? 0.3 : 1 }} />
                    )}
                    <span className="truncate">{n.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
