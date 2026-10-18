import type { View } from './types'

/**
 * Encoding/decoding del state `view` del cerebro en query params del URL.
 * Permite que la flecha "Volver" del editor preserve la ubicación exacta
 * dentro del cerebro / vista de carpetas en lugar de resetear al overview.
 *
 * Formato (Plan B, jerarquía multi-nivel):
 *   ""           → overview
 *   "q:producto" → quadrant
 *   "f:<uuid>"   → folder específica (el uuid identifica el folder)
 */
export function encodeView(v: View): string {
  if (v.level === 'overview') return ''
  if (v.level === 'quadrant') return `q:${v.q}`
  return `f:${v.folderId}`
}

export function decodeView(s: string | null | undefined): View {
  if (!s) return { level: 'overview' }
  if (s.startsWith('q:')) return { level: 'quadrant', q: s.slice(2) }
  if (s.startsWith('f:')) {
    const id = s.slice(2)
    if (id) return { level: 'folder', folderId: id }
  }
  return { level: 'overview' }
}
