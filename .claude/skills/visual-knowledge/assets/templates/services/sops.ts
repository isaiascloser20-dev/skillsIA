import { createClient } from '@/lib/supabase/server'
import {
  QUADRANTS,
  groupByQuadrant,
  splitBySubfolder,
  type FolderRow,
  type KnowledgeSettings,
  type SopRow,
} from './quadrants'
import { buildBrainData } from '../components/brain/brain-data'
import type { BrainFolder } from '../components/brain/types'

// Re-export client-safe constants/types para no romper imports existentes desde servidor.
export {
  QUADRANTS,
  QUADRANT_LABEL,
  isQuadrant,
  groupByQuadrant,
  splitBySubfolder,
  type Quadrant,
  type QuadrantMeta,
  type SopRow,
  type FolderRow,
} from './quadrants'

const SELECT = 'id, slug, title, description, content_md, quadrant, folder_id, subfolder, position, active, updated_at'

export async function listSops(): Promise<SopRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('knowledges')
    .select(SELECT)
    .is('archived_at', null)
    .order('position', { ascending: true })
    .order('updated_at', { ascending: false })
  return (data ?? []) as SopRow[]
}

export async function listFolders(): Promise<FolderRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('knowledge_folders')
    .select('id, name, quadrant, parent_folder_id, position')
    .is('archived_at', null)
    .order('position', { ascending: true })
    .order('name', { ascending: true })
  return (data ?? []) as FolderRow[]
}

export async function getSopBySlug(slug: string): Promise<SopRow | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('knowledges')
    .select(SELECT)
    .eq('slug', slug)
    .maybeSingle()
  return (data ?? null) as SopRow | null
}

/**
 * Lee los settings del Knowledge desde la fila singleton de BD. Si la fila
 * no existe o algún campo es NULL, el caller debe aplicar el fallback con
 * `resolveQuadrants()` y `QUADRANTS`.
 */
export async function getKnowledgeSettings(): Promise<KnowledgeSettings> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('knowledge_settings')
    .select('project_name, core_color, quadrants')
    .eq('id', 'singleton')
    .maybeSingle()
  if (!data) return { project_name: null, core_color: null, quadrants: null }
  return data as KnowledgeSettings
}

/**
 * Devuelve TODO el Knowledge activo como un único bloque de texto, listo para
 * inyectar en el system prompt de cualquier IA conectada. Plan B: respeta la
 * jerarquía multi-nivel de carpetas (cuadrante → folder → subFolder → ...).
 *
 * Formato:
 *   # KNOWLEDGE
 *   ## Cuadrante
 *   ### Doc raíz
 *   ## Cuadrante › Carpeta
 *   ## Cuadrante › Carpeta › Subcarpeta
 *   ...
 */
export async function getSopsAsContextBlock(): Promise<string> {
  const [sops, folders] = await Promise.all([listSops(), listFolders()])
  const active = sops.filter((s) => s.active)
  if (active.length === 0) return ''

  const data = buildBrainData(active, folders)

  // Indexamos sops por id para acceder al content_md (BrainDoc solo lleva title/slug/desc).
  const sopById = new Map(active.map((s) => [s.id, s] as const))

  function renderDocsArr(docs: { id: string; title: string }[]): string {
    return docs
      .map((d) => {
        const s = sopById.get(d.id)
        return s ? `### ${s.title}\n\n${s.content_md.trim()}` : ''
      })
      .filter(Boolean)
      .join('\n\n---\n\n')
  }

  const blocks: string[] = []
  for (const q of data) {
    const hasContent = q.rootDocs.length > 0 || q.rootFolders.length > 0
    if (!hasContent) continue

    // Docs en raíz del cuadrante
    if (q.rootDocs.length > 0) {
      blocks.push(`## ${q.label}\n\n${renderDocsArr(q.rootDocs)}`)
    }

    // Recorrido recursivo de folders generando un bloque por carpeta
    function visit(folder: BrainFolder, pathLabel: string) {
      const fullPath = `${q.label} › ${pathLabel}`
      if (folder.docs.length > 0) {
        blocks.push(`## ${fullPath}\n\n${renderDocsArr(folder.docs)}`)
      }
      for (const sub of folder.subFolders) {
        visit(sub, `${pathLabel} › ${sub.name}`)
      }
    }
    for (const root of q.rootFolders) visit(root, root.name)
  }

  return [
    '# KNOWLEDGE — cerebro compartido del SaaS',
    'Esta es la fuente única de conocimiento del SaaS. La lee Claude Code y cualquier IA conectada al proyecto. Consúltala como primer recurso antes de actuar.',
    '',
    blocks.join('\n\n'),
  ].join('\n')
}
