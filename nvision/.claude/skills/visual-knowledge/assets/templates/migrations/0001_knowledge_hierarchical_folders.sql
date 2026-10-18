-- ============================================================================
-- Knowledge — jerarquía multi-nivel de carpetas (Plan B "Google Drive")
-- ============================================================================
-- Aplica esta migración en tu proyecto Supabase. Requisitos previos:
--   1. Tabla `knowledges` ya existe con columnas:
--      id, slug, title, description, content_md, quadrant, subfolder,
--      position, active, created_at, updated_at, archived_at
--   2. Tabla `profiles` con `role_id` y join a `roles.name='admin'`
--      (para las RLS policies). Si tu rol admin tiene otro nombre, ajusta.
--
-- Lo que hace:
--   - Crea `knowledge_folders` con auto-referencia jerárquica.
--   - Añade `folder_id` a `knowledges`.
--   - Migra cada (quadrant, subfolder) único de sops → folder + enlaza docs.
--   - Triggers: anti-ciclo + updated_at automático.
--   - RLS: admin all-access + auth-read.
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quadrant text NOT NULL,
  parent_folder_id uuid REFERENCES knowledge_folders(id) ON DELETE CASCADE,
  position int4 NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_folders_parent ON knowledge_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_folders_quadrant ON knowledge_folders(quadrant);
CREATE INDEX IF NOT EXISTS idx_knowledge_folders_archived ON knowledge_folders(archived_at) WHERE archived_at IS NULL;

ALTER TABLE knowledge_folders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_all_folders" ON knowledge_folders;
CREATE POLICY "admin_all_folders" ON knowledge_folders FOR ALL TO public
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN roles r ON p.role_id = r.id
    WHERE p.id = auth.uid() AND r.name = 'admin'
  )
);

DROP POLICY IF EXISTS "auth_read_folders" ON knowledge_folders;
CREATE POLICY "auth_read_folders" ON knowledge_folders FOR SELECT TO authenticated
USING (archived_at IS NULL);

ALTER TABLE knowledges
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES knowledge_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_knowledges_folder ON knowledges(folder_id);

-- Migración de datos: cada (quadrant, subfolder) único → folder raíz del cuadrante
INSERT INTO knowledge_folders (name, quadrant, parent_folder_id, position)
SELECT DISTINCT subfolder, quadrant, NULL::uuid, 0
FROM knowledges
WHERE subfolder IS NOT NULL
  AND subfolder <> ''
  AND archived_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM knowledge_folders f
    WHERE f.name = knowledges.subfolder
      AND f.quadrant = knowledges.quadrant
      AND f.parent_folder_id IS NULL
  );

UPDATE knowledges s
SET folder_id = f.id
FROM knowledge_folders f
WHERE s.subfolder IS NOT NULL
  AND s.subfolder <> ''
  AND s.archived_at IS NULL
  AND f.name = s.subfolder
  AND f.quadrant = s.quadrant
  AND f.parent_folder_id IS NULL
  AND s.folder_id IS NULL;

-- Trigger anti-ciclo (impide mover una carpeta dentro de su descendiente)
CREATE OR REPLACE FUNCTION knowledge_folders_check_cycle()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ancestor_id uuid;
BEGIN
  IF NEW.parent_folder_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_folder_id = NEW.id THEN
    RAISE EXCEPTION 'Una carpeta no puede ser su propio padre';
  END IF;
  ancestor_id := NEW.parent_folder_id;
  WHILE ancestor_id IS NOT NULL LOOP
    IF ancestor_id = NEW.id THEN
      RAISE EXCEPTION 'No se puede mover una carpeta dentro de su propio descendiente';
    END IF;
    SELECT parent_folder_id INTO ancestor_id FROM knowledge_folders WHERE id = ancestor_id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_knowledge_folders_check_cycle ON knowledge_folders;
CREATE TRIGGER trg_knowledge_folders_check_cycle
BEFORE INSERT OR UPDATE OF parent_folder_id ON knowledge_folders
FOR EACH ROW EXECUTE FUNCTION knowledge_folders_check_cycle();

-- updated_at automático
CREATE OR REPLACE FUNCTION knowledge_folders_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_knowledge_folders_touch ON knowledge_folders;
CREATE TRIGGER trg_knowledge_folders_touch
BEFORE UPDATE ON knowledge_folders
FOR EACH ROW EXECUTE FUNCTION knowledge_folders_touch_updated_at();

COMMENT ON TABLE knowledge_folders IS
'Carpetas jerárquicas del Knowledge (árbol N-nivel). Reemplaza subfolder plano.';

COMMENT ON COLUMN knowledges.folder_id IS
'Carpeta del doc. NULL = raíz del cuadrante. Reemplaza subfolder (deprecado).';
