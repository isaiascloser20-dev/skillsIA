import { notFound, redirect } from 'next/navigation'
import { getSopBySlug, listFolders } from '@/features/knowledge/services/sops'
import { KnowledgeEditorClient } from '@/features/knowledge/components/KnowledgeEditorClient'

export const dynamic = 'force-dynamic'

/**
 * Slugs especiales: SOPs registrados en BD que aparecen en el árbol del
 * Knowledge (Marketing, Producto, etc.), pero al abrirlos NO muestran el
 * editor markdown — redirigen a su vista dedicada (página o iframe).
 *
 * Útil para piezas visuales interactivas que no son texto plano:
 * brandkit, dashboards visuales, mockups, PDFs embebidos, etc.
 *
 * REGLA (al añadir un brandkit u otro recurso visual del dueño):
 *  1. Crear el SOP en knowledges con quadrant='marketing' (si es
 *     brandkit) o el que corresponda, con active=false (no contamina el
 *     contexto de la IA — es visual).
 *  2. Crear una página dedicada en `app/(admin)/knowledge/<slug-bonito>/page.tsx`
 *     que renderice el contenido visual (iframe a un HTML, viewer PDF,
 *     <img>, componente React, etc.). NUNCA texto plano — debe verse igual
 *     que el brandkit original del dueño.
 *  3. Mapear aquí abajo: `'<slug-del-sop>': '/knowledge/<slug-bonito>'`.
 *
 * Ejemplo (brandkit):
 *   'brandkit': '/knowledge/brandkit',
 */
const SPECIAL_RESOURCE_REDIRECTS: Record<string, string> = {
  // Añade aquí los recursos visuales del proyecto cuando los crees.
}

export default async function SopEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { slug } = await params
  const { from } = await searchParams

  // Redirect a recursos visuales (brandkit, dashboards, etc.) si está mapeado.
  // Propagar `?from=` para que la pantalla destino pueda construir su flecha
  // "Volver" hacia la carpeta exacta del Knowledge donde estaba el usuario.
  const redirectTo = SPECIAL_RESOURCE_REDIRECTS[slug]
  if (redirectTo) {
    const url = from ? `${redirectTo}?from=${encodeURIComponent(from)}` : redirectTo
    redirect(url)
  }

  const [sop, folders] = await Promise.all([getSopBySlug(slug), listFolders()])
  if (!sop) notFound()
  return <KnowledgeEditorClient sop={sop} folders={folders} />
}
