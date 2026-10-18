/** Tipos del cerebro 3D del Knowledge (sin imports pesados). */

export interface BrainDoc {
  id: string
  title: string
  slug: string
  /** Descripción corta — se muestra en la card flotante del 3D al tap. */
  description: string | null
}

/**
 * Carpeta jerárquica del Knowledge. Recursiva: puede contener documentos y
 * otras carpetas como hijas. La raíz de cada cuadrante son las carpetas con
 * `parentId === null` agrupadas en `BrainQuadrant.rootFolders`.
 */
export interface BrainFolder {
  id: string
  name: string
  parentId: string | null
  quadrantKey: string
  docs: BrainDoc[]
  subFolders: BrainFolder[]
}

export interface BrainQuadrant {
  key: string
  label: string
  blurb: string
  color: string
  /** Documentos sin carpeta (raíz del cuadrante). */
  rootDocs: BrainDoc[]
  /** Carpetas del primer nivel (parent_folder_id IS NULL). */
  rootFolders: BrainFolder[]
}

/**
 * Estado de navegación del cerebro. Plan B (Google Drive):
 *  - overview: viendo los 6 cuadrantes
 *  - quadrant: dentro de un cuadrante (ve sus folders y docs raíz)
 *  - folder: dentro de una carpeta cualquiera (ve subFolders y docs)
 *
 * `folderId` es la fuente única de verdad. El quadrant se deduce del folder.
 */
export type View =
  | { level: 'overview' }
  | { level: 'quadrant'; q: string }
  | { level: 'folder'; folderId: string }
