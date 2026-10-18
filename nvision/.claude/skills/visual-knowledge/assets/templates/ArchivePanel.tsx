'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { getArchived, restoreSop, purgeSop } from '@/actions/knowledge'
import { QUADRANT_LABEL, type Quadrant } from '@/features/knowledge/services/quadrants'

type ArchivedDoc = { id: string; slug: string; title: string; quadrant: string; subfolder: string | null; archived_at: string }

export function ArchivePanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [items, setItems] = useState<ArchivedDoc[] | null>(null)
  const [, start] = useTransition()

  useEffect(() => {
    getArchived()
      .then((d) => setItems(d as ArchivedDoc[]))
      .catch(() => setItems([]))
  }, [])

  function refresh() {
    getArchived().then((d) => setItems(d as ArchivedDoc[])).catch(() => {})
    router.refresh()
  }

  function onRestore(id: string) {
    setItems((prev) => prev?.filter((x) => x.id !== id) ?? prev)
    start(async () => {
      try {
        await restoreSop(id)
        refresh()
      } catch (e) {
        alert((e as Error).message)
        refresh()
      }
    })
  }

  function onPurge(id: string, title: string) {
    if (!confirm(`Borrar DEFINITIVAMENTE "${title}"? Esto sí es irreversible.`)) return
    setItems((prev) => prev?.filter((x) => x.id !== id) ?? prev)
    start(async () => {
      try {
        await purgeSop(id)
        refresh()
      } catch (e) {
        alert((e as Error).message)
        refresh()
      }
    })
  }

  return (
    <aside className="absolute bottom-0 right-0 top-0 z-50 flex w-full max-w-md flex-col border-l border-[rgba(244,244,250,0.22)] bg-[#1E1E1E]/95 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(244,244,250,0.12)] p-5">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-amber-400/70">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5C21.75 4.254 21.246 3.75 20.625 3.75H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
            Archivador
          </p>
          <h2 className="mt-1 font-display text-lg text-neutral-100">Documentos borrados</h2>
        </div>
        <button onClick={onClose} className="shrink-0 text-neutral-100/40 hover:text-neutral-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {items === null ? (
          <div className="flex justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-10 text-center text-sm italic text-neutral-100/40">El archivador está vacío.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex flex-col gap-2 rounded-[14px] border border-[rgba(244,244,250,0.22)] bg-white/[0.02] p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-neutral-100/90">{it.title}</p>
                  <p className="truncate text-[10px] uppercase tracking-wide text-neutral-100/40">
                    {QUADRANT_LABEL[it.quadrant as Quadrant] ?? it.quadrant}
                    {it.subfolder ? ` › ${it.subfolder}` : ''} · {new Date(it.archived_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onRestore(it.id)}
                    className="flex-1 rounded-lg border border-amber-400/30 px-3 py-1.5 text-[11px] uppercase tracking-widest text-amber-400/90 transition-colors hover:bg-amber-400/10"
                  >
                    Restaurar
                  </button>
                  <button
                    onClick={() => onPurge(it.id, it.title)}
                    className="rounded-lg border border-red-300/25 px-3 py-1.5 text-[11px] uppercase tracking-widest text-red-300/70 transition-colors hover:border-red-300/50 hover:text-red-300"
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}
