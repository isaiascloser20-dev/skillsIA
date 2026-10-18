import { listSops, listFolders, getKnowledgeSettings } from '@/features/knowledge/services/sops'
import { resolveQuadrants } from '@/features/knowledge/services/quadrants'
import { buildBrainData } from '@/features/knowledge/components/brain/brain-data'
import KnowledgeBrainClient from '@/features/knowledge/components/KnowledgeBrainClient'

export const dynamic = 'force-dynamic'

export default async function KnowledgePage() {
  const [sops, folders, settings] = await Promise.all([
    listSops(),
    listFolders(),
    getKnowledgeSettings(),
  ])
  // Settings de BD pueden sobreescribir nombre, cuadrantes y color del núcleo
  // — si la BD no tiene valor, cae al default ('Knowledge' para nombre, los
  // QUADRANTS hardcoded para los cuadrantes, '#EBD9A8' para el color).
  const quadrants = resolveQuadrants(settings.quadrants)
  const coreName = settings.project_name?.trim() || 'Knowledge'
  const coreColor = settings.core_color?.trim() || '#EBD9A8'
  // Pasamos los cuadrantes resueltos al builder para que las BrainQuadrant
  // lleven los colores/labels/blurbs configurados desde la UI.
  const data = buildBrainData(sops, folders, quadrants)
  return (
    <KnowledgeBrainClient
      data={data}
      coreName={coreName}
      coreColor={coreColor}
      quadrants={quadrants}
    />
  )
}
