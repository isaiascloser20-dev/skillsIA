'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isQuadrant, type Quadrant } from '@/features/knowledge/services/quadrants'

interface FolderRow {
  id: string
  name: string
  quadrant: string
  parent_folder_id: string | null
  position: number
}

async function ensureAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('unauthorized')
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single()
  const isAdmin = (profile as { roles?: { name: string } } | null)?.roles?.name === 'admin'
  if (!isAdmin) throw new Error('forbidden')
  return { supabase, userId: user.id }
}

export async function updateSop(input: {
  id: string
  title: string
  description?: string | null
  content_md: string
  quadrant?: Quadrant
  subfolder?: string | null
  active?: boolean
}) {
  const { supabase, userId } = await ensureAdmin()
  const patch: Record<string, unknown> = {
    title: input.title.trim(),
    description: input.description?.trim() || null,
    content_md: input.content_md,
    active: input.active ?? true,
    updated_by: userId,
  }
  if (input.quadrant && isQuadrant(input.quadrant)) patch.quadrant = input.quadrant
  if (input.subfolder !== undefined) patch.subfolder = input.subfolder?.trim() || null
  const { error } = await supabase.from('knowledges').update(patch).eq('id', input.id)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
  revalidatePath('/knowledge/[slug]', 'page')
}

export async function createSop(input: {
  slug: string
  title: string
  description?: string | null
  content_md: string
  quadrant?: Quadrant
  subfolder?: string | null
}) {
  const { supabase, userId } = await ensureAdmin()
  // Posición = max + 1
  const { data: maxRow } = await supabase
    .from('knowledges')
    .select('position')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextPosition = ((maxRow as { position?: number } | null)?.position ?? 0) + 1
  const cleanSlug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '')
  const quadrant = input.quadrant && isQuadrant(input.quadrant) ? input.quadrant : 'sistema'
  const { error, data } = await supabase
    .from('knowledges')
    .insert({
      slug: cleanSlug,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      content_md: input.content_md,
      quadrant,
      subfolder: input.subfolder?.trim() || null,
      position: nextPosition,
      active: true,
      updated_by: userId,
    })
    .select('slug')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
  return { slug: (data as { slug: string }).slug }
}

/** "Borrar" = archivar (recuperable desde el Archivador). NO destruye datos. */
export async function deleteSop(id: string) {
  const { supabase } = await ensureAdmin()
  const { error } = await supabase
    .from('knowledges')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
}

/**
 * Archiva TODOS los docs de una subcarpeta. La subcarpeta "desaparece" del
 * cerebro porque las carpetas se infieren de docs activos: cuando no quedan
 * docs con ese (quadrant, subfolder), no se renderiza la carpeta.
 * Recuperable individualmente desde el Archivador. NO destruye datos.
 */
export async function deleteSubfolder(input: { quadrant: Quadrant; subfolder: string }) {
  const { supabase } = await ensureAdmin()
  if (!input.subfolder || !input.subfolder.trim()) {
    throw new Error('subfolder requerida')
  }
  const { error, count } = await supabase
    .from('knowledges')
    .update({ archived_at: new Date().toISOString() }, { count: 'exact' })
    .eq('quadrant', input.quadrant)
    .eq('subfolder', input.subfolder)
    .is('archived_at', null)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
  return { archived: count ?? 0 }
}

/** Lista los documentos archivados (para el Archivador). */
export async function getArchived(): Promise<
  { id: string; slug: string; title: string; quadrant: string; subfolder: string | null; archived_at: string }[]
> {
  const { supabase } = await ensureAdmin()
  const { data, error } = await supabase
    .from('knowledges')
    .select('id, slug, title, quadrant, subfolder, archived_at')
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Awaited<ReturnType<typeof getArchived>>
}

/** Restaura un documento archivado al cerebro. */
export async function restoreSop(id: string) {
  const { supabase } = await ensureAdmin()
  const { error } = await supabase.from('knowledges').update({ archived_at: null }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
}

/** Borra DEFINITIVAMENTE (solo desde el Archivador). Esto sí destruye. */
export async function purgeSop(id: string) {
  const { supabase } = await ensureAdmin()
  const { error } = await supabase.from('knowledges').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
}

// ====================================================================
// SETTINGS DEL KNOWLEDGE (editables desde la UI)
// ====================================================================

interface QuadrantOverride {
  key: string
  label?: string
  blurb?: string
  color?: string
}

/**
 * Actualiza los settings del Knowledge (fila singleton).
 * Acepta cualquier subset: project_name, core_color, quadrants.
 * Los `quadrants` se guardan tal cual como jsonb; el render resuelve con
 * `resolveQuadrants()` para fallback a los defaults.
 */
export async function updateKnowledgeSettings(input: {
  project_name?: string | null
  core_color?: string | null
  quadrants?: QuadrantOverride[] | null
}) {
  const { supabase, userId } = await ensureAdmin()
  const patch: Record<string, unknown> = { updated_by: userId, updated_at: new Date().toISOString() }
  if (input.project_name !== undefined) patch.project_name = input.project_name?.trim() || null
  if (input.core_color !== undefined) patch.core_color = input.core_color?.trim() || null
  if (input.quadrants !== undefined) {
    patch.quadrants = input.quadrants && input.quadrants.length > 0 ? input.quadrants : null
  }
  const { error } = await supabase
    .from('knowledge_settings')
    .upsert({ id: 'singleton', ...patch })
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
}

// ====================================================================
// CARPETAS JERÁRQUICAS (Plan B "Google Drive")
// ====================================================================

/** Crea una carpeta nueva. Si parent_folder_id es null → raíz del cuadrante. */
export async function createFolder(input: {
  name: string
  quadrant: Quadrant
  parent_folder_id?: string | null
}) {
  const { supabase, userId } = await ensureAdmin()
  const name = input.name.trim()
  if (!name) throw new Error('Nombre requerido')
  if (!isQuadrant(input.quadrant)) throw new Error('Cuadrante inválido')

  // Validar que el parent (si existe) pertenece al mismo cuadrante.
  if (input.parent_folder_id) {
    const { data: parent } = await supabase
      .from('knowledge_folders')
      .select('quadrant')
      .eq('id', input.parent_folder_id)
      .maybeSingle()
    if (!parent) throw new Error('Carpeta padre no encontrada')
    if ((parent as { quadrant: string }).quadrant !== input.quadrant) {
      throw new Error('La carpeta padre está en otro cuadrante')
    }
  }

  const { data, error } = await supabase
    .from('knowledge_folders')
    .insert({
      name,
      quadrant: input.quadrant,
      parent_folder_id: input.parent_folder_id ?? null,
      created_by: userId,
      updated_by: userId,
    })
    .select('id, name, quadrant, parent_folder_id, position')
    .single()
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
  return data as FolderRow
}

/** Renombra una carpeta. */
export async function renameFolder(input: { id: string; name: string }) {
  const { supabase, userId } = await ensureAdmin()
  const name = input.name.trim()
  if (!name) throw new Error('Nombre requerido')
  const { error } = await supabase
    .from('knowledge_folders')
    .update({ name, updated_by: userId })
    .eq('id', input.id)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
}

/**
 * Mueve una carpeta a otro padre (y opcionalmente otro cuadrante).
 * El trigger `knowledge_folders_check_cycle` previene ciclos automáticamente.
 * Si cambia de cuadrante, también actualiza descendientes y docs.
 */
export async function moveFolder(input: {
  id: string
  target_parent_folder_id: string | null
  target_quadrant?: Quadrant
}) {
  const { supabase, userId } = await ensureAdmin()

  // Si target_parent_folder_id existe, su cuadrante define el target_quadrant.
  let finalQuadrant: Quadrant | null = null
  if (input.target_parent_folder_id) {
    const { data: parent } = await supabase
      .from('knowledge_folders')
      .select('quadrant')
      .eq('id', input.target_parent_folder_id)
      .maybeSingle()
    if (!parent) throw new Error('Carpeta destino no encontrada')
    const parentQuadrant = (parent as { quadrant: string }).quadrant
    if (!isQuadrant(parentQuadrant)) throw new Error('Cuadrante del padre inválido')
    finalQuadrant = parentQuadrant
  } else if (input.target_quadrant) {
    if (!isQuadrant(input.target_quadrant)) throw new Error('Cuadrante inválido')
    finalQuadrant = input.target_quadrant
  }

  if (finalQuadrant === null) {
    throw new Error('Especifica target_parent_folder_id o target_quadrant')
  }

  // Update del folder principal. El trigger valida ciclo.
  const { error } = await supabase
    .from('knowledge_folders')
    .update({
      parent_folder_id: input.target_parent_folder_id,
      quadrant: finalQuadrant,
      updated_by: userId,
    })
    .eq('id', input.id)
  if (error) throw new Error(error.message)

  // Si cambia el cuadrante, propagar a TODOS los descendientes (carpetas + docs).
  // Hacemos una BFS recursiva.
  const { data: rootFolder } = await supabase
    .from('knowledge_folders')
    .select('quadrant')
    .eq('id', input.id)
    .maybeSingle()
  const newQuadrant = (rootFolder as { quadrant: string } | null)?.quadrant ?? finalQuadrant

  // Recolecta ids de TODO el subárbol.
  const allIds: string[] = [input.id]
  let frontier: string[] = [input.id]
  while (frontier.length > 0) {
    const { data: kids } = await supabase
      .from('knowledge_folders')
      .select('id')
      .in('parent_folder_id', frontier)
    const kidIds = (kids ?? []).map((k) => (k as { id: string }).id)
    if (kidIds.length === 0) break
    allIds.push(...kidIds)
    frontier = kidIds
  }

  // Actualiza cuadrante en todas las carpetas del subárbol.
  if (allIds.length > 1) {
    await supabase
      .from('knowledge_folders')
      .update({ quadrant: newQuadrant })
      .in('id', allIds.slice(1))
  }

  // Y en los docs que viven en esas carpetas.
  await supabase
    .from('knowledges')
    .update({ quadrant: newQuadrant })
    .in('folder_id', allIds)

  revalidatePath('/knowledge')
}

/** Mueve un documento a otra carpeta (o a raíz del cuadrante si target_folder_id=null). */
export async function moveSop(input: {
  id: string
  target_folder_id: string | null
  /** Si target_folder_id es null, se requiere target_quadrant. Si target_folder_id existe, se deduce del folder. */
  target_quadrant?: Quadrant
}) {
  const { supabase, userId } = await ensureAdmin()

  let finalQuadrant: Quadrant | null = null
  if (input.target_folder_id) {
    const { data: folder } = await supabase
      .from('knowledge_folders')
      .select('quadrant')
      .eq('id', input.target_folder_id)
      .maybeSingle()
    if (!folder) throw new Error('Carpeta destino no encontrada')
    const fq = (folder as { quadrant: string }).quadrant
    if (!isQuadrant(fq)) throw new Error('Cuadrante de la carpeta inválido')
    finalQuadrant = fq
  } else if (input.target_quadrant) {
    if (!isQuadrant(input.target_quadrant)) throw new Error('Cuadrante inválido')
    finalQuadrant = input.target_quadrant
  } else {
    throw new Error('Especifica target_folder_id o target_quadrant')
  }

  const { error } = await supabase
    .from('knowledges')
    .update({
      folder_id: input.target_folder_id,
      quadrant: finalQuadrant,
      subfolder: null, // limpieza del campo deprecado al mover
      updated_by: userId,
    })
    .eq('id', input.id)
  if (error) throw new Error(error.message)
  revalidatePath('/knowledge')
}

/**
 * Archiva una carpeta y todos sus descendientes (carpetas + docs).
 * Recuperable individualmente desde el Archivador.
 */
export async function deleteFolder(id: string) {
  const { supabase } = await ensureAdmin()

  // Recolecta TODO el subárbol (BFS).
  const allFolderIds: string[] = [id]
  let frontier: string[] = [id]
  while (frontier.length > 0) {
    const { data: kids } = await supabase
      .from('knowledge_folders')
      .select('id')
      .in('parent_folder_id', frontier)
    const kidIds = (kids ?? []).map((k) => (k as { id: string }).id)
    if (kidIds.length === 0) break
    allFolderIds.push(...kidIds)
    frontier = kidIds
  }

  const now = new Date().toISOString()

  // Archiva carpetas.
  const { error: folderErr } = await supabase
    .from('knowledge_folders')
    .update({ archived_at: now })
    .in('id', allFolderIds)
  if (folderErr) throw new Error(folderErr.message)

  // Archiva docs dentro del subárbol.
  const { error: sopsErr } = await supabase
    .from('knowledges')
    .update({ archived_at: now })
    .in('folder_id', allFolderIds)
    .is('archived_at', null)
  if (sopsErr) throw new Error(sopsErr.message)

  revalidatePath('/knowledge')
}
