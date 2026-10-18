'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { updateSop, deleteSop, moveSop, createFolder } from '@/actions/knowledge'
import { QUADRANTS, QUADRANT_LABEL, type FolderRow, type Quadrant, type SopRow } from '../services/quadrants'

/** Item del dropdown jerárquico de carpetas. */
interface FolderOption {
  id: string
  label: string  // ya con indentación visual
  quadrant: Quadrant
}

function buildFolderOptions(folders: FolderRow[]): FolderOption[] {
  const opts: FolderOption[] = []
  for (const meta of QUADRANTS) {
    // Header del cuadrante (raíz, sin id)
    const inQ = folders.filter((f) => f.quadrant === meta.key)
    if (inQ.length === 0) continue
    // Construir árbol y recorrerlo en preorder con indentación
    const byParent = new Map<string | null, FolderRow[]>()
    for (const f of inQ) {
      const arr = byParent.get(f.parent_folder_id) ?? []
      arr.push(f)
      byParent.set(f.parent_folder_id, arr)
    }
    function visit(parentId: string | null, depth: number) {
      const kids = (byParent.get(parentId) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name, 'es'))
      for (const k of kids) {
        opts.push({
          id: k.id,
          label: `${'  '.repeat(depth)}${depth > 0 ? '↳ ' : ''}${meta.label} · ${k.name}`,
          quadrant: meta.key,
        })
        visit(k.id, depth + 1)
      }
    }
    visit(null, 0)
  }
  return opts
}

export function KnowledgeEditorClient({ sop, folders }: { sop: SopRow; folders: FolderRow[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromParam = searchParams?.get('from') ?? null
  const backHref = fromParam ? `/knowledge?view=${fromParam}` : '/knowledge'
  const [isPending, start] = useTransition()
  const [title, setTitle] = useState(sop.title)
  const [description, setDescription] = useState(sop.description ?? '')
  const [content, setContent] = useState(sop.content_md)
  const [quadrant, setQuadrant] = useState<Quadrant>(sop.quadrant)
  const [folderId, setFolderId] = useState<string | null>(sop.folder_id ?? null)
  const [active, setActive] = useState(sop.active)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  const folderOptions = useMemo(() => buildFolderOptions(folders), [folders])
  // Filtrar opciones solo del quadrant actual del doc
  const optionsForQuadrant = folderOptions.filter((o) => o.quadrant === quadrant)

  const dirty =
    title !== sop.title ||
    description !== (sop.description ?? '') ||
    content !== sop.content_md ||
    quadrant !== sop.quadrant ||
    folderId !== (sop.folder_id ?? null) ||
    active !== sop.active

  function onDelete() {
    if (!confirm(`Borrar "${sop.title}"? Irá al Archivador y podrás recuperarlo.`)) return
    start(async () => {
      try {
        await deleteSop(sop.id)
        router.push(backHref)
      } catch (e) {
        alert((e as Error).message || 'Error al borrar')
      }
    })
  }

  function onCreateFolderInline() {
    const name = prompt('Nombre de la carpeta nueva (en raíz del cuadrante actual):')?.trim()
    if (!name) return
    start(async () => {
      try {
        const f = await createFolder({ name, quadrant, parent_folder_id: null })
        setFolderId(f.id)
        router.refresh()
      } catch (e) {
        alert((e as Error).message || 'Error al crear carpeta')
      }
    })
  }

  function onSave() {
    if (!dirty) return
    start(async () => {
      try {
        // 1) Si cambió el folder_id o el quadrant, usar moveSop para mantener
        //    consistencia de jerarquía (folder.quadrant vs sop.quadrant).
        if (folderId !== (sop.folder_id ?? null) || quadrant !== sop.quadrant) {
          await moveSop({
            id: sop.id,
            target_folder_id: folderId,
            target_quadrant: folderId === null ? quadrant : undefined,
          })
        }
        // 2) Actualizar el resto de campos.
        await updateSop({
          id: sop.id,
          title,
          description: description || null,
          content_md: content,
          quadrant,
          subfolder: null,  // dejamos de usar subfolder, folder_id es la fuente
          active,
        })
        setSavedAt(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
        router.refresh()
      } catch (e) {
        alert((e as Error).message || 'Error al guardar')
      }
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={() => router.push(backHref)}
          className="shrink-0 w-9 h-9 flex items-center justify-center text-neutral-100/60 hover:text-amber-400 border border-amber-400/20 hover:border-amber-400/40 transition-colors"
          aria-label="Volver"
          title={fromParam ? 'Volver a donde estabas en el cerebro' : 'Volver al cerebro'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-amber-400/70 font-body">
            Knowledge · {QUADRANT_LABEL[quadrant]} · {sop.slug}
          </p>
          <p className="text-[11px] font-body text-neutral-100/40 mt-0.5">
            Última edición: {new Date(sop.updated_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
            {savedAt && <span className="ml-2 text-emerald-400/80">· Guardado {savedAt}</span>}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={isPending}
          className="shrink-0 text-[11px] uppercase tracking-widest text-red-300/70 hover:text-red-300 border border-red-300/25 hover:border-red-300/50 px-3 py-2 font-body disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Borrar
        </button>
        <button
          onClick={onSave}
          disabled={!dirty || isPending}
          className="shrink-0 text-[11px] uppercase tracking-widest text-amber-400/90 hover:text-amber-400 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 px-3 py-2 font-body disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isPending ? 'Guardando…' : dirty ? 'Guardar' : 'Guardado'}
        </button>
      </header>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título"
        className="w-full bg-transparent border-none px-0 py-1 mb-2 font-display text-2xl md:text-3xl text-neutral-100 placeholder:text-neutral-100/30 outline-none"
      />

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descripción corta (1 línea)"
        className="w-full bg-transparent border-none px-0 py-1 mb-4 text-sm font-body text-neutral-100/60 placeholder:text-neutral-100/30 outline-none"
      />

      {/* Cuadrante + Carpeta jerárquica + Active */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <label className="flex items-center gap-2 text-xs font-body text-neutral-100/70">
          <span className="uppercase tracking-widest text-[10px] text-neutral-100/50">Cuadrante</span>
          <select
            value={quadrant}
            onChange={(e) => {
              const newQ = e.target.value as Quadrant
              setQuadrant(newQ)
              // Si la carpeta actual pertenece a otro quadrant, la deseleccionamos
              const opt = folderOptions.find((o) => o.id === folderId)
              if (opt && opt.quadrant !== newQ) setFolderId(null)
            }}
            className="bg-white/5 border border-amber-400/20 px-2 py-1 text-xs font-body text-neutral-100 outline-none focus:border-amber-400/50"
          >
            {QUADRANTS.map((q) => (
              <option key={q.key} value={q.key} className="bg-neutral-950 text-neutral-100">
                {q.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs font-body text-neutral-100/70">
          <span className="uppercase tracking-widest text-[10px] text-neutral-100/50">Carpeta</span>
          <select
            value={folderId ?? ''}
            onChange={(e) => setFolderId(e.target.value || null)}
            className="bg-white/5 border border-amber-400/20 px-2 py-1 text-xs font-body text-neutral-100 outline-none focus:border-amber-400/50 max-w-[260px]"
          >
            <option value="" className="bg-neutral-950 text-neutral-100">— (raíz del cuadrante) —</option>
            {optionsForQuadrant.map((o) => (
              <option key={o.id} value={o.id} className="bg-neutral-950 text-neutral-100">{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={onCreateFolderInline}
            disabled={isPending}
            className="text-[10px] uppercase tracking-widest text-amber-400/70 hover:text-amber-400 border border-amber-400/25 hover:border-amber-400/50 px-2 py-1 transition-colors disabled:opacity-40"
            title="Crea una carpeta nueva en la raíz del cuadrante actual"
          >
            + Nueva
          </button>
        </label>
        <label className="flex items-center gap-2 text-xs font-body text-neutral-100/70 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="accent-amber-400"
          />
          <span>Activo · lo leen las IAs del SaaS</span>
        </label>
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        spellCheck={false}
        placeholder="Contenido en markdown..."
        className="w-full min-h-[60vh] bg-white/[0.02] border border-amber-400/15 focus:border-amber-400/40 px-4 py-3 text-sm font-mono text-neutral-100 placeholder:text-neutral-100/30 outline-none resize-y leading-relaxed"
      />

      <p className="mt-3 text-[11px] font-body text-neutral-100/40 leading-relaxed">
        Soporta markdown estándar: encabezados, listas, tablas, código, énfasis. Aplica al instante en el chat tras
        guardar.
      </p>
    </div>
  )
}
