'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { folderTotalCount, findFolderWithPath } from './brain-data'
import type { BrainDoc, BrainFolder, BrainQuadrant, View } from './types'

/* ─── Estilos compartidos brandkit ───────────────────────────────────────── */
const CARD =
  'group relative flex flex-col gap-2 rounded-[14px] border border-[rgba(244,244,250,0.22)] bg-[#1E1E1E] p-4 text-left shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] transition-colors hover:border-amber-400/35'
const ROW =
  'group relative flex w-full items-center gap-3 rounded-[14px] border border-[rgba(244,244,250,0.22)] bg-[#1E1E1E] px-4 py-3 text-left shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] transition-colors hover:border-amber-400/35'
const PILL = 'shrink-0 rounded-full border border-[rgba(244,244,250,0.22)] px-2 py-0.5 text-[10px] text-neutral-100/50'

const Dot = ({ c, big }: { c: string; big?: boolean }) => (
  <span className={`inline-block shrink-0 rounded-full ${big ? 'h-3 w-3' : 'h-2 w-2'}`} style={{ background: c }} />
)
const Diamond = ({ c }: { c: string }) => <span className="inline-block h-2.5 w-2.5 shrink-0 rotate-45" style={{ background: c }} />

/* Icono de grip (handle de drag) — visible siempre, este es EL ÚNICO punto
   que activa el drag&drop. El resto del card es libre para clicks/links. */
function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-neutral-100/30 group-hover:text-neutral-100/60 transition-colors">
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  )
}

/* ─── Tipos de drag&drop ─────────────────────────────────────────────────── */

interface DragDocData { kind: 'doc'; sopId: string; title: string; color: string }
interface DragFolderData { kind: 'folder'; folderId: string; name: string; color: string }
type DragData = DragDocData | DragFolderData

interface DropFolderData { kind: 'folder'; folderId: string; quadrant: string }
interface DropQuadrantRootData { kind: 'quadrant-root'; quadrant: string }
interface DropBreadcrumbData { kind: 'breadcrumb'; folderId: string | null; quadrant: string }
type DropData = DropFolderData | DropQuadrantRootData | DropBreadcrumbData

/* ─── Menú de acciones (...) — SIEMPRE VISIBLE + viewport-clamped ──────── */

function ActionsMenu({
  onRename,
  onMoveTo,
  onDelete,
}: {
  onRename?: () => void
  onMoveTo?: () => void
  onDelete?: () => void
}) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)

  // Calcular posición del menú clamped al viewport tras abrir
  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const W = 180
    const H = 90
    const vw = window.innerWidth
    const vh = window.innerHeight
    let left = rect.right - W
    let top = rect.bottom + 4
    if (top + H > vh - 8) top = rect.top - H - 4
    if (left < 8) left = 8
    if (left + W > vw - 8) left = vw - W - 8
    setPos({ left, top })
  }, [open])

  // Cerrar al click fuera (sin bubble al card padre) + ESC
  useEffect(() => {
    if (!open) return
    function onDocPointer(e: Event) {
      const t = e.target as HTMLElement | null
      if (t && t.closest('[data-nv-actions-menu="true"]')) return
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // capture phase: atrapamos ANTES de que llegue al card padre
    const t = window.setTimeout(() => {
      document.addEventListener('pointerdown', onDocPointer, { capture: true })
      document.addEventListener('keydown', onKey)
    }, 0)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('pointerdown', onDocPointer, { capture: true })
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        onPointerDown={(e) => {
          // Evitar que dnd-kit/card capturen el pointerdown
          e.stopPropagation()
        }}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          setOpen((v) => !v)
        }}
        className="absolute top-1.5 right-1.5 w-8 h-8 inline-flex items-center justify-center rounded text-neutral-100/55 hover:text-amber-400 hover:bg-white/5 transition-colors"
        aria-label="Acciones"
        data-nv-actions-menu="true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
      </button>
      {open && pos && (
        <div
          data-nv-actions-menu="true"
          className="fixed z-[100] min-w-[180px] rounded-lg border border-amber-400/30 bg-[#1E1E1E] py-1 shadow-2xl"
          style={{ left: pos.left, top: pos.top }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {onRename && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onRename()
              }}
              className="block w-full text-left px-3 py-2 text-[11px] uppercase tracking-widest text-neutral-100/80 hover:bg-white/5 hover:text-amber-400"
            >
              Renombrar
            </button>
          )}
          {onMoveTo && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onMoveTo()
              }}
              className="block w-full text-left px-3 py-2 text-[11px] uppercase tracking-widest text-neutral-100/80 hover:bg-white/5 hover:text-amber-400"
            >
              Mover a…
            </button>
          )}
          {onDelete && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onDelete()
              }}
              className="block w-full text-left px-3 py-2 text-[11px] uppercase tracking-widest text-red-300/85 hover:bg-red-500/10 hover:text-red-300"
            >
              Eliminar
            </button>
          )}
        </div>
      )}
    </>
  )
}

/* ─── Drag handle (icono grip) — el ÚNICO que activa el drag ─────────────── */

function DragHandle({
  listeners,
  attributes,
  setActivatorNodeRef,
}: {
  listeners: ReturnType<typeof useDraggable>['listeners']
  attributes: ReturnType<typeof useDraggable>['attributes']
  setActivatorNodeRef: ReturnType<typeof useDraggable>['setActivatorNodeRef']
}) {
  return (
    <button
      ref={setActivatorNodeRef}
      {...listeners}
      {...attributes}
      onPointerDown={(e) => {
        // Permitir que dnd-kit reciba pointerdown — NO stop, lo necesita
        // Evitar el click bubbling al onClick del card
        ;(e.currentTarget as HTMLButtonElement).blur()
      }}
      onClick={(e) => {
        // El grip nunca dispara onClick (es solo handle de drag)
        e.stopPropagation()
        e.preventDefault()
      }}
      className="shrink-0 w-6 h-6 inline-flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
      aria-label="Arrastrar para mover"
      tabIndex={-1}
    >
      <GripIcon />
    </button>
  )
}

/* ─── Card de carpeta (drag handle + click libre + menú visible) ────────── */

function FolderCard({
  folder,
  color,
  onOpen,
  onRename,
  onMoveTo,
  onDelete,
}: {
  folder: BrainFolder
  color: string
  onOpen: () => void
  onRename: () => void
  onMoveTo: () => void
  onDelete: () => void
}) {
  // Droppable: aceptar drops dentro de esta carpeta
  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `folder-drop:${folder.id}`,
    data: { kind: 'folder', folderId: folder.id, quadrant: folder.quadrantKey } satisfies DropData,
  })
  // Draggable: SOLO el grip activa el drag (setActivatorNodeRef)
  const { attributes, listeners, setNodeRef: dragRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `folder-drag:${folder.id}`,
    data: { kind: 'folder', folderId: folder.id, name: folder.name, color } satisfies DragData,
  })
  const count = folderTotalCount(folder)

  return (
    <div
      ref={(el) => {
        dropRef(el)
        dragRef(el)
      }}
      className={`${CARD} ${isOver ? 'border-amber-400/70 ring-2 ring-amber-400/40' : ''} ${isDragging ? 'opacity-40' : ''} cursor-pointer`}
      onClick={(e) => {
        // Si el click viene de un button (grip, menú), ignorar
        if ((e.target as HTMLElement).closest('button')) return
        if (isDragging) return
        onOpen()
      }}
    >
      <div className="flex items-center gap-2.5">
        <DragHandle listeners={listeners} attributes={attributes} setActivatorNodeRef={setActivatorNodeRef} />
        <Dot c={color} />
        <h3 className="flex-1 truncate text-sm text-neutral-100 pr-8">{folder.name}</h3>
        <span className={PILL}>{count}</span>
      </div>
      <ActionsMenu onRename={onRename} onMoveTo={onMoveTo} onDelete={onDelete} />
    </div>
  )
}

/* ─── Row de documento (drag handle + Link libre) ────────────────────────── */

function DocRow({
  doc,
  color,
  onOpen,
  onMoveTo,
  onDelete,
  href,
}: {
  doc: BrainDoc
  color: string
  onOpen: () => void
  onMoveTo: () => void
  onDelete: () => void
  href: string
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: `doc-drag:${doc.id}`,
    data: { kind: 'doc', sopId: doc.id, title: doc.title, color } satisfies DragData,
  })

  return (
    <div
      ref={setNodeRef}
      className={`${ROW} ${isDragging ? 'opacity-40' : ''}`}
    >
      <DragHandle listeners={listeners} attributes={attributes} setActivatorNodeRef={setActivatorNodeRef} />
      <Diamond c={color} />
      <Link
        href={href}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button')) return
          if (isDragging) {
            e.preventDefault()
            return
          }
          e.preventDefault()
          onOpen()
        }}
        className="flex-1 min-w-0 pr-8"
      >
        <span className="truncate text-sm text-neutral-100/85 block">{doc.title}</span>
      </Link>
      <ActionsMenu onMoveTo={onMoveTo} onDelete={onDelete} />
    </div>
  )
}

/* ─── Breadcrumb (cada segmento es droppable) ────────────────────────────── */

function BreadcrumbSegment({
  label,
  onClick,
  dropData,
  isCurrent,
}: {
  label: string
  onClick?: () => void
  dropData?: DropData
  isCurrent?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `bc:${dropData ? JSON.stringify(dropData) : 'none'}-${label}`,
    data: dropData,
    disabled: !dropData,
  })
  return (
    <button
      ref={setNodeRef}
      onClick={onClick}
      disabled={isCurrent}
      className={`text-[11px] uppercase tracking-widest font-body transition-colors px-2 py-1 rounded ${
        isCurrent ? 'text-amber-400 cursor-default' : 'text-amber-400/70 hover:text-amber-400'
      } ${isOver ? 'bg-amber-400/15 ring-1 ring-amber-400/40' : ''}`}
    >
      {label}
    </button>
  )
}

function Breadcrumb({
  quadrantLabel,
  path,
  onGoOverview,
  onGoQuadrant,
  onGoFolder,
  quadrantKey,
}: {
  quadrantLabel?: string
  path: BrainFolder[]
  onGoOverview: () => void
  onGoQuadrant?: () => void
  onGoFolder?: (folderId: string) => void
  quadrantKey?: string
}) {
  return (
    <div className="mb-5 flex items-center flex-wrap gap-1">
      <BreadcrumbSegment label="Cerebro" onClick={onGoOverview} />
      {quadrantLabel && quadrantKey && (
        <>
          <span className="text-neutral-100/30">/</span>
          <BreadcrumbSegment
            label={quadrantLabel}
            onClick={onGoQuadrant}
            dropData={{ kind: 'quadrant-root', quadrant: quadrantKey } satisfies DropData}
          />
        </>
      )}
      {path.map((f, i) => {
        const isCurrent = i === path.length - 1
        return (
          <span key={f.id} className="flex items-center gap-1">
            <span className="text-neutral-100/30">/</span>
            <BreadcrumbSegment
              label={f.name}
              isCurrent={isCurrent}
              onClick={isCurrent ? undefined : onGoFolder ? () => onGoFolder(f.id) : undefined}
              dropData={
                isCurrent
                  ? undefined
                  : ({ kind: 'breadcrumb', folderId: f.id, quadrant: f.quadrantKey } satisfies DropData)
              }
            />
          </span>
        )
      })}
    </div>
  )
}

/* ─── Main: DriveView ────────────────────────────────────────────────────── */

export function DriveView({
  data,
  view,
  setView,
  onOpenDoc,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteDoc,
  onMoveSop,
  onMoveFolder,
  onPickMoveTarget,
}: {
  data: BrainQuadrant[]
  view: View
  setView: (v: View) => void
  onOpenDoc: (slug: string) => void
  onCreateFolder?: (quadrant: string, parentFolderId: string | null) => void
  onRenameFolder?: (id: string, currentName: string) => void
  onDeleteFolder?: (id: string, name: string, totalDocs: number) => void
  onDeleteDoc?: (id: string, title: string) => void
  onMoveSop?: (sopId: string, targetFolderId: string | null, targetQuadrant?: string) => void
  onMoveFolder?: (folderId: string, targetParentId: string | null, targetQuadrant?: string) => void
  /** Abre el FolderPicker para elegir destino del move (item "Mover a…" del menú). */
  onPickMoveTarget?: (item: { kind: 'doc' | 'folder'; id: string; label: string }) => void
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  const [dragPreview, setDragPreview] = useState<DragData | null>(null)

  // Fallback: si view apunta a folder inexistente, volver a overview vía useEffect (no en render).
  useEffect(() => {
    if (view.level !== 'folder') return
    if (!findFolderWithPath(data, view.folderId)) {
      setView({ level: 'overview' })
    }
  }, [view, data, setView])

  function handleDragEnd(e: DragEndEvent) {
    setDragPreview(null)
    const active = e.active.data.current as DragData | undefined
    const over = e.over?.data.current as DropData | undefined
    if (!active || !over) return

    let targetFolderId: string | null = null
    let targetQuadrant: string | undefined
    if (over.kind === 'folder') {
      targetFolderId = over.folderId
      targetQuadrant = over.quadrant
    } else if (over.kind === 'quadrant-root') {
      targetFolderId = null
      targetQuadrant = over.quadrant
    } else if (over.kind === 'breadcrumb') {
      targetFolderId = over.folderId
      targetQuadrant = over.quadrant
    }

    if (active.kind === 'doc') {
      if (onMoveSop) onMoveSop(active.sopId, targetFolderId, targetQuadrant)
    } else if (active.kind === 'folder') {
      if (active.folderId === targetFolderId) return
      if (onMoveFolder) onMoveFolder(active.folderId, targetFolderId, targetQuadrant)
    }
  }

  /* ─── Render por nivel ─────────────────────────────────────────────────── */

  // OVERVIEW
  if (view.level === 'overview') {
    return (
      <DndContext sensors={sensors} onDragStart={(e) => setDragPreview(e.active.data.current as DragData)} onDragEnd={handleDragEnd}>
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.map((q) => (
              <QuadrantCard
                key={q.key}
                quadrant={q}
                onOpen={() => setView({ level: 'quadrant', q: q.key })}
              />
            ))}
          </div>
        </div>
        <DragOverlay>{renderDragPreview(dragPreview)}</DragOverlay>
      </DndContext>
    )
  }

  // QUADRANT
  if (view.level === 'quadrant') {
    const q = data.find((x) => x.key === view.q)
    if (!q) return null
    return (
      <DndContext sensors={sensors} onDragStart={(e) => setDragPreview(e.active.data.current as DragData)} onDragEnd={handleDragEnd}>
        <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
          <Breadcrumb
            quadrantLabel={q.label}
            quadrantKey={q.key}
            path={[]}
            onGoOverview={() => setView({ level: 'overview' })}
          />
          <FolderContents
            color={q.color}
            quadrant={q.key}
            currentFolderId={null}
            folders={q.rootFolders}
            docs={q.rootDocs}
            setView={setView}
            onOpenDoc={onOpenDoc}
            onCreateFolder={onCreateFolder}
            onRenameFolder={onRenameFolder}
            onDeleteFolder={onDeleteFolder}
            onDeleteDoc={onDeleteDoc}
            onPickMoveTarget={onPickMoveTarget}
          />
        </div>
        <DragOverlay>{renderDragPreview(dragPreview)}</DragOverlay>
      </DndContext>
    )
  }

  // FOLDER (any depth)
  const found = findFolderWithPath(data, view.folderId)
  if (!found) {
    // Render nada — el useEffect arriba ya hará setView(overview).
    return null
  }
  const { quadrant: q, path } = found
  const currentFolder = path[path.length - 1]
  return (
    <DndContext sensors={sensors} onDragStart={(e) => setDragPreview(e.active.data.current as DragData)} onDragEnd={handleDragEnd}>
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <Breadcrumb
          quadrantLabel={q.label}
          quadrantKey={q.key}
          path={path}
          onGoOverview={() => setView({ level: 'overview' })}
          onGoQuadrant={() => setView({ level: 'quadrant', q: q.key })}
          onGoFolder={(folderId) => setView({ level: 'folder', folderId })}
        />
        <FolderContents
          color={q.color}
          quadrant={q.key}
          currentFolderId={currentFolder.id}
          folders={currentFolder.subFolders}
          docs={currentFolder.docs}
          setView={setView}
          onOpenDoc={onOpenDoc}
          onCreateFolder={onCreateFolder}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onDeleteDoc={onDeleteDoc}
          onPickMoveTarget={onPickMoveTarget}
        />
      </div>
      <DragOverlay>{renderDragPreview(dragPreview)}</DragOverlay>
    </DndContext>
  )
}

/* ─── Subcomponentes ─────────────────────────────────────────────────────── */

function QuadrantCard({ quadrant, onOpen }: { quadrant: BrainQuadrant; onOpen: () => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `quadrant-drop:${quadrant.key}`,
    data: { kind: 'quadrant-root', quadrant: quadrant.key } satisfies DropData,
  })
  const count = useMemo(() => {
    let n = quadrant.rootDocs.length
    function visit(f: BrainFolder) {
      n += f.docs.length
      for (const sub of f.subFolders) visit(sub)
    }
    for (const f of quadrant.rootFolders) visit(f)
    return n
  }, [quadrant])
  return (
    <button
      ref={setNodeRef}
      onClick={onOpen}
      className={`${CARD} ${isOver ? 'border-amber-400/70 ring-2 ring-amber-400/40' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <Dot c={quadrant.color} big />
        <h2 className="flex-1 truncate font-display text-lg text-neutral-100">{quadrant.label}</h2>
        <span className={PILL}>{count}</span>
      </div>
      <p className="text-[12px] leading-snug text-neutral-100/45">{quadrant.blurb}</p>
    </button>
  )
}

function FolderContents({
  color,
  quadrant,
  currentFolderId,
  folders,
  docs,
  setView,
  onOpenDoc,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onDeleteDoc,
  onPickMoveTarget,
}: {
  color: string
  quadrant: string
  currentFolderId: string | null
  folders: BrainFolder[]
  docs: BrainDoc[]
  setView: (v: View) => void
  onOpenDoc: (slug: string) => void
  onCreateFolder?: (quadrant: string, parentFolderId: string | null) => void
  onRenameFolder?: (id: string, currentName: string) => void
  onDeleteFolder?: (id: string, name: string, totalDocs: number) => void
  onDeleteDoc?: (id: string, title: string) => void
  onPickMoveTarget?: (item: { kind: 'doc' | 'folder'; id: string; label: string }) => void
}) {
  return (
    <>
      {onCreateFolder && (
        <button
          onClick={() => onCreateFolder(quadrant, currentFolderId)}
          className="mb-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-widest text-amber-400/80 hover:text-amber-400 border border-amber-400/25 hover:border-amber-400/50 rounded-lg px-3 py-2 transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nueva carpeta aquí
        </button>
      )}

      {folders.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {folders.map((sub) => (
            <FolderCard
              key={sub.id}
              folder={sub}
              color={color}
              onOpen={() => setView({ level: 'folder', folderId: sub.id })}
              onRename={() => onRenameFolder?.(sub.id, sub.name)}
              onMoveTo={() => onPickMoveTarget?.({ kind: 'folder', id: sub.id, label: sub.name })}
              onDelete={() => onDeleteFolder?.(sub.id, sub.name, folderTotalCount(sub))}
            />
          ))}
        </div>
      )}

      {docs.length > 0 ? (
        <ul className="space-y-2">
          {docs.map((doc) => {
            // `from` codifica DÓNDE estaba el usuario al abrir el documento, para
            // que recursos visuales (brandkit, etc.) puedan reconstruir el "Volver"
            // hacia la carpeta exacta. Carpeta tiene prioridad sobre cuadrante.
            const from = currentFolderId ? `f:${currentFolderId}` : `q:${quadrant}`
            return (
              <li key={doc.id}>
                <DocRow
                  doc={doc}
                  color={color}
                  href={`/knowledge/${doc.slug}?from=${encodeURIComponent(from)}`}
                  onOpen={() => onOpenDoc(doc.slug)}
                  onMoveTo={() => onPickMoveTarget?.({ kind: 'doc', id: doc.id, label: doc.title })}
                  onDelete={() => onDeleteDoc?.(doc.id, doc.title)}
                />
              </li>
            )
          })}
        </ul>
      ) : folders.length === 0 ? (
        <p className="text-sm italic text-neutral-100/40">Carpeta vacía. Crea una subcarpeta o arrastra documentos aquí desde el icono ⋮⋮.</p>
      ) : null}
    </>
  )
}

function renderDragPreview(d: DragData | null) {
  if (!d) return null
  if (d.kind === 'doc') {
    return (
      <div className="rounded-[14px] border border-amber-400/60 bg-[#1E1E1E] px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[300px]">
        <Diamond c={d.color} />
        <span className="truncate text-sm text-neutral-100/90">{d.title}</span>
      </div>
    )
  }
  return (
    <div className="rounded-[14px] border border-amber-400/60 bg-[#1E1E1E] px-4 py-3 shadow-2xl flex items-center gap-3 max-w-[300px]">
      <Dot c={d.color} />
      <span className="truncate text-sm text-neutral-100">{d.name}</span>
    </div>
  )
}
