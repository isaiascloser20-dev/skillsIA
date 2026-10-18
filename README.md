# NVISION®

Plantilla para crear **Ecosistemas de IA**: software modular donde un dueño centraliza todas las herramientas operativas de su negocio digital en un solo entorno, construido y expandido con lenguaje natural a través de una IA.

---

## Para quién es

- **Infoproductores** que quieren operar su propio negocio digital sin depender de SaaS sueltos, agencias o freelancers — y aplicarlo además como servicio en negocios de terceros.
- **Freelancers** que prestan servicios online y quieren tener su infraestructura propia.
- **Dueños de negocios digitales** (cursos, membresías, agencias, e-commerce digital).
- Cualquier persona que opere online y quiera autosuficiencia técnica.

---

## Dos caminos al crear un proyecto

Cuando ejecutas `/new-ecoai` dentro de Claude Code, el agente te pregunta una sola cosa:

**¿Qué vas a montar?**

- **(1) Solo mi OS.** Tu centro de operaciones para gestionar tu negocio por dentro: tu Knowledge (4 cuadrantes de negocio — Marketing, Ventas, Producto, Finanzas — + 2 áreas: Personal y Reglas), dashboards, métricas, automatizaciones y tu equipo con roles.
- **(2) Mi OS + mi APP.** Lo anterior y, además, la **APP**: lo que entregas a tus clientes finales (un tracker de finanzas, de hábitos, tu SaaS, lo que crees). Misma base de datos: tu OS mide lo que pasa en tu APP.

El **OS** es el backend (donde operas); la **APP** es la cara que usan tus clientes. Elijas lo que elijas, en cualquier momento puedes pedirle a la IA que añada lo otro. No te bloqueas con esa decisión.

---

## Qué obtienes al ejecutar `nvision`

El comando copia la plantilla a una carpeta vacía. Quedas con esta estructura lista:

```
tu-proyecto/
├── AGENTS.md                  # Reglas duras del proyecto (cargadas en cada sesión)
├── CLAUDE.md  →  AGENTS.md    # acceso directo, no es un archivo aparte
├── GEMINI.md  →  AGENTS.md    # acceso directo, no es un archivo aparte
├── BUSINESS_LOGIC.md          # Ficha técnica del proyecto (lo crea /new-ecoai)
├── .mcp.json                  # 3 MCPs configurados (Next.js, Playwright, Supabase)
├── .env.local.example         # Plantilla de variables de entorno
├── .gitignore                 # Excluye secrets y artefactos
├── package.json               # Next.js 16, React 19, Tailwind 3.4
├── next.config.ts             # Incluye security headers
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── components.json
├── src/                       # Estructura Feature-First
└── .claude/
    ├── skills/                # skills (inventario: .claude/skills/SKILLS_README.md)
    ├── memory/                # Memoria persistente por proyecto
    ├── PRPs/                  # Templates de Product Requirements Proposal
    └── design-systems/        # 5 sistemas de diseño base
```

Después escribes `/new-ecoai`, eliges **Solo OS** u **OS + APP**, y la IA monta el **backend** de tu OS: tu Knowledge (4 cuadrantes + 2 áreas) y roles en Supabase con RLS, `BUSINESS_LOGIC.md` y ciberseguridad base. Lo visual lo enciendes en el paso siguiente con `/visual-knowledge` (tu **Visual Knowledge**, el cerebro 3D navegable).

---

## Stack técnico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 + React 19 + TypeScript |
| Estilos | Tailwind CSS 3.4 |
| Backend | Supabase (Auth + Database + RLS + Storage) |
| Validación | Zod |
| Estado | Zustand |
| AI Engine | Vercel AI SDK v5 + OpenRouter (300+ modelos) |
| Testing | Playwright CLI + MCP |
| Deploy | Vercel |

Arquitectura **Feature-First**: cada plugin del ecosistema vive en `src/features/[plugin]/` con todo su contexto (componentes, hooks, services, tipos, store).

---

## Skills disponibles

> Inventario completo y siempre actualizado en `nvision/.claude/skills/SKILLS_README.md` (generado con `npm run skills:inventory`). Abajo, los principales.

### Crear y mantener el ecosistema

| Skill | Qué hace |
|-------|---------|
| `/new-ecoai` | Crea el **backend** de tu OS: Knowledge (4 cuadrantes + 2 áreas) + roles + tablas base + RLS + ciberseguridad. Pregunta: **Solo OS** u **OS + APP**. |
| `/visual-knowledge` | Enciende tu **Visual Knowledge**: convierte tu Knowledge en un cerebro 3D navegable (vista 3D + carpetas + buscador). Es la primera sección visible de tu OS. |
| `/primer` | Carga contexto completo del proyecto al inicio de una sesión. Lee todos los `.md` y el knowledge "Sobre el Ecosistema de IA". |
| `/update-ecoai` | Actualiza la plantilla en el proyecto preservando skills externos que el dueño haya añadido. |
| `/skill-creator` | Guía para crear skills nuevos. |
| `/skills-inventory` | Te muestra el inventario de skills que tiene tu ecosistema, agrupado por para qué sirve. Pregúntale "¿qué skills tengo?". |
| `/publicar` | **Una orden, cero preguntas.** `npm run publicar`: pone `dev` al día, une tu rama, pasa la puerta (~7 s), sube, y **espera a que tu web sirva ESE commit**. Solo se ejecuta si tú lo pides. |
| `/cerrar` | **Una orden, cero preguntas.** `npm run cerrar`: publica TODO y cierra la carpeta y la rama de ese chat. Los otros chats no se tocan. |

> **Publicar no monta tu web en local.** Ese `next build` tarda minutos y es
> **el mismo** que Vercel hace después en sus máquinas — y si allí falla, tu web
> se queda como estaba. La puerta antes de subir son los tipos y tus vigilantes:
> **segundos, no minutos.** En NVISION eso bajó de 5 min 16 s a 7 s medidos.
>
> Lo configuras en tu `package.json`, y no vuelves a tocarlo:
>
> ```jsonc
> "nvision": { "web": "https://app.tu-dominio.com", "rutaViva": "/login" },
> "scripts": {
>   "typecheck": "tsc --noEmit",
>   "puerta": "node scripts/check-loquesea.mjs && ...",  // TUS vigilantes
>   "prebuild": "npm run puerta"
> }
> ```
>
> ⚠️ En `puerta` **nunca** van los vigilantes de disciplina local (el que mira
> tus carpetas de chat, el que mira si `dev` está al día). Esos van en `predev`:
> en la puerta tumban publicaciones buenas.
>
> **¿Y los permisos?** El modo Bypass de Claude Code **no** salta las reglas
> `ask`. Por eso `.claude/settings.json` deja en `ask` **solo** lo que destruye
> (`git push --force`, `supabase db push`) y este flujo no usa nunca. Si vuelves
> a meter `Bash(git push:*)` ahí, publicar te preguntará 3 veces cada vez.

### Plugins enchufables (añaden capacidad al ecosistema)

| Skill | Qué hace |
|-------|---------|
| `/add-login` | Auth completa con Supabase: Email/Password + Google OAuth + profiles + RLS. |
| `/add-emails` | Emails transaccionales con Resend + React Email + batch sending + unsubscribe. |
| `/email-token-based` | Emails SIN Supabase (custom token flow): Resend + tokens propios (auth_tokens) + reset password + confirmación de email. |
| `/add-mobile` | PWA instalable + push notifications (iOS compatible). |
| `/ai [template]` | 11 templates de IA (chat, web search, vision, tools, RAG, embeddings, structured outputs, generative UI). |

### Flujo de desarrollo

| Skill | Qué hace |
|-------|---------|
| `/prp [feature]` | Genera Product Requirements Proposal antes de implementar features complejas. |
| `/bucle-agentico` | Ejecuta features complejas por fases coordinadas (DB + API + UI). |
| `/playwright-cli` | Testing automatizado: navega, llena formularios, screenshots. |

### Contenido y diseño

| Skill | Qué hace |
|-------|---------|
| `/frontend-design` | Interfaces de alta calidad de diseño, evitando el look genérico de IA. |
| `/image-generation` | Genera y edita imágenes con OpenRouter (modelo configurable). |
| `/website-3d` | Landing cinematográfica con scroll-driven video animation. |

### Base de datos y mantenimiento

| Skill | Qué hace |
|-------|---------|
| `/supabase` | Operaciones de BD: crear tablas, RLS, queries, migraciones. |
| `/autoresearch` | Auto-optimización de skills con loop autónomo (mejora skills existentes con evals). |

---

## MCPs incluidos

| MCP | Función |
|-----|---------|
| **Supabase** | Conexión directa a la base de datos. Permite `list_tables`, `execute_sql`, `apply_migration`, ver logs. |
| **Next.js DevTools** | Lee errores y logs del servidor en tiempo real vía `/_next/mcp`. |
| **Playwright** | Captura screenshots y valida la UI automáticamente. |

---

## Knowledge: la memoria viva del ecosistema

El Ecosistema de IA organiza el conocimiento operativo del dueño en **4 cuadrantes de negocio + 2 áreas**, dentro de Supabase (tablas `knowledges` + `knowledge_folders` + `knowledge_settings`):

**4 cuadrantes de negocio:**
- **Marketing** — branding, copy, contenidos, captación, identidad visual.
- **Ventas** — oferta, pipeline, scripts, objeciones, conversión.
- **Producto** — arquitectura, plugins instalados, decisiones técnicas, stack.
- **Finanzas** — ingresos, costos, suscripciones, gastos, proyecciones.

**2 áreas independientes** (no son cuadrantes):
- **Personal** — historia, hábitos, filosofía, journal del dueño.
- **Reglas** — tono, palabras prohibidas, "siempre haz X".

Cada knowledge es una instrucción operativa (SOP) que las IAs del ecosistema leen como contexto. Todas las IAs del proyecto leen todos los knowledges relevantes: Claude Code vía archivos espejo, IA in-app vía base de datos. Con `/visual-knowledge` (tu **Visual Knowledge**) navegas todo esto como un cerebro 3D.

---

## Ciberseguridad base (incluida en `/new-ecoai`)

- Security headers en `next.config.ts` (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy).
- HaveIBeenPwned check al signup (rechaza passwords filtrados).
- RLS dura en todas las tablas (no negociable).
- Sanitización con Zod en formularios y APIs.
- 2FA opcional con TOTP para admin.
- `.gitignore` excluye `.env.local` y `.mcp.json`.

Capas adicionales (rate limiting, captcha, audit log, CSP granular) disponibles vía skill `/add-security` (opcional, premium).

---

## Diseño y experiencia de usuario

Regla dura del proyecto (anclada en `CLAUDE.md`):

- **Mobile-first.** Todo cambio de UI se diseña primero pensando en móvil 375px.
- **Sensación de app nativa.** El resultado debe parecer una app instalada del teléfono: bottom tabs cuando aplique, headers grandes, bottom sheets para modales, transiciones suaves, touch targets ≥44px, respeto a `safe-area-inset`.
- **Desktop impecable.** En desktop, la UX y el diseño visual deben ser de producto serio.

---

## Instalación (2 minutos)

### 1. Clona el repositorio
```bash
git clone https://github.com/marcoapereirav-arch/N-EAI-FABER.git
cd N-EAI-FABER
```

### 2. Abre en Claude Code
```bash
claude .
```

### 3. Configura el alias `nvision`
Pídele a Claude Code:
```
Configura el alias "nvision" en mi terminal
```

Claude Code detecta tu sistema (zsh/bash) y lo añade a tu `~/.zshrc` o `~/.bashrc`. El alias debe quedar así:
```bash
alias nvision='T=$(mktemp -d) && git clone -q --depth 1 https://github.com/marcoapereirav-arch/N-EAI-FABER.git "$T" && git -C "$T" archive HEAD:nvision | tar -x && rm -rf "$T"'
```
> Este alias **descarga SIEMPRE la última versión desde GitHub** y copia solo los archivos versionados de la plantilla (nunca `node_modules`, `.next`, `.mcp.json` ni basura local). No depende de ninguna ruta local ni de tener el repo actualizado: cada vez que lo ejecutas trae lo más reciente.

---

## De 0 a Producción

### 1. Crear proyecto
```bash
mkdir mi-proyecto && cd mi-proyecto
nvision
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Prender el MCP
```bash
npm run dev
# Output: - MCP Server: http://localhost:3000/_next/mcp
```

### 4. Conectar Claude Code
```bash
claude .  # En otra terminal
```

### 5. Crear tu entorno
```
/new-ecoai
```

El agente te pregunta qué quieres crear (A/B/C) y construye automáticamente.

### 6. Construir
```
Implementa las features según BUSINESS_LOGIC.md
```

La IA usa los MCPs para ver errores en tiempo activo mientras construye.

El proceso completo paso a paso está documentado en el **NVISION® Roadmap Ecosistema AI** oficial, accesible para miembros de la comunidad.

---

## Cómo actualizar a la última versión

Desde dentro del proyecto:

```
/update-ecoai
```

El skill actualiza los skills oficiales de la plantilla sin tocar tu código en `src/`, tu `BUSINESS_LOGIC.md`, tu `AGENTS.md`, tus knowledges, ni los skills externos que hayas añadido manualmente.

---

## Soporte y comunidad

Esta plantilla se distribuye exclusivamente a miembros de la comunidad NVISION®. El soporte, los skills premium adicionales y las actualizaciones se entregan por canales de la comunidad.

---

*NVISION® — Plantilla para crear Ecosistemas de IA.*
