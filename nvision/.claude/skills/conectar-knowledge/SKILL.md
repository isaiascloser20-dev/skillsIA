---
name: conectar-knowledge
scope: template
description: "Conecta un ecosistema VIEJO al Knowledge 3D (el cerebro neuronal + carpetas tipo Google Drive + la parte OS), para los que aun no lo tienen o lo tienen en el esquema viejo. ADITIVO e IDEMPOTENTE: nunca borra nada, NUNCA toca el sistema de roles, y DETECTA primero si ya lo tienes (a quien ya lo tiene no le hace nada). Triggers: conectar knowledge, no tengo el knowledge 3d, mi cerebro 3d sale vacio, tengo el knowledge viejo, pasar al knowledge nuevo, conectar-knowledge, quiero el cerebro neuronal, migrar mi knowledge."
allowed-tools: Read, Bash, Glob, Edit
license: MIT
---

# conectar-knowledge — engancha un ecosistema viejo al Knowledge 3D

Pone al dia el **sistema del Knowledge** de un ecosistema que se creo con una version vieja: el
contrato de datos nuevo (`knowledges` + `knowledge_folders` + `knowledge_settings`) y la cara visual
(el **cerebro neuronal 3D** + carpetas tipo Google Drive, dentro del shell OS que ya tiene).

> **DOS entregables, los DOS obligatorios:**
> 1. **El sistema por detras** — las tablas + el contrato de datos (pasos 1-4 y 6).
> 2. **La cara 3D** — el cerebro neuronal navegable + carpetas, montado via `/visual-knowledge` (paso 5).
>
> El skill **NO esta terminado** hasta que abres `/knowledge` y el **cerebro 3D sale CON los datos dentro** (paso 7). Un backend migrado sin la cara 3D es trabajo a medias — no cuenta como hecho.

## Lo primero SIEMPRE — la PUERTA DE DETECCION (no le des a quien ya lo tiene)

Antes de tocar NADA, mira en que estado esta el proyecto (solo lectura):

```sql
-- ¿existe la tabla del Knowledge y con que esquema?
SELECT to_regclass('public.knowledges')        AS knowledges,
       to_regclass('public.knowledge_folders') AS knowledge_folders,
       to_regclass('public.knowledge_settings') AS knowledge_settings,
       to_regclass('public.assistant_sops')    AS assistant_sops_viejo;
-- columnas de knowledges (para saber si es esquema viejo o nuevo)
SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='knowledges' ORDER BY ordinal_position;
```

Y mira si la cara 3D ya esta montada:
```bash
ls src/app/\(admin\)/knowledge/page.tsx 2>/dev/null && grep -l "KnowledgeBrainClient" src/app/\(admin\)/knowledge/page.tsx 2>/dev/null
```

**Tres resultados posibles:**

| Estado detectado | Que hacer |
|---|---|
| **Ya lo tiene** (`knowledge_folders` + `knowledge_settings` existen Y la pagina usa `KnowledgeBrainClient`) | **NADA.** Reporta *"Ya estas conectado al Knowledge 3D, no hay que actualizar nada."** y termina. |
| **Lo tiene viejo** (existe `knowledges` con `cuadrante`/`content`, o existe `assistant_sops`, pero faltan folders/settings o la cara 3D) | **Migracion aditiva** (pasos de abajo). |
| **No lo tiene** (no existe `knowledges` ni `assistant_sops`) | Falta el backend del Knowledge. Ejecuta primero `/new-ecoai` (solo su parte del Knowledge, sin tocar roles) para crear `knowledges`, y luego sigue con los pasos de abajo. |

Reporta al dueno lo que detectaste ANTES de seguir.

## Reglas DURAS (no negociables)

1. **ADITIVA.** Anade columnas/tablas nuevas y COPIA datos. **NUNCA** `DROP COLUMN`/`DROP TABLE` hasta que el dueno confirme por escrito que todo se ve bien.
2. **IDEMPOTENTE.** Se puede correr 2+ veces sin romper nada (`IF NOT EXISTS`/`ON CONFLICT`/updates condicionados a `IS NULL`).
3. **NUNCA toca el sistema de ROLES.** No crea, no altera, no borra `roles`, sus filas, ni `profiles.role_id`. Solo VERIFICA que exista un rol admin para la RLS del Knowledge; si no, PARA y pregunta.
4. **BACKUP primero.** Antes de cualquier `UPDATE`, exporta los `knowledges` actuales (guarda el SELECT / muestraselo al dueno).
5. **La cara 3D la monta `/visual-knowledge`**, no este skill.

---

## Migracion (solo si la puerta dio "lo tiene viejo" / "no lo tiene")

### Paso 1 — Backup del Knowledge (no destructivo)
```sql
SELECT * FROM knowledges ORDER BY created_at;
```
Guarda el resultado. Es la red de seguridad antes de cualquier `UPDATE`.

### Paso 2 — Anadir las columnas nuevas (ADITIVO, idempotente)
```sql
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS slug text;
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS description text DEFAULT '';
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS content_md text;
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS quadrant text;
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS subfolder text;
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE public.knowledges ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0;
```
> `position` es obligatoria en el contrato de `new-ecoai` + `visual-knowledge` (ordena los docs dentro de cada cuadrante). Un ecosistema viejo puede no tenerla — por eso se añade aquí.

### Paso 3 — Copiar datos viejos → columnas nuevas (solo donde esten vacias)
```sql
UPDATE public.knowledges SET quadrant = cuadrante::text
  WHERE quadrant IS NULL AND cuadrante IS NOT NULL;
UPDATE public.knowledges SET content_md = content
  WHERE content_md IS NULL AND content IS NOT NULL;
UPDATE public.knowledges SET content_md = COALESCE(content_md, '') WHERE content_md IS NULL;
-- position: ordena por fecha dentro de cada cuadrante (solo donde quedo en 0, idempotente)
UPDATE public.knowledges k SET position = s.rn
  FROM (SELECT id, row_number() OVER (PARTITION BY quadrant ORDER BY created_at) AS rn
        FROM public.knowledges) s
  WHERE k.id = s.id AND k.position = 0;
```
**Slug:** genera un `slug` en kebab-case desde el `title` para cada fila con `slug IS NULL`, garantizando unicidad (si dos chocan, anade `-2`, `-3`...). Verifica al final que no hay `slug` NULL ni duplicados.

### Paso 4 — Aplicar las restricciones del contrato (con los datos ya copiados)
```sql
ALTER TABLE public.knowledges ALTER COLUMN content_md SET DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS knowledges_slug_key ON public.knowledges(slug);
CREATE INDEX IF NOT EXISTS idx_knowledges_quadrant ON public.knowledges(quadrant);
```

### Paso 5 — Folders + settings + folder_id + la cara 3D → `/visual-knowledge`
Ejecuta **`/visual-knowledge`**. Sus migraciones (`knowledge_folders` + `knowledge_settings` + `folder_id` en `knowledges`) son idempotentes (`IF NOT EXISTS`). Eso completa el contrato y monta el cerebro 3D sobre los datos ya migrados, dentro del shell OS que ya existe.

### Paso 6 — RLS del Knowledge: VERIFICAR, NUNCA TOCAR los roles
Si hay `roles` + `profiles.role_id` + un rol `admin` → no toques nada de roles, solo asegura la RLS (idempotente):
```sql
ALTER TABLE public.knowledges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_knowledges" ON public.knowledges;
CREATE POLICY "admin_all_knowledges" ON public.knowledges FOR ALL TO public
USING (EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id
               WHERE p.id = auth.uid() AND r.name = 'admin'));
```
> Si el rol admin se llama distinto, PREGUNTA el nombre y ajusta SOLO esta policy. Si falta `roles`/`role_id`/admin → PARA y avisa: *"Necesito un rol admin para proteger el Knowledge, pero no voy a tocar tu sistema de roles. Dime como gestionas el admin y ajusto solo la RLS."*

### Paso 7 — Verificar
```sql
SELECT count(*) AS total,
       count(*) FILTER (WHERE quadrant IS NOT NULL AND content_md IS NOT NULL AND slug IS NOT NULL) AS migradas
FROM public.knowledges;
```
`migradas` debe == `total`. Luego abre `/knowledge` y confirma que el cerebro 3D sale **con los datos dentro**.

### Paso 8 — Limpieza (OPCIONAL, solo con OK EXPLICITO del dueno)
Solo cuando confirme que todo se ve bien:
```sql
-- ALTER TABLE public.knowledges DROP COLUMN IF EXISTS cuadrante;
-- ALTER TABLE public.knowledges DROP COLUMN IF EXISTS content;
-- ALTER TABLE public.knowledges DROP COLUMN IF EXISTS format;
-- ALTER TABLE public.knowledges DROP COLUMN IF EXISTS owner_id;
```
Si no lo pide, se quedan. No estorban.

---

## Anti-patrones (PROHIBIDO)
- ❌ Saltarse la puerta de deteccion y correr la migracion sobre alguien que ya tiene el Knowledge nuevo.
- ❌ Borrar columnas/tablas antes de verificar y sin OK explicito.
- ❌ Crear, alterar o borrar `roles`, sus filas, o `profiles.role_id`.
- ❌ Asumir el nombre del rol admin sin verificarlo.
- ❌ Correr sin backup (Paso 1).
- ❌ Construir la pantalla del Knowledge aqui (eso es `/visual-knowledge`).

## Que deja listo
El Knowledge del ecosistema, en el contrato nuevo (`knowledges` + `knowledge_folders` + `knowledge_settings`), con los datos intactos y el **cerebro 3D** montado sobre el shell OS. Los roles, sin un solo cambio.
