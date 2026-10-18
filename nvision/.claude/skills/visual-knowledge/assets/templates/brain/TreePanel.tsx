'use client'

import { useMemo, useRef, useState } from 'react'
import { buildSearchIndex, normalize, totalCount, folderTotalCount, type SearchItem } from './brain-data'
import type { BrainFolder, BrainQuadrant, View } from './types'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} style={{ transition: 'transform 0.15s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  )
}

const Dot = ({ c }: { c: string }) => <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: c }} />
const Diamond = ({ c }: { c: string }) => <span className="inline-block h-2 w-2 shrink-0 rotate-45" style={{ background: c }} />

const ROW = 'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/[0.06]'

export function TreePanel({
  data,
  setView,
  onOpenDoc,
  onClose,
}: {
  data: BrainQuadrant[]
  setView: (v: View) => void
  onOpenDoc: (slug: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const index = useMemo(() => buildSearchIndex(data), [data])
  const results = useMemo(() => {
    const nq = normalize(query.trim())
    if (!nq) return null
    return index.filter((it) => normalize(it.label).includes(nq) || normalize(it.path).includes(nq)).slice(0, 60)
  }, [query, index])

  const toggle = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  function rowClick(single: () => void, dbl: () => void) {
    return () => {
      if (clickTimer.current) {
        clearTimeout(clickTimer.current)
        clickTimer.current = null
        dbl()
      } else {
        clickTimer.current = setTimeout(() => {
          clickTimer.current = null
          single()
        }, 260)
      }
    }
  }

  function pick(it: SearchItem) {
    if (it.kind === 'quadrant') setView({ level: 'quadrant', q: it.quadrantKey })
    else if (it.kind === 'folder' && it.folderId) setView({ level: 'folder', folderId: it.folderId })
    else if (it.slug) onOpenDoc(it.slug)
  }

  /** Render recursivo de una folder (con sus subFolders y docs). */
  function renderFolder(folder: BrainFolder, color: string, depth: number) {
    const key = `f:${folder.id}`
    const open = expanded.has(key)
    return (
      <li key={folder.id}>
        <div
          className={ROW + ' cursor-pointer'}
          onClick={rowClick(
            () => toggle(key),
            () => setView({ level: 'folder', folderId: folder.id }),
          )}
          style={{ paddingLeft: `${0.5 + depth * 0.75}rem` }}
        >
          <button onClick={(e) => { e.stopPropagation(); toggle(key) }} className="shrink-0 text-neutral-100/50 hover:text-neutral-100">
            <Chevron open={open} />
          </button>
          <Dot c={color} />
          <span className="min-w-0 flex-1 truncate text-neutral-100/85">{folder.name}</span>
          <span className="shrink-0 text-[10px] text-neutral-100/40">{folderTotalCount(folder)}</span>
        </div>
        {open && (
          <ul>
            {folder.subFolders.map((sub) => renderFolder(sub, color, depth + 1))}
            {folder.docs.map((doc) => (
              <li key={doc.id}>
                <div
                  className={ROW + ' cursor-pointer'}
                  onClick={rowClick(() => {}, () => onOpenDoc(doc.slug))}
                  style={{ paddingLeft: `${0.5 + (depth + 1) * 0.75 + 0.875}rem` }}
                >
                  <Diamond c={color} />
                  <span className="min-w-0 flex-1 truncate text-neutral-100/70">{doc.title}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div className="flex w-[340px] max-w-[88vw] flex-col overflow-hidden rounded-[14px] border border-[rgba(244,244,250,0.22)] bg-[#1E1E1E]/95 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="flex items-center gap-2 border-b border-[rgba(244,244,250,0.12)] p-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="text-amber-400/70">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
        </svg>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar carpeta o documento…"
          className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-100/30 outline-none"
        />
        <button onClick={onClose} className="text-neutral-100/40 hover:text-neutral-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="max-h-[58vh] overflow-y-auto p-2 text-sm">
        {results ? (
          results.length === 0 ? (
            <p className="px-3 py-4 italic text-neutral-100/40">Sin resultados.</p>
          ) : (
            <ul>
              {results.map((it, i) => (
                <li key={`${it.kind}-${it.quadrantKey}-${it.folderId ?? ''}-${it.label}-${i}`}>
                  <button onClick={() => pick(it)} className={ROW}>
                    {it.kind === 'doc' ? <Diamond c={it.color} /> : <Dot c={it.color} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-neutral-100/90">{it.label}</span>
                      <span className="block truncate text-[10px] uppercase tracking-wide text-neutral-100/40">{it.path}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="space-y-0.5">
            {data.map((q) => {
              const qOpen = expanded.has(q.key)
              return (
                <li key={q.key}>
                  <div
                    className={ROW + ' cursor-pointer'}
                    onClick={rowClick(
                      () => toggle(q.key),
                      () => setView({ level: 'quadrant', q: q.key }),
                    )}
                  >
                    <button onClick={(e) => { e.stopPropagation(); toggle(q.key) }} className="shrink-0 text-neutral-100/50 hover:text-neutral-100">
                      <Chevron open={qOpen} />
                    </button>
                    <Dot c={q.color} />
                    <span className="min-w-0 flex-1 truncate font-display text-neutral-100">{q.label}</span>
                    <span className="shrink-0 text-[10px] text-neutral-100/40">{totalCount(q)}</span>
                  </div>

                  {qOpen && (
                    <ul>
                      {q.rootFolders.map((f) => renderFolder(f, q.color, 1))}
                      {q.rootDocs.map((doc) => (
                        <li key={doc.id}>
                          <div
                            className={ROW + ' cursor-pointer'}
                            onClick={rowClick(() => {}, () => onOpenDoc(doc.slug))}
                            style={{ paddingLeft: '1.625rem' }}
                          >
                            <Diamond c={q.color} />
                            <span className="min-w-0 flex-1 truncate text-neutral-100/70">{doc.title}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="border-t border-[rgba(244,244,250,0.12)] px-3 py-2 text-[10px] uppercase tracking-wide text-neutral-100/30">
        Flecha: abrir/cerrar · doble clic: ir/abrir
      </p>
    </div>
  )
}
