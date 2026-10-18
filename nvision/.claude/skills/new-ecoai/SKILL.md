---
name: new-ecoai
scope: template
description: "Crear el BACKEND de un Ecosistema de IA (el OS): tablas Supabase (roles + profiles.role_id + knowledges con el contrato del Visual Knowledge: 4 cuadrantes de negocio + 2 areas Personal/Reglas), BUSINESS_LOGIC.md, AGENTS.md, ciberseguridad base. Pregunta UNA cosa: Solo OS u OS+APP. NO construye la pantalla visual del Knowledge (eso lo hace /visual-knowledge, el Visual Knowledge). Activar cuando el usuario escribe /new-ecoai o dice: crear ecosistema, empezar ecosistema de IA, inicializar el entorno, arrancar proyecto nuevo."
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Crear con NVISION®

Este skill crea el entorno base de un proyecto NVISION®. El dueño puede elegir entre dos caminos según lo que necesite construir.

## ⚡ MODELO ACTUAL (autoritativo · 2026-06-22) — leer ANTES que nada

Este skill crea **el BACKEND del OS + el SHELL VISUAL BASE del OS**. Este modelo manda por encima de cualquier sección antigua de más abajo:

- **2 opciones (NO 3):** (1) Solo mi OS · (2) Mi OS + mi APP. El OS se crea SIEMPRE. NO existe "app sin OS".
- **OS** = backend + centro de operaciones (con su shell visual). **APP** = la cara que usan los clientes. **Visual Knowledge** (skill `/visual-knowledge`) = el **UPGRADE 3D** del Knowledge (NO crea el sistema; sustituye la sección Knowledge básica por el cerebro 3D + Google Drive).
- **Crea (backend):** `roles` + `profiles.role_id` (primer user = admin) + `knowledges` (contrato del Visual Knowledge: `slug, title, description, content_md, quadrant, subfolder, position, active, archived_at`) + `BUSINESS_LOGIC.md` + `AGENTS.md` + security. RLS **solo admin**.
- **Crea (shell visual base del OS):** el **layout del OS** (`src/app/(admin)/layout.tsx`) con un **sidebar COLAPSABLE** a la izquierda (lista de secciones desde un registro, empezando por **Knowledge** como sección #1 / pantalla inicial), y **abajo-izquierda** un **botón "Ir a la APP"** (SOLO si se eligió OS+APP) **+ botón de Perfil debajo**. Todo con el **brandkit del proyecto**, **responsive/móvil impecable**. Es una base funcional: aunque NO se aplique `/visual-knowledge`, el OS ya se ve y se navega bien hecho. Ver sección **"FLUJO (3) — Shell visual base del OS"**.
- **El Knowledge aquí es la versión BÁSICA** (lista navegable de cuadrantes/carpetas). `/visual-knowledge` la sustituye luego por el cerebro 3D, dentro del MISMO shell.
- **Sin silencio:** construye con normalidad; el usuario ve cómo va quedando a medida que avanza el roadmap. No escondas el progreso ni fuerces previsualizaciones.
- **Botón "Ir a la APP" SOLO si OS+APP.** Si es Solo OS, NO lo construyas.
- **Branding del usuario siempre, NUNCA NVISION** en lo que construyas (ver reglas absolutas del AGENTS.md).
- **El build CONSERVA lo que ya viene hecho.** El Dashboard (métricas con KPIs + gráficos), el shell del OS, el Knowledge y el Perfil YA están montados de fábrica. En el prompt final de build NO los reconstruyas ni los reemplaces: consérvalos y solo aplícales la marca. Reconstruir el Dashboard desde cero (perdiendo los KPIs/gráficos que ya venían) es un ERROR.
- **UN SOLO branding para OS y APP.** Si hay APP, debe verse con el MISMO sistema de diseño que el OS (mismo tema oscuro, mismo token `brand`, mismas superficies/tarjetas y tipografía). PROHIBIDO inventar un estilo distinto para la APP (p.ej. APP neobrutalist mientras el OS es oscuro). Es UN producto, UN look.
- Knowledge canónico: `ia-modelo-os-app-ecosistema`.

---

## ANTES DE EMPEZAR — pregunta una sola cosa al dueño

Muestra exactamente este mensaje y espera respuesta antes de tocar nada:

```
Hola. Vamos a montar tu Ecosistema de IA con la metodología NVISION®. Antes de empezar, una sola cosa:

¿Qué vas a montar?

  (1) Solo mi OS
      Tu centro de operaciones para gestionar tu negocio por
      dentro: tu Knowledge (4 cuadrantes de negocio — Marketing,
      Ventas, Producto, Finanzas — + 2 áreas: Personal y Reglas),
      dashboards, métricas, automatizaciones y tu equipo con roles.

  (2) Mi OS + mi APP
      Lo anterior y, además, la APP: lo que entregas a tus
      clientes (un tracker de finanzas, de hábitos, tu SaaS, lo
      que crees). Misma base de datos: tu OS mide lo que pasa en
      tu APP.

Importante: elijas lo que elijas, en cualquier momento puedes
pedirme que añada lo otro. Si hoy montas solo tu OS y mañana
quieres una APP para tus clientes, dímelo y te la creo. Y al revés.

Responde 1 o 2.
```

Espera la respuesta. Luego ejecuta el flujo correspondiente:

- **Respuesta 1 (Solo OS)** → crea el BACKEND del OS (secciones 1, 4, 5: Migration con `roles` + `profiles.role_id` + `knowledges` + `AGENTS.md` + security headers + seeds [sección 3] + `BUSINESS_LOGIC.md`) **+ el shell visual base del OS** (ver "FLUJO (3) — Shell visual base del OS") con el Knowledge BÁSICO como sección #1. **SIN** botón "Ir a la APP" (eso es solo OS+APP). El cerebro 3D del Knowledge lo monta `/visual-knowledge` después. NO crea la zona `(app)/` de clientes.
- **Respuesta 2 (OS + APP)** → todo lo de (1) + manda UN solo mensaje con las preguntas fáciles de la APP (cómo se llama · qué hace en una frase · para quién · las 3-5 cosas que el usuario podrá hacer · qué datos maneja · cómo entran los usuarios · si cobra) → escribe la spec de la APP en `BUSINESS_LOGIC.md` + crea la base de la zona `(app)/` (la cara de tus clientes) + `(auth)/`. **El producto NO se construye aquí** (se construye en el paso de build del roadmap, leyendo el Knowledge + BUSINESS_LOGIC).

**Si el dueño responde algo distinto a 1/2**, vuelve a mostrar el mensaje. No avances sin una respuesta válida.

> ⚠️ El **UPGRADE 3D** del Knowledge (cerebro neuronal) lo hace SIEMPRE `/visual-knowledge`, NUNCA new-ecoai. new-ecoai crea el backend **+ el shell visual base** con el Knowledge BÁSICO (sección #1); `/visual-knowledge` sustituye esa sección por el 3D. El contrato real es `knowledges` con `quadrant`/`content_md`.

---

## Pre-requisitos

1. Proyecto recién clonado con el comando `nvision` desde una carpeta vacía.
2. `npm install` ya ejecutado (o lo ejecutas tú si falta).
3. Acceso a Supabase MCP (debe estar configurado en `.mcp.json`).

---

## Concepto que estás construyendo (lectura interna)

Antes de tocar nada, lee el contenido de la sección **"MANUAL DEL ECOSISTEMA DE IA — TEXTO LITERAL"** al final de este SKILL.md. Ese texto es el manual completo del concepto. Lo usarás como contenido para el knowledge fijo en el cuadrante Producto. **No es opcional leerlo** — toda decisión técnica del entorno base sigue ese manual.

---

## FLUJO (3) — Shell visual base del OS (YA VIENE en el template · solo lo ajustas)

> ⚡ **El shell del OS YA viene de fábrica con `nvision`.** NO lo construyas de cero, NO montes otro, NO crees un "Panel OS" suelto aparte. Estos archivos **ya existen en el proyecto**:
> - `src/app/(admin)/layout.tsx` → el shell: gate auth+admin + sidebar + `<main>` donde se renderiza cada sección.
> - `src/features/os-shell/OsSidebar.tsx` → sidebar **COLAPSABLE** (drawer en móvil) con **2 secciones: Dashboard + Knowledge** + (abajo) botón "Ir a la APP" (si OS+APP) + botón Perfil.
> - `src/app/(admin)/page.tsx` → redirige a `/dashboard` (pantalla **Home** del OS).
> - `src/app/(admin)/dashboard/page.tsx` + `src/features/dashboard/DashboardClient.tsx` → **Dashboard** (Home): 9 KPIs (facturación, clientes, ticket medio, frecuencia, margen, beneficio, retención, churn, LTV) + gráficos con datos de ejemplo + filtro de fechas. **Siempre presente** (Solo OS y OS+APP).
> - `src/app/(admin)/knowledge/page.tsx` → Knowledge BÁSICO. `/visual-knowledge` lo reemplaza por el 3D, **dentro de este mismo shell** (encajado en `<main>`).
> - `src/app/(admin)/perfil/page.tsx` + `src/features/perfil/PerfilClient.tsx` → Perfil (cuenta + notificaciones).
> - `src/app/(app)/app/page.tsx` + `src/app/(app)/layout.tsx` → la APP (en `/app`) con botón "Volver al OS" (solo admin).

**Lo ÚNICO que hace new-ecoai con el shell:**
1. Si la opción es **OS + APP** → pon `const HAS_APP = true` en `src/app/(admin)/layout.tsx` (aparece el botón "Ir a la APP"). Si es **Solo OS**, déjalo en `false` (sin botón APP; tampoco hace falta la zona `(app)/`).
2. **Aplica la marca del proyecto al token `brand`:** pon el color de acento del usuario en `--brand` de `src/app/globals.css` (formato `"R G B"`, p.ej. `45 212 191`) + su tipografía. Con esto, **OS + Dashboard + Knowledge + login + perfil salen branded automáticamente** (todos usan la clase `brand`). NUNCA un color de NVISION.
3. Reemplaza el `title`/`description` de `src/app/layout.tsx` por el **nombre/marca del proyecto** (white-label).
4. (Opcional) Pasa el nombre del proyecto al Dashboard: `<DashboardClient brandName="Mi Marca" />`.

**El Knowledge ES la pantalla del OS, dentro del shell. NO lo saques a una pantalla suelta ni dupliques el shell.**

### Código de referencia (YA está en el proyecto · NO lo recrees · solo míralo para rebrandear)

`src/features/os-shell/sections.ts` (registro; los plugins lo amplían):
```ts
export type OsSection = { id: string; label: string; href: string }
// Knowledge SIEMPRE primero. Los plugins añaden aquí sus secciones.
export const osSections: OsSection[] = [
  { id: 'knowledge', label: 'Knowledge', href: '/knowledge' },
]
```

`src/app/(admin)/layout.tsx` (el shell; envuelve las secciones del OS):
```tsx
import { OsSidebar } from '@/features/os-shell/OsSidebar'
import { createClient } from '@/lib/supabase/server'

// HAS_APP: new-ecoai pone true (opción OS+APP) o false (opción Solo OS).
const HAS_APP = false // ← AJUSTAR según la opción elegida

export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return (
    <div className="flex min-h-screen">
      <OsSidebar hasApp={HAS_APP} userEmail={user?.email ?? ''} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  )
}
```

`src/features/os-shell/OsSidebar.tsx` (colapsable + botones abajo):
```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { osSections } from './sections'

export function OsSidebar({ hasApp, userEmail }: { hasApp: boolean; userEmail: string }) {
  const [open, setOpen] = useState(true)
  const pathname = usePathname()
  return (
    <aside className={`${open ? 'w-60' : 'w-16'} sticky top-0 flex h-screen shrink-0 flex-col border-r transition-[width] duration-200`}>
      <div className="flex items-center justify-between p-3">
        {open && <span className="font-display text-sm">{/* nombre del proyecto (brandkit) */}</span>}
        <button onClick={() => setOpen(o => !o)} aria-label={open ? 'Colapsar' : 'Expandir'} className="rounded-lg p-2 hover:bg-white/5">
          {open ? '«' : '»'}
        </button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2">
        {osSections.map(s => {
          const active = pathname.startsWith(s.href)
          return (
            <Link key={s.id} href={s.href} title={s.label}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}>
              <span className="shrink-0">◇</span>
              {open && <span className="truncate">{s.label}</span>}
            </Link>
          )
        })}
      </nav>
      <div className="space-y-1 border-t p-2">
        {hasApp && (
          <Link href="/app" title="Ir a la APP" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
            <span>▶</span>{open && <span>Ir a la APP</span>}
          </Link>
        )}
        <Link href="/perfil" title="Perfil" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-white/5">
          <span>☉</span>{open && <span className="truncate">{userEmail || 'Perfil'}</span>}
        </Link>
      </div>
    </aside>
  )
}
```

`src/app/(admin)/page.tsx` → redirige a la sección inicial:
```tsx
import { redirect } from 'next/navigation'
export default function OsIndex() { redirect('/knowledge') }
```

`src/app/(admin)/knowledge/page.tsx` → Knowledge BÁSICO: lee la tabla `knowledges` y lista cuadrantes/carpetas (navegable). `/visual-knowledge` reemplaza esta página por el cerebro 3D.

### Reglas del shell (no negociables)
- **Colapsable de verdad** (botón abre/cierra); en **móvil = drawer con overlay**, nunca fijo ocupando media pantalla.
- **Botón "Ir a la APP" SOLO si OS+APP** (`hasApp`). En Solo OS, NO lo pongas.
- **Perfil SIEMPRE**, debajo del botón APP.
- **Brandkit del proyecto** en colores/tipografía (de la identidad guardada en Knowledge), NUNCA grises random ni "construido con NVISION".
- **Responsive/móvil impecable** (safe-areas, touch targets ≥44px).
- Constrúyelo como parte del flujo normal del roadmap (sin esconderlo ni forzar previsualizaciones).

---

## FLUJO (1) — Solo mi OS

> Esta sección describe qué construir si la persona respondió **1 (Solo mi OS)**.
> Para la opción **2 (OS + APP)**: ejecuta este flujo + los ajustes de "FLUJO (2) — OS + APP" más abajo.
> Recuerda: aquí se crea el BACKEND **+ el shell visual base del OS** (FLUJO 3) con el Knowledge básico. El UPGRADE 3D lo monta `/visual-knowledge` en el paso siguiente.

### Archivos a Crear

#### 1. `BUSINESS_LOGIC.md` (raíz del proyecto)

Ficha técnica del proyecto. Ligera. Se auto-actualiza con cada plugin enchufado.

```markdown
# BUSINESS_LOGIC.md — Ecosistema

> Ficha técnica del proyecto. Se actualiza automáticamente cuando se enchufa un plugin o se modifica una decisión técnica.
> El concepto completo del Ecosistema de IA vive como knowledge "Sobre el Ecosistema de IA" en el cuadrante Producto.

---

## 0. Qué es este proyecto

Ecosistema de IA construido con la plantilla NVISION®. El concepto completo está documentado en el knowledge **"Sobre el Ecosistema de IA"** dentro del cuadrante Producto.

---

## 1. Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Backend | Supabase (Auth + Database + RLS + Storage) |
| Validación | Zod |
| Estado | Zustand (cuando aplique) |
| Deploy | Vercel |
| AI (cuando se enchufe) | Vercel AI SDK v5 + OpenRouter |

Arquitectura: **Feature-First** (cada plugin tiene carpeta autocontenida en `src/features/`).

---

## 2. Estructura de rutas

- **OS** (zona del dueño/equipo, rol admin): el Visual Knowledge + dashboards/métricas.
- **APP** (`(app)/`, clientes): el producto que usan tus clientes finales.
- **Rutas públicas** (sin auth): a nivel raíz, fuera de los route groups protegidos.
- Tras login, el routing por rol decide a cuál va cada quien (admin → OS, user → APP).

**Regla anclada:** cuando el dueño solicite crear cualquier sección con cara pública (funnels, lead magnets, presentaciones, recursos, landings), la IA **pregunta** si esa sección estará abierta o requerirá auth/rol específico. La respuesta determina dónde se crea la carpeta.

---

## 3. Auth

- Supabase Auth (Email/Password + Google OAuth opcional).
- Tabla `profiles` con datos del dueño.
- 2FA opcional con TOTP.
- HaveIBeenPwned al signup (rechaza passwords filtrados).

---

## 4. Knowledge

- **4 cuadrantes de negocio** (Marketing, Ventas, Producto, Finanzas) + **2 áreas** (Personal, Reglas).
- Tablas `knowledges` + `knowledge_folders` + `knowledge_settings` (contrato del Visual Knowledge). RLS: solo admin.
- Cada doc: `slug`, `title`, `description`, `content_md`, `quadrant`, `folder_id`, `active`.
- La cara visual es el **Visual Knowledge** (cerebro 3D), que monta `/visual-knowledge`.
- Archivos espejo en `.claude/knowledges/[quadrant]/` (sincronizados desde BD).
- **TODAS las IAs leen TODOS los knowledges:** Claude Code vía archivos espejo, IA in-app vía BD directa.

---

## 5. Arquitectura de Datos

### Tablas base
- `profiles`: nombre, foto, correo del dueño.
- `knowledges`: cuadrante, título, formato (md/html), contenido.

### Tablas añadidas por plugins
*(Vacío al crear. Cada plugin añade aquí sus tablas.)*

---

## 6. Plugins instalados

*(Vacío al crear. Auto-actualizado por skills enchufables: `/add-login`, `/add-emails`, `/email-token-based`, `/add-mobile`, `/ai`, plugins propios.)*

Formato de cada entrada:

### Nombre del plugin
- Activado: [fecha]
- Cuadrante principal: [Marketing/Ventas/Producto/Finanzas]
- Carpeta: `src/features/[plugin]`
- Tablas Supabase: [si aplica]
- Knowledges asociados: [listado]
- Integraciones externas: [si aplica]
- Variables de entorno: [si aplica]
- Qué hace: [una frase]

---

## 7. Decisiones técnicas registradas

*(Vacío al crear. Cada decisión técnica relevante se documenta aquí.)*

---

## 8. Ciberseguridad base

- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) en `next.config.ts`.
- HaveIBeenPwned check al signup.
- RLS dura en TODAS las tablas (no negociable).
- Sanitización con Zod en formularios y APIs.
- 2FA opcional con TOTP para admin.
- `.gitignore` excluye `.env.local` y `.mcp.json`.
- Secretos: ningún agente lee el contenido de `.env*` — solo copia opaca. Los valores los pega el dueño (ver REGLA ABSOLUTA en AGENTS.md).

Capas adicionales (rate limiting, captcha, audit log, CSP granular) → disponibles vía skill `/add-security` (opcional).
```

---

### 2. Migration SQL

Archivo: `supabase/migrations/[timestamp]_init_ecosistema.sql`

Aplicar vía Supabase MCP con `apply_migration`:

```sql
-- ============================================================
-- INIT ECOSISTEMA DE IA
-- Tablas base: roles + profiles + knowledges
-- (mismo contrato que lee el Visual Knowledge: tabla UNICA del proyecto, RLS por rol admin)
-- ============================================================

-- ROLES: jerarquia de acceso del ecosistema (el dueno es admin; su equipo, user)
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
INSERT INTO public.roles (name) VALUES ('admin'), ('user') ON CONFLICT (name) DO NOTHING;

-- PROFILES: datos del dueno del ecosistema (+ role_id para el control por rol)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text NOT NULL,
  full_name text,
  avatar_url text,
  role_id uuid REFERENCES public.roles(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Nombres unificados con add-login (dueño del esquema) + drop-if-exists = idempotente
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Trigger: crear profile automáticamente al signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_role_id uuid;
  v_admin_exists boolean;
BEGIN
  -- El PRIMER usuario del ecosistema es admin (el dueno); el resto, user (equipo o clientes).
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id WHERE r.name = 'admin'
  ) INTO v_admin_exists;

  SELECT id INTO v_role_id FROM public.roles
    WHERE name = CASE WHEN v_admin_exists THEN 'user' ELSE 'admin' END;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, role_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    v_role_id
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- KNOWLEDGES: el cerebro del negocio. Tabla UNICA del proyecto (no por-usuario).
-- Mismo contrato EXACTO que lee el Visual Knowledge (cerebro 3D):
--   id, slug, title, description, content_md, quadrant, subfolder, position, active, archived_at, timestamps.
--   (la skill Visual Knowledge anade folder_id + knowledge_folders + knowledge_settings al activarse.)
-- 4 cuadrantes de negocio (marketing|ventas|producto|finanzas) + 2 areas (personal|reglas).
CREATE TABLE IF NOT EXISTS public.knowledges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  content_md text NOT NULL DEFAULT '',
  quadrant text NOT NULL,  -- 'marketing'|'ventas'|'producto'|'finanzas'|'personal'|'reglas'
  subfolder text,
  position integer DEFAULT 0,
  active boolean DEFAULT true,
  archived_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledges_quadrant ON public.knowledges(quadrant);

ALTER TABLE public.knowledges ENABLE ROW LEVEL SECURITY;

-- RLS: SOLO admin (dueno/equipo) accede al Knowledge. Los clientes NUNCA lo ven.
DROP POLICY IF EXISTS "admin_all_knowledges" ON public.knowledges;
CREATE POLICY "admin_all_knowledges" ON public.knowledges FOR ALL TO public
USING (
  EXISTS (SELECT 1 FROM public.profiles p JOIN public.roles r ON p.role_id = r.id
          WHERE p.id = auth.uid() AND r.name = 'admin')
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledges_updated_at
  BEFORE UPDATE ON public.knowledges
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── Hardening de seguridad ──────────────────────────────────────────
-- El setting "Enable automatic RLS" de Supabase crea la funcion event-trigger
-- public.rls_auto_enable() con EXECUTE abierto a PUBLIC/anon/authenticated, y el
-- auditor de seguridad lo marca. El event trigger se dispara solo (no se llama a
-- mano), asi que ese grant sobra. Revocamos EXECUTE si la funcion existe
-- (idempotente). NO la pases a SECURITY INVOKER: rompe el ALTER TABLE que hace.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'rls_auto_enable'
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
```

---

### 3. Knowledges seed iniciales

Después de la migración, inserta los 3 knowledges seed vía `apply_migration` (corre como service role, sin choque con la RLS admin). Cada seed lleva: `slug` (único, kebab-case), `title`, `description`, `content_md`, `quadrant`. **NO lleva `owner_id`** — el Knowledge es único del proyecto, no por-usuario. En paralelo guarda el espejo en `.claude/knowledges/[quadrant]/[slug].md`.

**3.1 — Knowledge "Sobre el Ecosistema de IA"** (`slug: sobre-el-ecosistema-de-ia`, `quadrant: producto`, en `content_md`):

El contenido es el texto literal completo de la sección **"MANUAL DEL ECOSISTEMA DE IA — TEXTO LITERAL"** al final de este SKILL.md.

**3.2 — Knowledge "Manual del Proyecto"** (`slug: manual-del-proyecto`, `quadrant: producto`, en `content_md`, placeholder):

```markdown
# Manual del Proyecto

> Documento que la persona dueña del ecosistema rellena con la visión, objetivos, avatar, oferta y estrategia de su negocio.
> Sirve como contexto operativo. Las IAs del ecosistema lo leen cuando responden cualquier consulta del cuadrante Producto.

## 1. Qué hace este negocio
(Rellenar)

## 2. Para quién es
(Rellenar)

## 3. Oferta y propuesta de valor
(Rellenar)

## 4. Objetivos
(Rellenar)
```

**3.3 — Knowledge "Brandkit"** (`slug: brandkit`, `quadrant: marketing`, HTML guardado en `content_md`, placeholder):

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>Brandkit</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 32px; background: #fafafa; color: #111; }
  h1 { font-size: 28px; margin-bottom: 24px; }
  .swatch { display: inline-block; width: 60px; height: 60px; border-radius: 8px; margin-right: 12px; vertical-align: middle; }
  .row { margin-bottom: 16px; }
  .label { display: inline-block; vertical-align: middle; font-weight: 600; }
</style>
</head>
<body>
  <h1>Brandkit</h1>
  <p>Identidad visual de la marca. El dueño define colores, tipografía, logos y estilo.</p>
  <h2>Colores</h2>
  <div class="row"><span class="swatch" style="background:#000000"></span><span class="label">Primario</span></div>
  <div class="row"><span class="swatch" style="background:#ffffff;border:1px solid #ccc"></span><span class="label">Secundario</span></div>
  <h2>Tipografía</h2>
  <p>Por definir</p>
  <h2>Logo</h2>
  <p>Por subir</p>
</body>
</html>
```

---

### 4. `AGENTS.md` (raíz del proyecto) — reglas duras

EXTIENDE el AGENTS.md heredado (NO lo sobrescribas): conserva las reglas base + la seccion **MEMORIA & KNOWLEDGE**, y añade debajo el siguiente bloque de reglas especificas del proyecto:

```markdown
# AGENTS.md — Reglas duras del Ecosistema de IA

> Este archivo se carga automáticamente al inicio de cada sesión de Claude Code.
> Las reglas aquí son **innegociables**.

---

## REGLAS NO NEGOCIABLES

### 1. Diseño como app nativa
Toda UI se construye para sentirse como una app instalada del teléfono: bottom tabs cuando aplique, headers grandes, bottom sheets para modales, transiciones suaves, touch targets ≥44px, respeto a `safe-area-inset`. En desktop, la calidad visual y UX debe ser de producto serio.

### 2. Mobile-first, desktop impecable
Cada cambio de UI se diseña primero pensando en móvil 375px. Después se adapta a desktop sin romper la sensación móvil.

### 3. RLS en TODAS las tablas
Sin excepción. Cada tabla con datos del dueño tiene Row Level Security activado.

### 4. No borrar sin permiso explícito
Prohibido ejecutar `rm`, `mv` sobrescritura, `git clean`, etc. sobre archivos del usuario sin autorización específica en la conversación actual.

### 5. No basura en la raíz
Artefactos temporales (screenshots, logs, dumps) van a `.test-artifacts/` (oculta, gitignored). Nunca en la raíz.

### 6. Single source of truth
`BUSINESS_LOGIC.md` siempre refleja el estado real del proyecto. Si algo se construye sin documentarse aquí, no existe oficialmente.

### 7. Auto-actualización del BUSINESS_LOGIC.md
Cuando se ejecuta cualquier skill que añade capacidad nueva (`/add-login`, `/add-emails`, `/email-token-based`, `/add-mobile`, `/ai`, plugins propios), el skill debe escribir una entrada en la sección 6 ("Plugins instalados") de `BUSINESS_LOGIC.md` al final de su ejecución.

### 8. Rutas públicas vs protegidas
Cuando el dueño solicite crear cualquier sección con cara pública (funnel, lead magnet, presentación, recurso, landing), la IA **pregunta** si esa sección estará abierta o requerirá auth antes de elegir dónde crearla.

### 9. Knowledge leído por todas las IAs
Cualquier IA del ecosistema (Claude Code, IA in-app, futuras IAs) lee todos los knowledges relevantes antes de responder. Knowledge vive en Supabase (tabla `knowledges`) + archivos espejo en `.claude/knowledges/`.

### 10. Datos del dueño
Supabase del dueño. Vercel del dueño. Dominio del dueño. Nada vive en infraestructura de terceros que pueda cortarse.

### 11. Lenguaje natural primero
El dueño no escribe código. Describe qué quiere y la IA lo construye.

---

## FILOSOFÍA

El concepto completo del Ecosistema de IA vive como knowledge **"Sobre el Ecosistema de IA"** en el cuadrante Producto. Lectura obligatoria antes de cualquier decisión de arquitectura.

---

## STACK GOLDEN PATH

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS 3.4
- Supabase (Auth + Database + RLS + Storage)
- Zod, Zustand
- Vercel deploy
- MCPs: Supabase, Next.js DevTools, Playwright

No hay decisiones técnicas que tomar — el stack está fijo. Si surge necesidad de cambiar, se discute con el dueño.
```

---

### 5. `next.config.ts` — security headers

Sobrescribe `next.config.ts` con:

```typescript
import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
```

---

### 6-12. (Capa visual) — la construye el Visual Knowledge, NO new-ecoai

`new-ecoai` **no crea ninguna pantalla**. El cerebro 3D del Knowledge lo monta `/visual-knowledge` (Visual Knowledge) en el paso siguiente del roadmap; el resto del producto, el paso de build. new-ecoai solo deja el **BACKEND** listo (migración + seeds + `BUSINESS_LOGIC.md` + `AGENTS.md` + `next.config.ts`).

---

### Flujo de Ejecución — (1) Solo mi OS

1. Verifica que el proyecto está recién clonado y `npm install` está hecho.
2. **Aplica la migración SQL** vía Supabase MCP (`apply_migration`) con el SQL de la sección 2 (roles + profiles.role_id + knowledges con el contrato del Visual Knowledge).
3. **Inserta los 3 knowledges seed** (sección 3). El knowledge "Sobre el Ecosistema de IA" lleva el contenido literal del MANUAL más abajo.
4. **Sobrescribe `BUSINESS_LOGIC.md`** en raíz con el contenido de la sección 1.
5. **Extiende `AGENTS.md`** en raíz: conserva las reglas base + la sección MEMORIA & KNOWLEDGE, y añade el contenido de la sección 4. NUNCA borres la sección MEMORIA & KNOWLEDGE.
5b. **Crea el Knowledge espejo de `BUSINESS_LOGIC.md`** en el cuadrante Producto (tabla `knowledges`) y ancla la regla: editar uno = actualizar el otro en el mismo turno.
6. **Verifica** que `next.config.ts` ya trae los security headers (vienen en la plantilla); si faltan, añádelos (sección 5).
7. **NO crees ninguna pantalla.** El backend queda listo. La cara visual del Knowledge la monta `/visual-knowledge` en el paso siguiente del roadmap.
8. Muestra el mensaje final al usuario.

---

### Mensaje Final — (1) Solo mi OS

```
El BACKEND de tu OS está listo.

Lo que tienes ahora:
- BUSINESS_LOGIC.md inicial en raíz (ficha técnica del proyecto)
- AGENTS.md con reglas duras
- Tablas Supabase: roles + profiles (tú eres admin) + knowledges
  (contrato del Visual Knowledge), todo con RLS
- 3 knowledges seed: "Sobre el Ecosistema de IA" (Producto),
  "Manual del Proyecto" (Producto), "Brandkit" (Marketing)
- 4 cuadrantes de negocio + 2 áreas (Personal, Reglas)
- Security headers configurados en next.config.ts

Ya puedes ver tu OS montado con tu marca (el menú a la izquierda y
tu Knowledge). En el siguiente paso del roadmap, /visual-knowledge
convierte ese Knowledge en tu cerebro 3D navegable.

Recordatorio importante:
Hoy elegiste solo tu OS. Si en cualquier momento quieres añadir
tu APP (lo que usan tus clientes: un tracker, tu SaaS, lo que
sea), dímelo y te la creo conectada a este mismo proyecto. No te
bloqueas con esta decisión.
```

---

## FLUJO (2) — OS + APP

> Esta sección describe qué construir si la persona respondió **2 (OS + APP)**.
> Es la combinación: ejecutas el flujo (1) completo (el BACKEND del OS) y ADEMÁS creas la base de la **APP** (la cara que usan tus clientes) en `src/app/(app)/`. Misma base de datos, mismo proyecto, mismo deploy: el OS mide lo que pasa en la APP.

### Pregunta extra (antes de construir nada)

Muestra exactamente este mensaje y espera respuesta:

```
Vale, vamos a montar tu OS + tu APP, todo en el mismo proyecto.
Cuéntame de tu APP (responde todo junto, con una idea basta):

  - ¿Cómo se llama tu APP? (ej: "FinTrack")
  - ¿Qué hace, en una frase? (ej: "lleva las finanzas personales")
  - ¿Para quién es? (ej: "mis clientes de mentoría")
  - Las 3-5 cosas que el usuario podrá hacer (ej: registrar
    gastos, ver gráficas, recibir alertas)
  - ¿Qué datos maneja? (ej: transacciones, categorías, presupuestos)
  - ¿Cómo entran los usuarios? (abierto / por invitación / de pago)
  - ¿Cobras? (gratis / suscripción / pago único)

Con tu descripción, dejo listo:
  - El backend de tu OS (Knowledge en 4 cuadrantes + 2 áreas, roles).
    La cara visual la enciendes con /visual-knowledge.
  - La base de tu APP (la zona donde tus clientes la usarán; se
    construye en el paso de build del roadmap).
```

Guarda la respuesta como `<DESCRIPCIÓN_SAAS>`.

### Archivos a Crear — (2) OS + APP

Ejecuta TODO el flujo **(1) Solo mi OS** (Migration con `roles` + `profiles.role_id` + `knowledges` + 3 seeds + `AGENTS.md` + `BUSINESS_LOGIC.md` + `next.config.ts`). El backend del OS queda listo (la cara visual del Knowledge la monta `/visual-knowledge` después).

**ADEMÁS** añade la base de la **APP** (la cara que usan tus clientes):

#### C.1 `BUSINESS_LOGIC.md` — sección de la APP

Después de la sección 0 (Qué es este proyecto), inserta esta sección **0.5** con la spec que dio el dueño en el intake:

```markdown
## 0.5 La APP (lo que usan tus clientes)

[Pegar literal la descripción de la APP del dueño: nombre, qué hace, para quién, las 3-5 cosas que el usuario podrá hacer, datos que maneja, cómo entran, si cobra]

Arquitectura DUAL en el mismo proyecto y la misma base de datos:
- **OS** (zona del dueño/equipo) — donde operas tu negocio (Visual Knowledge, dashboards, métricas).
- **APP** (`src/app/(app)/*`) — la cara que usan tus clientes finales. Es el producto descrito arriba.

El OS mide lo que pasa en la APP (misma BD). Cuando se ejecute `/add-login`, el routing por rol manda al dueño/equipo (admin) al OS y a los clientes (user) a la APP.
```

#### C.2 Base de la APP — `src/app/(app)/`

Crea SOLO la base de la APP (el producto se construye de verdad en el paso de build del roadmap):
- `src/app/(app)/layout.tsx` — layout de cara al cliente (sin nada del OS).
- `src/app/(app)/page.tsx` — placeholder con el nombre + descripción de la APP, listo para que el build lo convierta en el producto.

> El producto NO se construye aquí. La pantalla del OS (Visual Knowledge) la monta `/visual-knowledge`; la APP la construye el paso de build leyendo el Knowledge + `BUSINESS_LOGIC.md`.

### Flujo de Ejecución — (2) OS + APP

1. Verifica proyecto recién clonado y `npm install`.
2. Haz el intake de la APP (las preguntas de "Pregunta extra" de arriba, en UN mensaje).
3. Ejecuta TODO el flujo **(1) Solo mi OS** (backend: roles + profiles + knowledges + seeds + AGENTS.md + BUSINESS_LOGIC.md + next.config.ts).
4. Añade C.1 (sección 0.5 de la APP en BUSINESS_LOGIC) + C.2 (base de `(app)/`).
5. Muestra el mensaje final.

### Mensaje Final — (2) OS + APP

```
El BACKEND de tu OS + la base de tu APP están listos.

Lo que tienes ahora:

TU OS (solo tú y tu equipo):
- Tablas roles + profiles (tú eres admin) + knowledges (contrato
  del Visual Knowledge), todo con RLS
- 4 cuadrantes de negocio + 2 áreas (Personal, Reglas)
- 3 knowledges seed

TU APP (lo que usarán tus clientes):
- Base en src/app/(app)/ con el nombre y la descripción de tu APP
- Lista para construirse en el paso de build

COMÚN:
- BUSINESS_LOGIC.md con la arquitectura OS + APP documentada
- AGENTS.md con reglas duras
- Security headers en next.config.ts

Ya puedes ver tu OS montado con tu marca (Dashboard + Knowledge).
/visual-knowledge convierte el Knowledge en tu cerebro 3D navegable.
Tu producto (la APP) lo terminas de montar en el paso de build.

Sigue el roadmap NVISION® para los siguientes pasos.
```

---

## MANUAL DEL ECOSISTEMA DE IA — TEXTO LITERAL

> Este texto se inserta como contenido del knowledge "Sobre el Ecosistema de IA" en el cuadrante Producto. Es el manual completo del concepto que toda IA del ecosistema lee como referencia.

```markdown
# Sobre el Ecosistema de IA

## 1. Qué es

Un **Ecosistema de IA** es un entorno de software modular preconstruido al que el dueño le enchufa capacidades (plugins) hasta convertirlo en la operación completa de su negocio digital.

El objetivo es centralizar todas las herramientas del negocio digital en un solo lugar. En lugar de tener varios SaaS distintos que no se hablan entre sí, el dueño opera su negocio desde un único entorno que él mismo construye con la ayuda de una IA, y que es 100% suyo (su código, su base de datos, su dominio, su infraestructura).

La promesa es autosuficiencia: el dueño deja de depender de agencias, freelancers o licencias mensuales acumuladas. Construye, modifica y expande su ecosistema con lenguaje natural, sin tocar código.

## 2. Para quién es

Personas que operan un negocio digital o prestan servicios online y necesitan controlar su propia infraestructura operativa:

- Infoproductores. Los que más necesitan esta herramienta. La usan para su propio negocio y, además, la aplican como servicio en negocios de terceros (clientes suyos).
- Freelancers que prestan servicios online y quieren operar sin depender de SaaS de terceros.
- Dueños de negocios digitales (cursos, membresías, agencias, e-commerce digital).
- Cualquier persona que opere online.

## 3. Qué NO es

- No es un chatbot. Puede haber IA dentro, pero la IA es una herramienta, no el producto.
- No es una plantilla de landing. Es la operación completa del negocio.
- No es un curso. Es software ejecutable que el dueño opera.
- No es una agencia digital. No hay equipo humano de terceros entregando trabajo.
- No es un dashboard de métricas. Las métricas son uno de los posibles plugins, no el núcleo.
- No es un producto vertical. No está casado con ninguna industria.

## 4. Anatomía del entorno base

Cuando el dueño ejecuta /new-ecoai, queda listo el **backend del OS**:

- Tablas en Supabase: `roles` (el dueño es admin) + `profiles` + `knowledges` / `knowledge_folders` / `knowledge_settings`, todo con RLS.
- El Knowledge sembrado con sus 4 cuadrantes de negocio + 2 áreas (Personal, Reglas) y 3 seeds.
- `BUSINESS_LOGIC.md`, `AGENTS.md` y security headers.

Todavía no hay nada visual. La cara del Knowledge — el **Visual Knowledge**, un cerebro 3D navegable — la enciende el dueño en el paso siguiente con `/visual-knowledge`. El resto del producto se construye iterando con la IA.

## 5. Los 4 cuadrantes de negocio + 2 áreas

### Marketing
Branding, copy, contenidos, captación, posicionamiento, identidad visual. Seed inicial: Brandkit (HTML).

### Ventas
Oferta, pipeline, scripts, objeciones, métricas de conversión. Seed inicial: vacío.

### Producto
Arquitectura, plugins instalados, decisiones técnicas, stack. Seed inicial: Manual del Proyecto + este knowledge ("Sobre el Ecosistema de IA").

### Finanzas
Ingresos, costos, suscripciones, gastos, proyecciones. Seed inicial: vacío.

---

Aparte de los 4 cuadrantes de negocio hay **2 áreas independientes** (no son cuadrantes):

### Personal
La persona detrás del negocio: historia, hábitos, filosofía, misión/visión, journal, ideas.

### Reglas
Cómo debe comportarse la IA: tono comunicacional, palabras prohibidas, "siempre haz X".

### Naturaleza de un Knowledge

No es solo una nota. Es una instrucción operativa que las IAs del ecosistema leen como contexto cuando se les pide algo. Funcionan como SOPs personales que entrenan progresivamente a las IAs. Cuantos más knowledges escriba el dueño, mejor responden las IAs.

### Quién lee los knowledges

Todos los canales de IA del ecosistema leen el mismo cuerpo:
- Claude Code lee vía archivos espejo sincronizados desde la BD.
- IA in-app lee directamente la tabla `knowledges` en cada consulta.
- Cualquier IA futura se conecta a la misma tabla.

Una fuente, múltiples canales.

## 6. Cómo se trabaja con el Ecosistema

**Setup (una sola vez):** seguir el roadmap publicado. Termina escribiendo `nvision` en la terminal de Antigravity dentro de una carpeta vacía. La plantilla se clona.

**Crear el entorno (una sola vez):** `/new-ecoai`. El agente pregunta una cosa (Solo OS u OS + APP) y monta el backend. La cara visual del Knowledge la enciendes después con `/visual-knowledge`.

**Identidad visual:** el dueño define su Brandkit. La IA aplica esa identidad a todo el entorno.

**Iterar (continuo):** el dueño habla con la IA en lenguaje natural. Ejemplos: "quiero un CRM con pipeline", "necesito un panel con métricas de Instagram", "añade dictado por voz". La IA construye lo pedido, crea las tablas necesarias y actualiza BUSINESS_LOGIC.md.

**Despliegue:** Vercel + dominio propio.

## 7. Qué es un Plugin

Cualquier capacidad enchufable: CRM, dashboard, calendario, herramienta de contenido, integración con redes, auditor, motor de ideas, lo que sea.

Anatomía:
- Una sección nueva en tu OS.
- Carpeta src/features/[plugin]/ con la lógica.
- Tablas Supabase con RLS.
- Knowledges asociados en los cuadrantes.
- Entrada en sección 6 de BUSINESS_LOGIC.md.

No hay catálogo cerrado. Cada idea del dueño es un plugin potencial.

## 8. Principios duros

1. Autosuficiencia: el dueño construye sin depender de terceros.
2. Modularidad: cada capacidad nueva es un plugin enchufable.
3. Single source of truth: BUSINESS_LOGIC.md siempre refleja el estado real.
4. Lenguaje natural primero: el dueño no escribe código.
5. Crecimiento por idea: cada idea del dueño puede convertirse en plugin.
6. Knowledge entrenable: cada cuadrante mejora con uso.
7. Todas las IAs leen todo el Knowledge.
8. Datos del dueño: nada vive en infraestructura de terceros.
9. RLS en todas las tablas, sin excepción.
10. Diseño como app nativa, mobile-first.
11. Sin techo de funcionalidad: si el dueño puede describirlo, la IA puede construirlo.

## 9. Glosario

- **Ecosistema**: el proyecto entero (entorno base + plugins + knowledges + datos del dueño).
- **Entorno base**: lo que /new-ecoai deja listo antes de cualquier plugin.
- **OS**: el centro de operaciones del dueño (backend). **APP**: la cara que usan los clientes.
- **Visual Knowledge**: la cara visual del Knowledge — un cerebro 3D navegable (skill `/visual-knowledge`). Primera sección visible del OS.
- **Cuadrante**: una de las 4 áreas de negocio del Knowledge (Marketing, Ventas, Producto, Finanzas). Aparte hay 2 áreas: Personal y Reglas.
- **Knowledge**: instrucción operativa dentro de un cuadrante. SOP que entrena a las IAs.
- **Plugin**: capacidad enchufable al ecosistema.
- **Dueño**: la persona que opera el ecosistema.
- **`nvision`**: comando shell que clona la plantilla en una carpeta vacía.
- **`/new-ecoai`**: comando que crea el backend del OS (pregunta Solo OS u OS + APP).
- **`/visual-knowledge`**: comando que enciende el Visual Knowledge (cerebro 3D).
```

---

## Notas

- Este skill **no** ejecuta `/add-login` automáticamente. La persona lo activa después con `/add-login` para tener auth Email/Password + Google OAuth.
- **Configuración de secretos (Nivel 0 · `.env.local` manual) — regla dura.** Ver "⚡⚡⚡ REGLA ABSOLUTA — PROHIBIDO LEER FICHEROS DE SECRETOS" en `AGENTS.md`. Flujo:
  1. La IA crea el fichero con copia opaca: `cp .env.local.example .env.local` (solo placeholders).
  2. La IA **lista las KEYS** necesarias para lo que se está montando; NUNCA lee ni pide valores por chat.
  3. **El dueño pega los valores** en `.env.local` con su editor.
  4. La IA verifica **solo existencia/formato**: `grep -c '^NOMBRE_VAR=' .env.local` (→ 0/1), nunca el valor.
  5. Si un valor falta o parece mal, la IA **avisa al dueño para que lo revise** — no inspecciona el contenido.
- Si Supabase no tiene credenciales configuradas (`.env.local` vacío → `grep -c` da 0), se muestra al final mensaje pidiendo al dueño que las pegue antes de aplicar la migración. La IA NO lee `.env.local` para comprobarlo.
- Los knowledges seed ("Sobre el Ecosistema de IA", "Manual del Proyecto", "Brandkit") vienen de fábrica; la persona los edita o añade más.

*El Ecosistema de IA es de quien lo opera.*
