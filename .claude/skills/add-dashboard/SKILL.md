---
name: add-dashboard
scope: template
description: "Anade el DASHBOARD (el Home del OS, estilo HUD: orbe animado, ingresos, embudo, mapa mundi, radar, feed en vivo) al proyecto. OPCIONAL: cada dueno lo mete si quiere. Trae el dashboard con datos de EJEMPLO, y luego el dueno lo configura con SUS metricas y elige que secciones ver. NO destructivo: detecta si ya hay dashboard, hace copia de seguridad y pregunta antes de sobrescribir. Triggers: add dashboard, anadir dashboard, quiero el dashboard, mete el panel del OS, add-dashboard, dashboard de plantilla, el HUD."
allowed-tools: Read, Bash, Glob, Edit
license: MIT
---

# add-dashboard — anade el Home del OS (el HUD) al proyecto

Instala el **dashboard de plantilla** (el Home del OS: orbe animado, tarjetas de ingresos, embudo,
mapa mundi de visitantes, radar por area y feed en vivo, todo con el brandkit y el color de marca del
dueno). Viene con **datos de ejemplo**; despues el dueno lo adapta con **sus** metricas y elige que
secciones deja.

Es **OPCIONAL**: solo se corre si el dueno lo pide. Si no lo quiere, no pasa nada.

## Garantia — NO destructivo (toca `src/`, asi que con cuidado)

Este skill copia codigo a `src/` (el producto del dueno). Por eso:
1. **DETECTA** si ya hay un dashboard. Si lo hay, **hace copia de seguridad y PREGUNTA** antes de sobrescribir.
2. Solo toca los archivos del dashboard (abajo). No toca el resto de `src/`, ni la BD, ni las reglas, ni `.env`.
3. No publica ni hace `git push`.

## Requisitos del proyecto destino
- Es un Ecosistema de IA con **Next.js 16+ App Router + React 19 + TypeScript + Tailwind**.
- Tiene el **token de marca** `--brand` (variable CSS con el color del dueno, en formato `R G B`).
  Todo el acento del dashboard sale de ahi (white-label). Si el proyecto no lo tiene, avisa al dueno
  y usa un color neutro de fallback hasta que lo defina.
- Tiene el shell del OS (route group `(admin)`), donde vivira `/dashboard`.

## Proceso

### Paso 1 — Traer la plantilla (fresca de GitHub)
```bash
T=$(mktemp -d)
git clone -q --depth 1 https://github.com/marcoapereirav-arch/N-EAI-FABER.git "$T"
MADRE="$T/nvision"
```

### Paso 2 — DETECTAR si ya hay dashboard (puerta)
```bash
ls src/features/dashboard/DashboardClient.tsx 2>/dev/null && echo "YA HAY DASHBOARD"
ls src/app/\(admin\)/dashboard/page.tsx 2>/dev/null && echo "YA HAY RUTA /dashboard"
```
- **Ya lo tiene** → **PARA y pregunta**: *"Ya tienes un dashboard. ¿Lo reemplazo por el de plantilla (hago copia de seguridad antes) o lo dejo como esta?"* Solo sigue con su OK.
- **No lo tiene** → sigue.

### Paso 3 — Copia de seguridad (si habia algo)
```bash
mkdir -p .test-artifacts/dashboard-backup
[ -d src/features/dashboard ] && cp -r src/features/dashboard ".test-artifacts/dashboard-backup/features-dashboard" 2>/dev/null
[ -f "src/app/(admin)/dashboard/page.tsx" ] && cp "src/app/(admin)/dashboard/page.tsx" ".test-artifacts/dashboard-backup/page.tsx" 2>/dev/null
```

### Paso 4 — Copiar los archivos del dashboard
```bash
mkdir -p src/features/dashboard "src/app/(admin)/dashboard"
cp -r "$MADRE/src/features/dashboard/." src/features/dashboard/
cp "$MADRE/src/app/(admin)/dashboard/page.tsx" "src/app/(admin)/dashboard/page.tsx"
# Vista previa sin auth (opcional, util para ensenarselo al dueno):
mkdir -p src/app/dashpreview && cp "$MADRE/src/app/dashpreview/page.tsx" src/app/dashpreview/page.tsx
```
Archivos que trae:
- `src/features/dashboard/DashboardClient.tsx` — el HUD completo (orbe, ingresos, embudo, mapa, radar, feed).
- `src/features/dashboard/world-map.ts` — datos del mapa mundi.
- `src/app/(admin)/dashboard/page.tsx` — la ruta `/dashboard`.
- `src/app/dashpreview/page.tsx` — vista previa sin login (opcional).

### Paso 5 — Enchufarlo como Home del OS (si el dueno quiere)
Por defecto queda en `/dashboard`. Si el dueno quiere que sea la pantalla de inicio del OS, apunta el
Home del shell a `/dashboard` (redirect o enlace del sidebar). Preguntale antes de cambiar su Home actual.

### Paso 6 — Verificar
```bash
npx tsc --noEmit 2>&1 | grep -i dashboard || echo "tipos OK en dashboard"
```
Abre `/dashboard` (o `/dashpreview`) y confirma que el HUD se ve con el color de marca del dueno.

### Paso 7 — Limpiar
```bash
rm -rf "$T"
```

### Paso 8 — Decirle al dueno que AHORA lo configure
El dashboard viene con **numeros de EJEMPLO** (hardcodeados en `DashboardClient.tsx`: `REVENUE`,
`PROFIT`, `FUNNEL`, `GEO`, `FEED`, `AREAS`). Dile al dueno, claro:

> *"El dashboard ya esta puesto en `/dashboard`, con datos de ejemplo. Ahora lo adaptamos con TUS
> metricas: dime que numeros quieres (ingresos, embudo, paises, feed...) y de donde salen (una tabla,
> una integracion), y que secciones dejas y cuales quito. Lo cableo a tus datos reales cuando me digas."*

Cablear a datos reales (sustituir los arrays de ejemplo por consultas a su BD) es un trabajo aparte, con
el dueno, seccion por seccion — no lo inventes.

---

## Anti-patrones (PROHIBIDO)
- ❌ Sobrescribir un dashboard existente sin copia de seguridad y sin OK.
- ❌ Cambiar el Home del OS sin preguntar.
- ❌ Inventar las metricas del dueno o cablearlas a datos que no te dio.
- ❌ Tocar otra cosa de `src/` que no sea el dashboard.
- ❌ Publicar (`git push`) — este skill solo instala en local.

## Que deja listo
El Home del OS (HUD) instalado en `/dashboard`, con el color de marca del dueno y datos de ejemplo,
listo para que el dueno elija sus secciones y lo cablee a sus metricas reales. Nada mas de su proyecto se toca.
