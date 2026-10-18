/**
 * Constantes y tipos del Knowledge — client-safe.
 * NO importa nada de servidor (supabase/server, next/headers), por lo que puede
 * usarse tanto en componentes cliente como en código de servidor.
 */

/** Cuadrantes/carpetas del Knowledge del SaaS. */
export type Quadrant = 'marketing' | 'ventas' | 'producto' | 'finanzas' | 'sistema' | 'personal'

export interface QuadrantMeta {
  key: Quadrant
  label: string
  blurb: string
  /** Color de acento del nodo en el cerebro 3D. */
  color: string
}

/**
 * Las 6 carpetas del Knowledge, en orden de presentación.
 * 4 cuadrantes de negocio + Sistema/Desarrollo + Personal.
 */
export const QUADRANTS: QuadrantMeta[] = [
  { key: 'marketing', label: 'Marketing', blurb: 'Marca, contenido, copy, hooks e identidad', color: '#C2A665' },
  { key: 'ventas', label: 'Ventas', blurb: 'Pagos, CRM, cierre y ofertas', color: '#5FB8A0' },
  { key: 'producto', label: 'Producto', blurb: 'El SaaS: arquitectura, features y UX', color: '#7C8FE8' },
  { key: 'finanzas', label: 'Finanzas', blurb: 'Números, métricas y unit economics', color: '#E0A94F' },
  { key: 'sistema', label: 'Sistema / Desarrollo', blurb: 'Reglas de agente y conocimiento técnico', color: '#A98BE6' },
  { key: 'personal', label: 'Personal', blurb: 'Objetivos, vida y CRM personal del usuario', color: '#E085AE' },
]

export const QUADRANT_LABEL: Record<Quadrant, string> = Object.fromEntries(
  QUADRANTS.map((q) => [q.key, q.label]),
) as Record<Quadrant, string>

export function isQuadrant(v: string): v is Quadrant {
  return QUADRANTS.some((q) => q.key === v)
}

export interface SopRow {
  id: string
  slug: string
  title: string
  description: string | null
  content_md: string
  quadrant: Quadrant
  /** Carpeta del nuevo sistema jerárquico (NULL = raíz del cuadrante). */
  folder_id: string | null
  /** @deprecated Usar folder_id. Se mantiene como fallback durante la migración. */
  subfolder: string | null
  position: number
  active: boolean
  updated_at: string
}

/** Fila de carpeta del nuevo sistema jerárquico. */
export interface FolderRow {
  id: string
  name: string
  quadrant: Quadrant
  parent_folder_id: string | null
  position: number
}

/** Settings editables del Knowledge (fila singleton en BD). */
export interface KnowledgeSettings {
  project_name: string | null
  core_color: string | null
  quadrants: QuadrantMeta[] | null
}

/**
 * Resuelve los cuadrantes efectivos. Si hay override en BD válido, lo usa
 * (sobreescribe label/blurb/color manteniendo los keys de QUADRANTS por
 * compatibilidad). Si no, devuelve los defaults.
 */
export function resolveQuadrants(override: QuadrantMeta[] | null): QuadrantMeta[] {
  if (!override || override.length === 0) return QUADRANTS
  // Override matcheado por key — si la BD trae un key inválido lo ignoramos.
  return QUADRANTS.map((def) => {
    const o = override.find((x) => x.key === def.key)
    if (!o) return def
    return {
      key: def.key,
      label: o.label?.trim() || def.label,
      blurb: o.blurb?.trim() || def.blurb,
      color: o.color?.trim() || def.color,
    }
  })
}

/** Agrupa los SOPs por cuadrante, respetando el orden de QUADRANTS. */
export function groupByQuadrant(sops: SopRow[]): { meta: QuadrantMeta; sops: SopRow[] }[] {
  return QUADRANTS.map((meta) => ({
    meta,
    sops: sops.filter((s) => s.quadrant === meta.key),
  }))
}

/**
 * Dentro de un cuadrante, separa los SOPs en subcarpetas + los de la raíz.
 * Las subcarpetas se ordenan alfabéticamente; los docs respetan el orden recibido.
 */
export function splitBySubfolder(sops: SopRow[]): {
  subfolders: { name: string; sops: SopRow[] }[]
  rootSops: SopRow[]
} {
  const rootSops = sops.filter((s) => !s.subfolder)
  const names = Array.from(
    new Set(sops.map((s) => s.subfolder).filter((v): v is string => !!v)),
  ).sort((a, b) => a.localeCompare(b, 'es'))
  const subfolders = names.map((name) => ({
    name,
    sops: sops.filter((s) => s.subfolder === name),
  }))
  return { subfolders, rootSops }
}
