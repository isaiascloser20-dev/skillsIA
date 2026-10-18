# Framework: Knowledge Visual 3D + Carpetas Jerárquicas — arquitectura a fondo

Complementa a `SKILL.md` (pasos) y `gotchas.md` (errores). Aquí va el detalle de cada pieza.

## Concepto

Capa visual + capa de carpetas sobre un Knowledge existente. **Tres niveles navegables**, pero las carpetas son **N-nivel** (sin límite de anidamiento, estilo Google Drive):

- **Overview** — los N cuadrantes raíz (fijos por el proyecto).
- **Quadrant** — dentro de un cuadrante: ves sus folders raíz + docs raíz del cuadrante.
- **Folder** — dentro de una folder cualquiera (a cualquier profundidad): ves subFolders + docs.

El documento abre el editor del proyecto.

## Modelo de datos

**Cuadrantes** (fijos, definidos en `services/quadrants.ts`):
```ts
type Quadrant = 'marketing' | 'ventas' | 'producto' | ...
```
Esto identifica las "carpetas raíz inmovibles" del Knowledge. Cada `knowledges.quadrant` matchea uno.

**Folders** (jerárquico, en BD `knowledge_folders`):
```sql
id uuid PK
name text
quadrant text          -- cuadrante al que pertenece (fijo dentro del subárbol)
parent_folder_id uuid  -- self-FK nullable. NULL = raíz del cuadrante.
position int4
archived_at timestamptz
```

**Docs** (en BD `knowledges`):
```sql
folder_id uuid  -- NULL = raíz del cuadrante; si != NULL, vive dentro de esa folder
subfolder text  -- deprecado, mantenido como fallback solo durante migración
```

## Contrato de datos del cerebro

```ts
interface BrainDoc {
  id: string
  title: string
  slug: string
  description: string | null
}

interface BrainFolder {
  id: string
  name: string
  parentId: string | null
  quadrantKey: string
  docs: BrainDoc[]
  subFolders: BrainFolder[]  // recursivo
}

interface BrainQuadrant {
  key: string
  label: string
  blurb: string
  color: string
  rootDocs: BrainDoc[]       // docs sin folder (raíz del cuadrante)
  rootFolders: BrainFolder[] // folders con parent_folder_id IS NULL
}

type View =
  | { level: 'overview' }
  | { level: 'quadrant'; q: string }
  | { level: 'folder'; folderId: string }
```

`buildBrainData(sops, folders)` construye el árbol recursivo desde los datos planos de BD.

## Componentes (en `assets/templates/brain/`)

- **`types.ts`** — el contrato + el tipo `View`.
- **`brain-data.ts`** — `buildBrainData()` (adaptador, NO editar — solo el data input), `CROSS_LINKS` (sinapsis cruzadas entre cuadrantes), `buildSearchIndex()`, `normalize()`, `totalCount()`, `folderTotalCount()`, `findFolderWithPath()` (útil para breadcrumb).
- **`Scene.tsx`** — el `<Canvas>` content:
  - `Node`: esfera (folder) u octaedro (doc), emisivo, bobbing, hover, doble-clic. Prop `coreName` para el nodo central. Etiqueta = `Label` (sprite canvas).
  - `Synapse`: curva bezier + partícula; buffer reutilizado.
  - `TrackpadControls`: wheel→rotar (inercia) / ctrl·meta→zoom.
  - `store`: `Record<id, Vector3>` que los nodos escriben y las sinapsis leen cada frame.
  - Grupo `zoom` que escala por nivel = efecto fly-in. Nodo seleccionado lerp al origen.
  - `OrbitControls` (enableZoom=false, autoRotate, damping) + `Bloom`.
- **`DriveView.tsx`** — vista Carpetas con drag&drop:
  - `<DndContext>` con PointerSensor (distance: 10) + TouchSensor (delay: 200, tolerance: 8).
  - `FolderCard` y `DocRow` con **drag handle separado** (icono grip ⋮⋮ con `setActivatorNodeRef`). Sin handle, el card entero sería draggable y los clicks de hijos se perderían — anti-patrón.
  - `ActionsMenu` **siempre visible** (no `opacity-0 group-hover`) con menú flotante position:fixed clamped al viewport. Listener global con capture phase + stopPropagation: click fuera cierra el menú sin disparar onClick del card padre.
  - Breadcrumb dinámico con cada segmento como `useDroppable` (drop ahí = mover al nivel del breadcrumb).
  - `QuadrantCard` es droppable (drop = mover al raíz del cuadrante, propaga el quadrant a descendientes vía `moveFolder`).
- **`PreviewCard.tsx`** — card flotante con título completo + descripción del doc al primer tap en 3D. Doble tap rápido (<330ms) sigue abriendo directo.
- **`TreePanel.tsx`** — árbol recursivo plegable + buscador, indentado por nivel.
- **`view-url.ts`** — encode/decode del state `View` en query params (`?view=q:cuadrante` o `?view=f:<uuid>`).
- **`KnowledgeBrain.tsx`** — orquestador: pestaña Cerebro 3D ↔ Carpetas, Índice, +Nuevo doc / +Nueva carpeta, Volver, hint, estado vacío. Acepta props `coreName` + handlers de folder ops.
- **`KnowledgeBrainClient.tsx`** (en raíz de templates) — wrapper `next/dynamic({ssr:false})` + URL state + handlers que llaman las server actions + lógica para volver al padre al borrar la carpeta actual.

## Patrón clave 1: el `store` de posiciones (3D)

Las posiciones vivas de los nodos viven en un objeto `Record<id, THREE.Vector3>`. Cada `Node` escribe su posición destino; cada `Synapse` lee las de sus extremos para dibujar la curva. Así las líneas siguen a los nodos sin acoplar componentes. Las sinapsis corren en `useFrame(cb, 1)` (prioridad mayor) para leer posiciones ya actualizadas.

## Patrón clave 2: drag handle separado (drag&drop)

**ANTI-patrón evitado:** aplicar `{...listeners}` de `useDraggable` al card entero. Hace que pointerdown en cualquier hijo (botón menú, link) sea procesado por dnd-kit. Mezcla drag con clicks normales.

**Patrón correcto:** usar `setActivatorNodeRef` para que **solo el icono grip ⋮⋮** sea draggable. El resto del card es libre para clicks/links/menús sin interferencia.

```tsx
const { listeners, attributes, setActivatorNodeRef, ... } = useDraggable(...)
<div className="card">
  <button ref={setActivatorNodeRef} {...listeners} {...attributes}>⋮⋮</button>
  {/* resto del card sin acople a dnd-kit */}
</div>
```

## Patrón clave 3: árbol jerárquico → propagar cuadrante

Cuando se mueve una folder a otro cuadrante (`moveFolder({ target_quadrant })`), el server action:
1. Update del folder root (cambia su `quadrant` + `parent_folder_id`).
2. BFS recursivo: recolecta TODO el subárbol de descendientes.
3. Update masivo: cambia `quadrant` de todas las carpetas del subárbol + de todos los docs cuyo `folder_id` esté en el subárbol.

Sin esto, mover una carpeta dejaría los descendientes con `quadrant` desincronizado del nuevo padre. Eso rompería la vista (los docs aparecerían en el cuadrante viejo).

El trigger SQL `knowledge_folders_check_cycle` previene el caso peligroso: mover una folder dentro de su propio descendiente. BFS comprueba ancestros del nuevo parent — si encuentra el id de la folder, raise exception.

## Interacción

- **Doble-clic/doble-tap en 3D** = entrar/abrir (detección por timestamp <330ms).
- **Tap único en 3D sobre un doc** = PreviewCard con título completo + descripción.
- **Drag handle (⋮⋮)** en vista Carpetas = arrastra para mover doc/folder.
- **Drop targets**: otra carpeta (anida dentro) · breadcrumb item (sube al nivel) · cuadrante card (mueve al raíz del cuadrante).
- **2 dedos trackpad** = rotar; pellizco/⌘+scroll = zoom; 1 dedo/arrastrar = rotar.
- **Botón "..."** = siempre visible. Renombrar / Eliminar. Click fuera cierra (sin bubble).
- **Crear carpeta** = botón "+ Nueva carpeta aquí" en cada nivel del breadcrumb.

## Integración

- `page.tsx` (server) lee Knowledge + folders → `buildBrainData()` → `<KnowledgeBrainClient data coreName />`.
- `onOpenDoc(slug)` → `router.push('/knowledge/'+slug+'?from=...')` (preserva ubicación para el botón Volver).
- Root del cerebro `h-full min-h-[80vh]` para encajar en el shell admin.
- Registrar el trabajo en el sistema de tareas del ecosistema.

## Server actions (en `assets/templates/actions/knowledge.ts`)

- `createSop` — crear documento.
- `updateSop` — guardar cambios.
- `deleteSop` — archivar doc (recuperable).
- `purgeSop` — borrar definitivo (solo desde Archivador).
- `restoreSop` — restaurar archivado.
- `getArchived` — lista de archivados.
- **`createFolder`** — crear folder (con `parent_folder_id` opcional → anidar).
- **`renameFolder`** — renombrar.
- **`moveFolder`** — mover (con propagación de quadrant + check anti-ciclo).
- **`deleteFolder`** — archivar folder + recursivamente todos sus descendientes.
- **`moveSop`** — mover doc a otra folder o quadrant.

Todas validan rol admin (`ensureAdmin()`) y llaman a `revalidatePath('/knowledge')`.

## Implementación de referencia

Esta skill fue extraída de un Knowledge real en producción. Cualquier proyecto que la aplique pasa su propio `coreName` desde su `page.tsx` y la skill funciona de cero. Los templates no contienen identidad del proyecto origen — todo es genérico (Tailwind nativo + defaults neutrales).
