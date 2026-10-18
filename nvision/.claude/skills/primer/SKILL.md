---
name: primer
scope: template
description: "Cargar contexto completo del proyecto al inicio de una conversacion. Lee las reglas duras, BUSINESS_LOGIC.md, estructura de features y estado de la BD, y AVISA de que chats tienes abiertos (ramas en marcha) y de si dev esta al dia. Activar cuando el agente no tiene contexto del proyecto o el usuario dice: que tenemos, donde estamos, dame contexto, resumeme el proyecto."
allowed-tools: Read, Grep, Glob, Bash
---

# Primer: Contexto NVISION®

Este proyecto fue creado con **NVISION®**, una template optimizada para desarrollo Agent-First. Al ejecutar este skill, el agente entiende inmediatamente que tiene disponible y como trabajar.

## Lo Que Ya Sabes (NVISION® DNA)

### Golden Path (Stack Fijo)
No hay decisiones tecnicas que tomar. El stack esta definido:

| Capa | Tecnologia | Notas |
|------|------------|-------|
| Framework | Next.js 16 + Turbopack | App Router, Server Components |
| UI | React 19 + TypeScript | Strict mode |
| Styling | Tailwind CSS 3.4 | Sin CSS custom |
| Backend | Supabase | Auth + PostgreSQL + Storage + RLS |
| Validation | Zod | Schemas compartidos client/server |

### Arquitectura Feature-First
```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Route group: paginas sin sidebar
│   ├── (app)/             # Route group: paginas protegidas con sidebar
│   └── api/               # API Routes
├── features/              # Todo colocalizado por feature
│   └── [feature-name]/
│       ├── components/    # UI de la feature
│       ├── services/      # Logica de negocio
│       ├── hooks/         # React hooks
│       └── types/         # TypeScript types
├── components/            # Componentes compartidos (Sidebar, etc.)
└── lib/
    └── supabase/          # Clients (client.ts, server.ts)
```

### MCPs Disponibles
Tienes 3 MCPs conectados. Usalos:

| MCP | Comandos Clave | Cuando Usar |
|-----|----------------|-------------|
| **Supabase** | `list_tables`, `execute_sql`, `apply_migration`, `get_logs` | SIEMPRE para BD. No uses CLI. |
| **Next.js DevTools** | `nextjs_index`, `nextjs_call`, `browser_eval` | Debug errores, ver estado del servidor |
| **Playwright** | `browser_navigate`, `browser_snapshot`, `browser_click` | Validacion visual, testing UI |

### Skills Disponibles
Delega tareas complejas usando los skills especializados:

| Skill | Responsabilidad |
|-------|-----------------|
| `frontend` | UI/UX, componentes, Tailwind, animaciones |
| `backend` | Server Actions, APIs, logica de negocio |
| `supabase-admin` | Migraciones, RLS policies, queries complejas |
| `calidad` | Tests, quality gates, verificacion |
| `vercel-deployer` | Deploy, env vars, dominios |
| `documentacion` | README, docs tecnicos |
| `codebase-analyst` | Patrones, convenciones del proyecto |

### Skills Slash Disponibles
- `primer` - Este skill (contexto inicial)
- `prp` - Generar Product Requirements Proposal
- `new-ecoai` - Crear nueva aplicacion desde cero
- `landing` - Crear landing page de alta conversion
- `add-login` - Inyectar sistema de autenticacion completo
- `update-ecoai` - Actualizar a la ultima version

---

## ANTES DE EMPEZAR — pregunta al dueño qué nivel de contexto cargar

Muestra exactamente este mensaje y espera respuesta:

```
Voy a cargar el contexto del proyecto. ¿Cómo lo quieres?

  (1) LIGERO
      Leo lo esencial para ayudarte: las reglas duras del
      proyecto, su ficha técnica, qué hay construido, los
      últimos cambios. Es rápido.

  (2) COMPLETO
      Leo todo lo anterior + extras: configs, migraciones,
      estructura completa, todos tus .md y knowledges. Tengo
      contexto absoluto pero consume más tokens.

Cualquiera que elijas, te voy a ayudar igual con lo que pidas
después. La diferencia es solo cuánto contexto cargo ahora al
inicio. Si dudas, elige LIGERO — para la mayoría de tareas es
suficiente.

Responde 1 o 2.
```

Espera la respuesta. Luego ejecuta el flujo correspondiente (modo 1 lee solo los pasos 0, 1, **1-bis**, 2, 3, 4 abajo; modo 2 lee todo + extras).

⚡ **El paso 1-bis (qué chats tienes abiertos) se hace SIEMPRE**, en los dos modos. Es lo que evita pisar el trabajo de otro chat.

Si el dueño responde algo distinto a 1/2, vuelve a mostrar el mensaje.

---

## Proceso de Contextualizacion

### 0. Leer el concepto del Ecosistema de IA (PRIMERO)

**ANTES de cualquier otro paso**, lee el **Knowledge** del proyecto (tabla `knowledges` en Supabase) — TODOS los cuadrantes relevantes (Marketing, Ventas, Producto, Finanzas, Personal, Reglas), empezando por **"Sobre el Ecosistema de IA"** (cuadrante Producto), que define la arquitectura. **Regla universal: cualquier IA lee el Knowledge antes de actuar** (ver sección MEMORIA & KNOWLEDGE en AGENTS.md). Si el proyecto es recién creado y aún no tiene Knowledge, continúa.

Después, lee también los demás knowledges seed del cuadrante Producto (especialmente "Manual del Proyecto") para entender el negocio específico del dueño.

### 1. Leer Identidad del Proyecto + TODOS los archivos sueltos en raíz

**Archivos que SIEMPRE existen en la plantilla** (léelos siempre):

1. `AGENTS.md` (raíz) — reglas duras del proyecto. (`CLAUDE.md` y `GEMINI.md` son accesos directos al mismo archivo.)
2. `BUSINESS_LOGIC.md` (raíz) — ficha técnica del proyecto + plugins instalados (sección 6).

**Cualquier OTRO archivo `.md` que el dueño haya creado** (léelos también si existen, sea cual sea su nombre):

Descubrirlos con:

```bash
find . -maxdepth 2 -name "*.md" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./.git/*" -not -path "./.claude/*" -not -path "./supabase/*"
```

Si aparece cualquier `.md` extra (un STATE, un PENDING, un ROADMAP, un MANUAL, lo que sea que el dueño haya creado), **léelo como contexto adicional**. No asumas que existe — solo léelo si lo encuentras.

**Historial reciente** (siempre lo lees):

```bash
git log --oneline -20
```

Te da la lista de cambios recientes del proyecto para saber qué se ha estado haciendo.

### 1-bis. QUÉ HAY EN MARCHA · los chats abiertos (SIEMPRE, en los dos modos)

> **UN CHAT = UNA RAMA = UNA CARPETA.** El dueño trabaja en varios chats a la vez y cada
> uno vive en su propia carpeta. Al abrir un chat nuevo tiene que saber qué tiene en
> marcha, y tú también: para no pisar nada.
> Ver la regla de fabrica `EL WORKFLOW` en `AGENTS.md`.

```bash
git worktree list                            # los chats abiertos, con su carpeta
git branch --show-current                    # en cuál estás tú
git log --oneline dev..main                  # ¿dev está al día? (debe dar 0)
git status --short                           # ¿algo sin guardar aquí?
```

**Repórtaselo en 2-3 líneas, al principio del resumen.** Por ejemplo:

```
Tienes 2 chats abiertos:
  · order-bump   · hace 2 días  · "order bump del funnel"
  · emails-drip  · hace 5 horas · "secuencia de bienvenida"
dev al día · nada sin guardar.
```

**Si `dev` está atrás de `main`, avísalo como problema**, no como dato: significa que
alguien publicó saltándose `dev`, y la próxima rama nacería de una foto vieja.

### 1-ter. ⚡ EL DISPARADOR · en cuanto el dueño diga lo que quiere

> **El disparador es este: el dueño dice lo que quiere.** No cuando empiezas a
> escribir código, no cuando te parece que ya toca. **En ese mismo mensaje**, antes de
> tocar un solo archivo, la IA hace **DOS cosas y se para**.

**PASO 1 · Abrir la carpeta y la rama de este chat. UN comando:**

```bash
npm run chat:nuevo <nombre-corto-de-lo-que-se-va-a-hacer>
```

Pone `dev` al día, crea la rama desde `dev`, crea la carpeta y la deja lista
(`node_modules` clonado en ~10 s, claves enlazadas). Después **se trabaja SIEMPRE dentro
de esa carpeta**, con rutas absolutas.

**SIEMPRE, sin excepción**, aunque el cambio sea un texto o un color. La excepción
"trivial → sobre `dev`" está **derogada**: abría el hueco de dos chats compartiendo `dev`.

**Si este chat ya está dentro de la carpeta de un chat** (`git worktree list` lo dice),
no se crea nada: ya tiene su sitio.

**PASO 2 · Escribir el PRP, PEGARLO EN EL CHAT, y ESPERAR.**

El archivo va en `.claude/PRPs/<nombre-de-la-rama>.md`, dentro de la carpeta del chat, con
`estado: propuesto` en la cabecera. **Pero lo que se le entrega es el MENSAJE**: él no abre
el archivo nunca — desde el teléfono ni siquiera puede.

Se hacen **dos cosas**:

1. **Pegar el PRP ENTERO en el mensaje**, con estas 5 secciones y las fases en casillas:

   ```
   ## Objetivo          una o dos frases
   ## Qué voy a hacer   bullets cortos
   ## Fases             **A · nombre** + casillas  - [ ]
   ## Qué NO entra      lo que queda fuera a propósito
   ## Cómo lo verás     qué verá en pantalla
   ```

   Las fases son **las que pida el trabajo**: dos en algo pequeño, ocho en algo grande.

2. **Abrir el panel de tareas** con una entrada por fase, y marcarlas **en vivo** mientras
   se construye.

Y **se para ahí**. Cuando él dice que sí, `estado: propuesto` pasa a `estado: aprobado` y
solo entonces se construye.

⛔ **PROHIBIDO poner `aprobado` por iniciativa.** El OK es suyo, no tuyo.
⛔ **PROHIBIDO** responder «lo dejé en tal archivo» o mandarle a abrir un `.md`.

El detalle completo del formato está en el skill `/prp`.

**La red que lo obliga:** `.claude/hooks/puerta-de-entrada.mjs` **bloquea** cualquier
escritura que ocurra en la carpeta principal o sin PRP aprobado. Si haces bien estos dos
pasos no la notas nunca. Si te los saltas, no puedes escribir.

**Por que existe esta regla:** *«llevo rato que no veo que me presentes el PRP en
el momento de empezar a trabajar. No lo estás haciendo… Antes de empezar a trabajar, yo te
lo tengo que aprobar. Eso es parte del sistema y no se está cumpliendo. Tiene que ser
obligatorio.»*

Extrae de toda esta lectura:
- **Nombre del proyecto**
- **Stack técnico**
- **Plugins instalados** (sección 6 de BUSINESS_LOGIC.md)
- **Reglas duras del proyecto** (AGENTS.md)
- **Contexto adicional** que el dueño haya documentado a mano (en cualquier `.md` extra)
- **Cambios recientes** (de `git log`)
- **Qué hay en marcha** (ramas abiertas + estado de `dev`)

### 2. Mapear Estado de BD (via Supabase MCP)

Ejecuta `list_tables` para ver:
- Que tablas existen
- Cuantos registros tiene cada una
- Si RLS esta habilitado
- Relaciones entre tablas (foreign keys)

### 3. Escanear Features Implementadas

Revisa `src/app/` y `src/features/` para entender:
- Que paginas existen
- Que features estan construidas
- Que API endpoints hay

### 4. Entregar Resumen

```markdown
# [Nombre del Proyecto]

## Template
NVISION® v4.0 (Next.js 16 + Supabase)

## Proposito
[Que problema resuelve en 1-2 lineas]

## Que tienes en marcha
Chats con trabajo abierto:
  · [rama]  ·  [hace cuanto]  ·  [ultimo commit]
[dev al dia / dev ATRASADA N cambios (avisar como problema)] · [nada sin guardar / N archivos sin guardar]

## Estado Actual

### Base de Datos
| Tabla | Registros | RLS |
|-------|-----------|-----|
| ... | ... | SI/NO |

### Rutas Implementadas
- `/` -> [descripcion]
- `/dashboard` -> [descripcion]
- ...

### API Endpoints
- `POST /api/xxx` -> [que hace]
- ...

## MCPs Activos
SI Supabase | SI Next.js DevTools | SI Playwright

## Comandos
- `npm run dev` -> Desarrollo
- `npm run build` -> Build

## Listo para trabajar
En que te ayudo?
```

---

## Filosofia NVISION®

### El Humano Decide QUE, Tu Ejecutas COMO
- El humano define el problema de negocio
- Tu traduces a codigo usando el Golden Path
- No preguntas "que stack usar?" - ya esta decidido

### Velocidad = Inteligencia
- Turbopack permite 100 iteraciones en 30 segundos
- Usa Playwright para validar visualmente -> codigo -> screenshot -> iterar
- No planifiques de mas, ejecuta y ajusta

### MCPs son tus Sentidos
- **Supabase MCP** = Tu conexion a la BD (no uses CLI)
- **Next.js DevTools** = Tus ojos en errores/logs
- **Playwright** = Tu validacion visual

---

**Objetivo**: De 5-10 minutos de explicacion a 30 segundos de contexto automatico.

*NVISION®: Agent-First Development*
