---
name: visual-knowledge
scope: template
description: Convierte la pantalla de Knowledge de un Ecosistema de IA en un cerebro neuronal 3D navegable (WebGL con react-three-fiber + bloom) con jerarquía de carpetas estilo Google Drive — crear/renombrar/eliminar/mover carpetas y documentos por drag&drop, anidamiento N-nivel, vista 3D + vista Carpetas + búsqueda. Se enchufa al Knowledge que el proyecto ya tiene (cuadrantes → carpetas → documentos). Es rebrandable (colores por cuadrante, fuente, nombre del proyecto en la bola central). Usar cuando el dueño pide "haz mi Knowledge en 3D", "cerebro neuronal", "Knowledge tipo Google Drive" o "red neuronal navegable".
license: MIT
---

# Knowledge 3D — cerebro neuronal navegable con carpetas jerárquicas

## Purpose

> **UPGRADE, no creación.** El sistema del Knowledge (tablas, metodología) lo crea `new-ecoai`, y también monta el **shell del OS** con una sección Knowledge BÁSICA. Esta skill **reemplaza esa sección básica** (`src/app/(admin)/knowledge/page.tsx`) por el cerebro 3D + Google Drive, **dentro del shell que ya existe** (sidebar, secciones, botones). No crea el shell ni la metodología.

Añade un **cerebro neuronal 3D** sobre el Knowledge existente de un Ecosistema de IA, con **jerarquía multi-nivel de carpetas estilo Google Drive**: crea, renombra, mueve y elimina carpetas y documentos con drag&drop libre, anida tantas carpetas dentro de carpetas como quieras, navega por niveles con breadcrumb, ve los documentos en una vista Carpetas clásica o en el cerebro 3D con nodos luminosos y sinapsis vivas, previsualiza títulos largos antes de entrar, y abre el editor por documento.

Es una **capa visual + capa de carpetas genérica**: funciona sobre cualquier Knowledge mientras se le dé el contrato de datos (cuadrantes fijos + folders jerárquicos + docs). Es rebrandable (colores por cuadrante, fuente, nombre del proyecto en la bola central, glow).

## Prerequisites
El proyecto destino debe ser un **Ecosistema de IA** que ya tenga:
- Una tabla `knowledges` con columnas: `id, slug, title, description, content_md, quadrant, subfolder, position, active, created_at, updated_at, archived_at`.
- Tabla `profiles` con `role_id` y join a `roles.name='admin'` (para RLS policies). Si tu rol admin tiene otro nombre, ajusta el SQL.
- Stack **Next.js 16+ App Router + React 19 + TypeScript + Tailwind**.
- Su **sistema de tareas/Productividad** (para registrar el trabajo, regla del ecosistema).

Antes de codear, leer `references/gotchas.md` (errores que ralentizan o dejan en blanco) y `references/framework.md` (modelo de datos, contrato, arquitectura).

## How to Use

### Step 1: Registrar en Productividad
Crear el proyecto + tareas en el sistema de tareas del ecosistema ANTES de tocar código.

### Step 2: Instalar dependencias
```bash
npm i three @react-three/fiber @react-three/drei @react-three/postprocessing
npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```
(`@dnd-kit/*` es necesario para el drag&drop de la vista Carpetas.)

### Step 3: Aplicar las migraciones SQL
Aplica en orden en Supabase:
1. `assets/templates/migrations/0001_knowledge_hierarchical_folders.sql` — tabla `knowledge_folders` jerárquica + `folder_id` en `knowledges` + triggers anti-ciclo y updated_at + RLS + migración automática de `(quadrant, subfolder)` → folder + enlazado de docs.
2. `assets/templates/migrations/0002_knowledge_settings.sql` — tabla singleton `knowledge_settings` para que el admin configure desde la UI: nombre del proyecto, color del núcleo, override de cuadrantes (label/blurb/color).

### Step 4: Copiar componentes y services
Copia los templates a las rutas indicadas (los paths usan el alias `@/` que mapea a `src/`):

| Origen | Destino |
|---|---|
| `assets/templates/brain/*` | `src/features/knowledge/components/brain/` (incluye `SettingsPanel.tsx` y `FolderPicker.tsx`) |
| `assets/templates/KnowledgeBrainClient.tsx` | `src/features/knowledge/components/` |
| `assets/templates/KnowledgeEditorClient.tsx` | `src/features/knowledge/components/` |
| `assets/templates/ArchivePanel.tsx` | `src/features/knowledge/components/` |
| `assets/templates/services/quadrants.ts` | `src/features/knowledge/services/` |
| `assets/templates/services/sops.ts` | `src/features/knowledge/services/` |
| `assets/templates/actions/knowledge.ts` | `src/actions/` |
| `assets/templates/pages/layout.tsx` | `src/app/(admin)/knowledge/layout.tsx` |
| `assets/templates/pages/page.tsx` | `src/app/(admin)/knowledge/page.tsx` |
| `assets/templates/pages/[slug]/page.tsx` | `src/app/(admin)/knowledge/[slug]/page.tsx` |
| `assets/templates/pages/_visual-resource-example/page.tsx` | **No copiar directo**; sirve de patrón cuando añadas un recurso visual del dueño (ver sección "Regla: brandkit…" abajo). |

### Step 5: Definir cuadrantes default (fallback)
Edita `src/features/knowledge/services/quadrants.ts` para que tenga los `key`s de tus cuadrantes (los `key`s SON los valores válidos del campo `quadrant` en `knowledges` y `knowledge_folders`). Los `label`, `blurb` y `color` que pongas aquí son los **defaults iniciales** — el admin podrá modificarlos en vivo desde el panel **⚙ Configuración** de la propia pantalla del Knowledge (se guardan en `knowledge_settings`).

```ts
export const QUADRANTS: QuadrantMeta[] = [
  { key: 'marketing', label: 'Marketing', blurb: '...', color: '#TU_COLOR' },
  { key: 'ventas',    label: 'Ventas',    blurb: '...', color: '#TU_COLOR' },
  // etc — los `key` también pasan al campo `quadrant` de knowledges
]
```

### Step 6: Configurar el fallback de `coreName`
En `src/app/(admin)/knowledge/page.tsx` (lo copiaste en Step 4) cambia `'TuProyecto'` por el nombre real de tu proyecto — será el fallback que se muestre si el admin nunca abrió el panel Configuración. Una vez que el admin guarde un nombre en el panel ⚙, ese se usa como prioridad.

### Step 7: Aplicar tu brandkit
La plantilla viene con **Tailwind nativo out-of-the-box** y usa la paleta neutra:

- `text-neutral-100` → color de texto principal
- `text-amber-400` → color de acento (dorado por defecto)
- `bg-neutral-950` → fondo de la escena 3D
- Tarjetas/paneles: radius **14px**, fondo `#1E1E1E`, borde `rgba(244,244,250,0.22)`, hover acento, sombras con presencia.

Para aplicar tu marca:
1. **Acento de marca** → reemplaza `amber-400` en todos los archivos por tu acento (ej. `cyan-500`, `rose-500`, o un token custom si tu `tailwind.config.ts` los define).
2. **Texto principal** → si tu fondo es claro, reemplaza `neutral-100` por `neutral-900`.
3. **Fondo** → ajusta `neutral-950` y el `#1E1E1E` hardcodeado en tarjetas si necesitas otro tono.
4. **Color del núcleo** del cerebro 3D → desde la UI ⚙ Configuración (persiste en BD), o cambia el default en `Scene.tsx` (`#EBD9A8`).

El admin del proyecto puede también ajustar nombre del proyecto + colores por cuadrante en vivo desde el panel ⚙ (persiste en `knowledge_settings`).

### Step 8: Verificar (no declarar terminado sin esto)
- `npx tsc --noEmit` limpio en los archivos nuevos.
- La ruta `/knowledge` renderiza el cerebro con tus datos reales.
- **Crear carpeta** funciona (botón "+ Nueva carpeta aquí").
- **Drag&drop** funciona: agarra el icono grip (⋮⋮) de una carpeta o doc, arrástralo a otra carpeta o al breadcrumb. Funciona en desktop (click) y mobile (long-press 200ms).
- **Renombrar / Eliminar** funcionan desde el botón "..." (siempre visible).
- **Anidamiento N-nivel**: puedes meter una carpeta dentro de otra carpeta dentro de otra. Sin límite. El breadcrumb refleja la jerarquía.
- **FPS estable** y heap plano (si baja con los segundos → revisar `references/gotchas.md` punto 1).
- Navegación: doble-clic en 3D entra al doc, "..." abre menú, búsqueda funciona.
- Deploy + verificar prod.

### Step 9: Cerrar
Marcar las tareas en Productividad como completadas.

## Qué se parametriza
- **`coreName`** prop (string) → nombre del proyecto en la bola central y eyebrow.
- **Colores por cuadrante** en `quadrants.ts`.
- **Color del núcleo** en `Scene.tsx` (`#EBD9A8` por defecto).
- **Intensidad del bloom** en `Scene.tsx` (`Bloom intensity={1.15}`).
- **Cross-links entre cuadrantes** en `brain-data.ts` (`CROSS_LINKS`).
- **Labels y descripciones** de cuadrantes en `quadrants.ts`.

## Regla: brandkit u otros recursos visuales del proyecto

**Cuando el dueño del proyecto te diga "este es mi brandkit"** (te lo dará en HTML, PDF, imagen, Figma export, etc.), o pida añadir cualquier otro recurso visual al Knowledge (dashboards, mockups, viewers), sigue SIEMPRE este patrón — no lo metas como texto markdown plano:

1. **Coloca el asset** en `public/<slug>/...` (ej. `public/brandkit/identity.html` o `public/brandkit/logo.pdf`).
2. **Crea una página dedicada** en `src/app/(admin)/knowledge/<slug>/page.tsx` que renderice el contenido visualmente. Patrón base:
   ```tsx
   export default function BrandkitPage() {
     return (
       <div className="flex flex-col h-screen overflow-hidden">
         <header className="shrink-0 flex items-center justify-between gap-3 border-b ... px-4 py-3">
           <Link href={backHref}>← Volver al Knowledge</Link>
         </header>
         <div className="flex-1 min-h-0 bg-black">
           <iframe src="/<slug>/index.html" className="w-full h-full border-0" />
         </div>
       </div>
     )
   }
   ```
   Si es PDF, usa `<embed>` o `<object>` en lugar de iframe. Si es componente React, renderízalo directo.
3. **Inserta un SOP en BD** con `slug=<slug>`, `quadrant='marketing'` (si es brandkit) o el cuadrante adecuado, `folder_id=<carpeta-elegida-por-el-dueño>` (o NULL para raíz del cuadrante), `active=false` (no es texto útil para la IA, es vista visual).
4. **Mapea en `app/(admin)/knowledge/[slug]/page.tsx`** el `SPECIAL_RESOURCE_REDIRECTS`: `'<slug>': '/knowledge/<slug>'`. Eso hace que al clicar el SOP en el árbol abra la pantalla visual en vez del editor markdown.
5. **Propaga el `?from=`** en el redirect (el template ya lo hace) para que la flecha "Volver" del recurso visual lleve al usuario a la carpeta exacta donde estaba.

**Regla dura:** un brandkit (o equivalente) NUNCA se muestra como markdown plano dentro del Knowledge. Si el dueño no te da nada visualizable, no añadas nada — déjale la decisión a él.

## Features incluidas (de fábrica)
- **Cerebro 3D** con nodos luminosos (esfera = folder, octaedro = doc), sinapsis pulsantes, autorotate, trackpad rotate, pinch zoom, doble-click entra, hint al pie.
- **Vista Carpetas** con drag&drop libre (Google Drive style), breadcrumb por niveles, botón crear carpeta en cada nivel, drag handle (⋮⋮) explícito por item, menú "..." siempre visible con **Renombrar / Mover a… / Eliminar**.
- **Configuración editable desde la UI (⚙)** — el admin cambia desde la propia pantalla: nombre del proyecto en la bola central, color del núcleo, label/blurb/color de cada cuadrante. Sin tocar código. Persiste en BD (`knowledge_settings`).
- **"Mover a…"** — modal con árbol de cuadrantes + carpetas en cualquier doc o folder; mueve a otro cuadrante o folder sin tener que arrastrar. Auto-excluye descendientes propios (no permite ciclos).
- **Card flotante** al primer tap en un doc del 3D → muestra título completo + descripción antes de abrir (evita entrar al doc equivocado por nombre cortado).
- **Editor por documento** con selector jerárquico de carpeta (indentado por profundidad) + botón "+ Nueva" inline.
- **Archivador** para restaurar documentos borrados.
- **Búsqueda global** en el árbol (TreePanel).
- **URL state**: el view actual (`?view=q:cuadrante` o `?view=f:<uuid>`) se sincroniza al URL — la flecha "Volver" del editor restaura la ubicación exacta donde estabas.
- **Anti-ciclo en BD**: imposible mover una carpeta dentro de su descendiente (trigger).
- **Borrado recursivo**: archivar una carpeta archiva todos sus descendientes (recuperable individualmente).

## Examples
- "Quiero mi Knowledge como un cerebro 3D navegable con carpetas tipo Google Drive" → aplicar esta skill completa.
- "Hazme la red neuronal navegable con mis colores y mi nombre en el centro" → cambiar `quadrants.ts` + `coreName` + reemplazar `amber-400` por tu acento.

## Reference Files
- `references/gotchas.md` — los errores críticos de rendimiento/render. **Leer antes de codear.**
- `references/framework.md` — modelo de datos jerárquico, contrato, arquitectura, drag&drop.
- `assets/templates/brain/` — componentes del cerebro y vista Carpetas (drag&drop incluido).
- `assets/templates/KnowledgeBrainClient.tsx` — wrapper cliente (`ssr:false`) con todos los handlers de folder ops + URL state.
- `assets/templates/KnowledgeEditorClient.tsx` — editor con selector jerárquico.
- `assets/templates/services/` — adaptador y tipos.
- `assets/templates/actions/knowledge.ts` — server actions (create/rename/move/delete + moveSop).
- `assets/templates/migrations/` — SQL de la migración.
- `assets/templates/pages/` — pages template (Next.js App Router).
