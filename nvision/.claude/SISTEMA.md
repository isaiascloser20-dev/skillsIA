# Version del sistema NVISION

VERSION: 5

> Este numero sube cada vez que NVISION publica una actualizacion del sistema
> (reglas de fabrica o skills). El skill `/actualizar-sistema` compara este numero
> con la version del proyecto del alumno para saber que traer.
>
> QUE cuenta como "sistema": el bloque `REGLAS-DE-FABRICA` del `AGENTS.md` + los skills oficiales.
> QUE NO se toca NUNCA: el codigo del alumno (`src/`), sus datos, su base de datos,
> sus reglas propias (fuera de la valla), sus skills propios, su `.env`, su `.mcp.json`.

---

## Changelog

### v5 — 2026-07-30
- **La GUARDIA de la carpeta principal.** `/primer` dice "abre tu carpeta", pero eso es una instruccion escrita. Ahora `check:flujo` comprueba que en la carpeta principal SOLO este `dev`: si un chat se pone a trabajar ahi con otra rama, `npm run dev` **se niega a arrancar** y le dice el comando exacto. Corre en `predev`, asi que salta antes de que el chat empiece, no despues.
- **UN CHAT = UNA RAMA = UNA CARPETA.** Cada chat trabaja en su propia carpeta (`git worktree`), no solo en su propia rama. Es lo que permite tener **varios chats trabajando a la vez de verdad**, cada uno con su localhost, sin turnarse ni pisarse. Una carpeta solo puede tener UNA rama puesta: con una sola carpeta, dos chats con ramas distintas se turnan el checkout y el que tiene trabajo sin guardar puede perderlo.
- **Dos comandos nuevos, y cada uno hace TODO de una vez** (si fueran tres pasos, algun dia se harian dos): `npm run chat:nuevo <nombre>` (pone `dev` al dia, crea rama + carpeta y la deja lista) y `npm run chat:cerrar [nombre]` (comprueba que no queda nada sin guardar ni sin publicar, y solo entonces borra rama y carpeta; si falta algo **se niega**). Mas `chat:cerrar -- --limpiar` para recoger chats mal cerrados.
- **Derogada la excepcion "trivial → sobre `dev` directamente".** Ahora SIEMPRE rama y carpeta, sin excepcion: la excepcion abria el hueco de dos chats compartiendo `dev`.
- **`check:flujo` ampliado:** avisa de carpetas de chat huerfanas.
- Los 3 skills (`/primer`, `/publicar`, `/cerrar`) al dia con los dos comandos.
- **`/actualizar-sistema` basta con lanzarlo UNA vez.** Paso 1-bis nuevo: nada mas clonar la madre, lee la version nueva de ese mismo skill y sigue ESA. Asi los pasos que se añadan en el futuro se ejecutan en esa misma vuelta, no en la siguiente.
- **`/actualizar-sistema` ahora tambien trae los VIGILANTES.** Hasta ahora copiaba las reglas y los skills pero **NO los scripts**: el alumno recibia la regla sin la maquina que la hace cumplir — el mismo fallo que costo un mes en NVISION. Paso 5-bis nuevo: copia `scripts/*.mjs`, añade al `package.json` los comandos que falten (sin pisar los suyos) y **quita el `-p 3000` del `dev`** (con el puerto fijo el segundo chat no arranca).

### v4 — 2026-07-30
- **Regla de fabrica NUEVA — EL WORKFLOW (`dev` → rama → `dev` → `main`):** el flujo entero, escrito una sola vez. Una rama POR CHAT, nacida de `dev` y devuelta a `dev`; nunca de la rama directo a `main`; al publicar se suben LAS DOS ramas. Antes la regla era una sola linea ("toda rama nace de `dev`") y **ninguna herramienta la ejecutaba**: `/publicar` unia la rama directo a `main` y no nombraba `dev` ni una vez. Resultado real en NVISION: `dev` estuvo un mes sin recibir nada.
- **Regla de fabrica NUEVA — UN SOLO juego de skills:** las skills viven SOLO en `.claude/skills/` del proyecto. Una copia en `~/.claude/skills/` **gana** y tapa a la del proyecto **en silencio**. Caso real: 19 skills copiadas a la carpeta global el 10-jun; mes y medio despues el agente seguia cargando esas versiones y una regla escrita en julio nunca llego a cumplirse.
- **Regla de fabrica NUEVA — el PLAN se escribe antes de construir (PRP):** presentar el plan en el chat no sustituye al documento.
- **Skills al dia:** `/publicar` (hace el recorrido por `dev` y sube las dos ramas), `/cerrar` (cierra la rama de ESE chat, no toca las de los otros, y avisa si `dev` quedo atras), `/primer` (al arrancar te dice que chats tienes abiertos y si `dev` esta al dia).
- **Vigilante nuevo:** `npm run check:skills`, enganchado a `predev` y `prebuild`.

### v3 — 2026-07-25
- **Nuevo skill `/add-dashboard`:** anade el Home del OS (el HUD: orbe, ingresos, embudo, mapa mundi, radar, feed) al proyecto. OPCIONAL — cada dueno lo mete si quiere. Viene con datos de ejemplo y luego el dueno lo configura con sus metricas y elige secciones. NO destructivo: detecta si ya hay dashboard, hace copia de seguridad y pregunta antes de sobrescribir. Toca `src/` (solo los archivos del dashboard).

### v2 — 2026-07-25
- **Nuevo skill `/conectar-knowledge`:** conecta un ecosistema viejo (sin Knowledge, o con Knowledge en esquema viejo) al **Knowledge 3D** (cerebro neuronal + carpetas + parte OS). ADITIVO e IDEMPOTENTE, nunca toca roles, y trae una PUERTA DE DETECCION: a quien ya lo tiene no le hace nada. Reconstruye la funcion del antiguo `migrate-ecoai`, ahora clara y con detección.

### v1 — 2026-07-25
- **Nuevo:** sistema de versiones del sistema (este archivo) + skill `/actualizar-sistema`.
- **Nuevo:** bloque `REGLAS-DE-FABRICA` (la "valla") en `AGENTS.md` — el unico sitio que el update reescribe.
- **Regla de fabrica anadida:** "No dejar basura en la raiz" (temporales a `.test-artifacts/`).
- **Regla de fabrica anadida:** "Cerrar una RLS obliga a barrer las lecturas ajenas" (fallo mudo de Supabase: la RLS filtra y devuelve 0 sin error).
- **Ya presente de antes (base):** explicar antes de hacer y esperar OK · codigo en local, publica el dueno · toda rama nace de `dev` · prohibido leer ficheros de secretos.
