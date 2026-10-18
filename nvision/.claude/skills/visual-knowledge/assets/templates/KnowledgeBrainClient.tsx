'use client'

import dynamic from 'next/dynamic'
import { useCallback, useRef, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  createSop,
  deleteSop,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  moveSop,
} from '@/actions/knowledge'
import { isQuadrant } from '@/features/knowledge/services/quadrants'
import { CROSS_LINKS, findFolderWithPath } from './brain/brain-data'
import { ArchivePanel } from './ArchivePanel'
import { encodeView, decodeView } from './brain/view-url'
import type { QuadrantMeta } from '../services/quadrants'
import type { BrainQuadrant, View } from './brain/types'

const KnowledgeBrain = dynamic(() => import('./brain/KnowledgeBrain').then((m) => m.KnowledgeBrain), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[80vh] w-full items-center justify-center bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400/20 border-t-amber-400" />
        <p className="text-[10px] uppercase tracking-widest text-amber-400/60">Cargando el cerebro…</p>
      </div>
    </div>
  ),
})

export default function KnowledgeBrainClient({
  data,
  coreName = 'Knowledge',
  quadrants = [],
  coreColor = '#EBD9A8',
}: {
  data: BrainQuadrant[]
  /**
   * Nombre del proyecto a mostrar en la bola central del cerebro y en el
   * eyebrow. El skill es genérico: el dueño pasa su nombre desde la page.
   */
  coreName?: string
  /** Cuadrantes efectivos (resueltos con settings de BD + defaults). */
  quadrants?: QuadrantMeta[]
  /** Color del núcleo central. */
  coreColor?: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, start] = useTransition()
  const [archiveOpen, setArchiveOpen] = useState(false)

  const initialView = decodeView(searchParams?.get('view') ?? null)
  const currentViewRef = useRef<View>(initialView)

  const onViewChange = useCallback(
    (v: View) => {
      currentViewRef.current = v
      const encoded = encodeView(v)
      const url = encoded ? `/knowledge?view=${encoded}` : '/knowledge'
      router.replace(url, { scroll: false })
    },
    [router],
  )

  const onOpenDoc = useCallback(
    (slug: string) => {
      const encoded = encodeView(currentViewRef.current)
      const url = encoded ? `/knowledge/${slug}?from=${encoded}` : `/knowledge/${slug}`
      router.push(url)
    },
    [router],
  )

  // Crear doc en la ubicación actual (folder o raíz del cuadrante).
  const onCreate = useCallback(() => {
    start(async () => {
      try {
        const view = currentViewRef.current
        const quadrant = view.level === 'quadrant'
          ? view.q
          : view.level === 'folder'
            ? findQuadrantOfFolder(data, view.folderId) ?? 'sistema'
            : 'sistema'
        const folderId = view.level === 'folder' ? view.folderId : null
        const r = await createSop({
          slug: `nuevo-${Date.now().toString(36)}`,
          title: 'Nuevo documento',
          quadrant: isQuadrant(quadrant) ? quadrant : 'sistema',
          // El editor luego puede mover el doc a otra carpeta. Por ahora la creación
          // del doc usa subfolder=null y folder_id se asigna después si el usuario lo mueve.
          // (createSop no soporta folder_id aún — actualizo si hace falta)
          content_md: '# Nuevo documento\n\nEscribe aquí el contenido.',
        })
        // Si el view actual es folder, mover el doc recién creado a esa carpeta.
        if (folderId) {
          // Obtener el id del sop recién creado por su slug.
          const { createClient } = await import('@/lib/supabase/client')
          const sb = createClient()
          const { data: row } = await sb.from('knowledges').select('id').eq('slug', r.slug).maybeSingle()
          const sopId = (row as { id?: string } | null)?.id
          if (sopId) {
            await moveSop({ id: sopId, target_folder_id: folderId })
          }
        }
        const encoded = encodeView(currentViewRef.current)
        const url = encoded ? `/knowledge/${r.slug}?from=${encoded}` : `/knowledge/${r.slug}`
        router.push(url)
      } catch (e) {
        alert((e as Error).message || 'Error al crear')
      }
    })
  }, [data, router])

  const onDeleteDoc = useCallback(
    (id: string, title: string) => {
      if (!confirm(`Borrar "${title}"?\n\nIrá al Archivador y podrás recuperarlo.`)) return
      start(async () => {
        try {
          await deleteSop(id)
          router.refresh()
        } catch (e) {
          alert((e as Error).message || 'Error al borrar')
        }
      })
    },
    [router],
  )

  const onCreateFolder = useCallback(
    (quadrant: string, parentFolderId: string | null) => {
      const name = prompt('Nombre de la carpeta nueva:')?.trim()
      if (!name) return
      if (!isQuadrant(quadrant)) return
      start(async () => {
        try {
          await createFolder({ name, quadrant, parent_folder_id: parentFolderId })
          router.refresh()
        } catch (e) {
          alert((e as Error).message || 'Error al crear carpeta')
        }
      })
    },
    [router],
  )

  const onRenameFolder = useCallback(
    (id: string, currentName: string) => {
      const name = prompt('Renombrar carpeta:', currentName)?.trim()
      if (!name || name === currentName) return
      start(async () => {
        try {
          await renameFolder({ id, name })
          router.refresh()
        } catch (e) {
          alert((e as Error).message || 'Error al renombrar')
        }
      })
    },
    [router],
  )

  const onDeleteFolder = useCallback(
    (id: string, name: string, totalDocs: number) => {
      const msg = `Borrar la carpeta "${name}"?\n\nSe archivarán ${totalDocs} documento${
        totalDocs === 1 ? '' : 's'
      } + sus subcarpetas. Recuperables desde el Archivador.`
      if (!confirm(msg)) return

      // Si el view actual está dentro de la carpeta a borrar (o ES la carpeta),
      // calculamos el view destino: padre directo si lo hay, o quadrant.
      let nextView: View | null = null
      const currentView = currentViewRef.current
      if (currentView.level === 'folder') {
        const currentPath = findFolderWithPath(data, currentView.folderId)
        if (currentPath) {
          const isInDeletedSubtree =
            currentView.folderId === id || currentPath.path.some((f) => f.id === id)
          if (isInDeletedSubtree) {
            const deletedFolder = findFolderWithPath(data, id)
            if (deletedFolder && deletedFolder.path.length > 1) {
              const parent = deletedFolder.path[deletedFolder.path.length - 2]
              nextView = { level: 'folder', folderId: parent.id }
            } else if (deletedFolder) {
              nextView = { level: 'quadrant', q: deletedFolder.quadrant.key }
            }
          }
        }
      }

      start(async () => {
        try {
          await deleteFolder(id)
          if (nextView) {
            const encoded = encodeView(nextView)
            const url = encoded ? `/knowledge?view=${encoded}` : '/knowledge'
            router.replace(url, { scroll: false })
          }
          router.refresh()
        } catch (e) {
          alert((e as Error).message || 'Error al borrar carpeta')
        }
      })
    },
    [data, router],
  )

  const onMoveSop = useCallback(
    (sopId: string, targetFolderId: string | null, targetQuadrant?: string) => {
      start(async () => {
        try {
          await moveSop({
            id: sopId,
            target_folder_id: targetFolderId,
            target_quadrant: targetQuadrant && isQuadrant(targetQuadrant) ? targetQuadrant : undefined,
          })
          router.refresh()
        } catch (e) {
          alert((e as Error).message || 'Error al mover documento')
        }
      })
    },
    [router],
  )

  const onMoveFolder = useCallback(
    (folderId: string, targetParentId: string | null, targetQuadrant?: string) => {
      start(async () => {
        try {
          await moveFolder({
            id: folderId,
            target_parent_folder_id: targetParentId,
            target_quadrant: targetQuadrant && isQuadrant(targetQuadrant) ? targetQuadrant : undefined,
          })
          router.refresh()
        } catch (e) {
          alert((e as Error).message || 'Error al mover carpeta')
        }
      })
    },
    [router],
  )

  return (
    <div className="relative h-full min-h-[80vh] w-full">
      <KnowledgeBrain
        data={data}
        crossLinks={CROSS_LINKS}
        initialView={initialView}
        onViewChange={onViewChange}
        onOpenDoc={onOpenDoc}
        onCreate={onCreate}
        onOpenArchive={() => setArchiveOpen(true)}
        onDeleteDoc={onDeleteDoc}
        onCreateFolder={onCreateFolder}
        onRenameFolder={onRenameFolder}
        onDeleteFolder={onDeleteFolder}
        onMoveSop={onMoveSop}
        onMoveFolder={onMoveFolder}
        coreName={coreName}
        quadrantsForSettings={quadrants}
        coreColor={coreColor}
      />
      {archiveOpen && <ArchivePanel onClose={() => setArchiveOpen(false)} />}
    </div>
  )
}

/** Busca el cuadrante al que pertenece una carpeta dada (recorre el árbol). */
function findQuadrantOfFolder(data: BrainQuadrant[], folderId: string): string | null {
  for (const q of data) {
    function walk(folders: BrainQuadrant['rootFolders']): boolean {
      for (const f of folders) {
        if (f.id === folderId) return true
        if (walk(f.subFolders)) return true
      }
      return false
    }
    if (walk(q.rootFolders)) return q.key
  }
  return null
}
