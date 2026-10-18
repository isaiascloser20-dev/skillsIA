import { QUADRANTS, type FolderRow, type QuadrantMeta, type SopRow } from '../../services/quadrants'
import type { BrainDoc, BrainFolder, BrainQuadrant } from './types'

/**
 * Convierte los SOPs reales + las folders reales al árbol del cerebro 3D
 * (Plan B: jerarquía multi-nivel "Google Drive").
 *
 * Reglas:
 *   - Las carpetas con parent_folder_id NULL son la raíz de cada cuadrante.
 *   - Cada folder puede contener subFolders y docs.
 *   - Los docs sin folder_id van a `rootDocs` del cuadrante.
 *
 * El argumento `quadrants` permite pasar los cuadrantes RESUELTOS (con los
 * overrides de label/blurb/color que vienen de `knowledge_settings` en BD).
 * Si no se pasa, usa los defaults hardcoded de `QUADRANTS`. Sin esto, el
 * color picker del SettingsPanel guardaba en BD pero el render del 3D
 * seguía usando los colores default — bug histórico.
 */
export function buildBrainData(
  sops: SopRow[],
  folders: FolderRow[],
  quadrants: QuadrantMeta[] = QUADRANTS,
): BrainQuadrant[] {
  // Indexar folders por id para construir el árbol en una pasada.
  const folderById = new Map<string, BrainFolder>()
  for (const f of folders) {
    folderById.set(f.id, {
      id: f.id,
      name: f.name,
      parentId: f.parent_folder_id,
      quadrantKey: f.quadrant,
      docs: [],
      subFolders: [],
    })
  }

  // Anidar subfolders dentro de su parent.
  for (const f of folderById.values()) {
    if (f.parentId) {
      const parent = folderById.get(f.parentId)
      if (parent) parent.subFolders.push(f)
    }
  }

  // Distribuir docs en sus folders (o quedarse para rootDocs si folder_id IS NULL).
  const docsByFolderId = new Map<string, BrainDoc[]>()
  const rootDocsByQuadrant = new Map<string, BrainDoc[]>()
  for (const s of sops) {
    const doc: BrainDoc = {
      id: s.id,
      title: s.title,
      slug: s.slug,
      description: s.description ?? null,
    }
    if (s.folder_id) {
      const arr = docsByFolderId.get(s.folder_id) ?? []
      arr.push(doc)
      docsByFolderId.set(s.folder_id, arr)
    } else {
      const arr = rootDocsByQuadrant.get(s.quadrant) ?? []
      arr.push(doc)
      rootDocsByQuadrant.set(s.quadrant, arr)
    }
  }
  for (const [folderId, docs] of docsByFolderId) {
    const f = folderById.get(folderId)
    if (f) f.docs = docs
  }

  // Ordenar nombres alfabéticamente dentro de cada nivel.
  function sortFolderTree(folder: BrainFolder) {
    folder.subFolders.sort((a, b) => a.name.localeCompare(b.name, 'es'))
    for (const sub of folder.subFolders) sortFolderTree(sub)
  }

  // Construir los cuadrantes finales con los overrides resueltos.
  return quadrants.map((meta) => {
    const rootFolders = Array.from(folderById.values())
      .filter((f) => f.quadrantKey === meta.key && f.parentId === null)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    for (const f of rootFolders) sortFolderTree(f)

    return {
      key: meta.key,
      label: meta.label,
      blurb: meta.blurb,
      color: meta.color,
      rootDocs: rootDocsByQuadrant.get(meta.key) ?? [],
      rootFolders,
    }
  })
}

/** Sinapsis cruzadas entre cuadrantes (la red viva). */
export const CROSS_LINKS: [string, string][] = [
  ['marketing', 'ventas'],
  ['marketing', 'producto'],
  ['producto', 'sistema'],
  ['sistema', 'personal'],
  ['ventas', 'finanzas'],
  ['finanzas', 'producto'],
  ['personal', 'marketing'],
]

/** Total de docs en un cuadrante (raíz + todos los descendientes). */
export function totalCount(q: BrainQuadrant): number {
  let n = q.rootDocs.length
  function visit(f: BrainFolder) {
    n += f.docs.length
    for (const sub of f.subFolders) visit(sub)
  }
  for (const f of q.rootFolders) visit(f)
  return n
}

/** Total recursivo de docs dentro de una folder (incluye descendientes). */
export function folderTotalCount(f: BrainFolder): number {
  let n = f.docs.length
  for (const sub of f.subFolders) n += folderTotalCount(sub)
  return n
}

/** Devuelve la folder + el path desde la raíz hasta ella. Útil para breadcrumb. */
export function findFolderWithPath(
  data: BrainQuadrant[],
  folderId: string,
): { quadrant: BrainQuadrant; path: BrainFolder[] } | null {
  for (const q of data) {
    for (const root of q.rootFolders) {
      const found = walk(root, [root])
      if (found) return { quadrant: q, path: found }
    }
  }
  return null

  function walk(node: BrainFolder, path: BrainFolder[]): BrainFolder[] | null {
    if (node.id === folderId) return path
    for (const sub of node.subFolders) {
      const found = walk(sub, [...path, sub])
      if (found) return found
    }
    return null
  }
}

/* ---------- búsqueda ---------- */

export interface SearchItem {
  kind: 'quadrant' | 'folder' | 'doc'
  label: string
  path: string
  color: string
  quadrantKey: string
  folderId?: string
  slug?: string
}

export function normalize(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function buildSearchIndex(data: BrainQuadrant[]): SearchItem[] {
  const out: SearchItem[] = []
  for (const q of data) {
    out.push({ kind: 'quadrant', label: q.label, path: 'Cerebro', color: q.color, quadrantKey: q.key })
    for (const doc of q.rootDocs) {
      out.push({ kind: 'doc', label: doc.title, path: q.label, color: q.color, quadrantKey: q.key, slug: doc.slug })
    }
    function visitFolder(f: BrainFolder, prefix: string) {
      const fPath = prefix ? `${prefix} › ${f.name}` : `${q.label} › ${f.name}`
      out.push({ kind: 'folder', label: f.name, path: prefix || q.label, color: q.color, quadrantKey: q.key, folderId: f.id })
      for (const doc of f.docs) {
        out.push({ kind: 'doc', label: doc.title, path: fPath, color: q.color, quadrantKey: q.key, folderId: f.id, slug: doc.slug })
      }
      for (const sub of f.subFolders) visitFolder(sub, fPath)
    }
    for (const f of q.rootFolders) visitFolder(f, '')
  }
  return out
}
