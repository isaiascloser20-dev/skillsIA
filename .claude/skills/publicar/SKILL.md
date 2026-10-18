---
name: publicar
scope: template
description: "Publicar el trabajo en la web del dueño y COMPROBAR que llego. Guarda lo que falte y lanza `npm run publicar`, que lleva la rama de ESTE chat por el recorrido rama -> dev -> main, sube, espera al despliegue y verifica que la web esta sirviendo el codigo nuevo. Activar cuando el dueño dice: publicalo, subelo, ponlo live, sacalo a produccion, mandalo a la web, ya esta listo subelo, /publicar. NUNCA se activa sola: publicar necesita una orden explicita del dueño (REGLA #2 de AGENTS.md)."
allowed-tools: Bash, Read, Grep, Glob
---

# Skill: Publicar

> Sacar a la web lo que esta en local, comprobar que llego, **y no preguntar nada por el camino**.

---

## Antes de nada: ¿hay orden?

**Esta skill SOLO se ejecuta si el dueño lo ha pedido con palabras.** "publicalo", "subelo", "ponlo live" o equivalente.

Si llegaste aqui por iniciativa propia, **para**. Es la REGLA #2 de `AGENTS.md`.

---

## ⚡ PUBLICAR = TODO LO DE ESTE CHAT. NADA SUELTO.

**Regla del sistema:** *"Cuando YO te digo publicar se debe de publicar
TODO, no debe de quedarse nada suelto de lo que se haya hecho en este chat. Y
cerrar, pues cierra TODO. ES SIMPLE."*

Entra **todo** lo hecho en el chat: el codigo, los scripts, los skills, el
Knowledge, `STATE.md`, `BUSINESS_LOGIC.md`.

⚠️ **PROHIBIDO terminar dejando algo sin subir** — ni "esto es solo
documentacion", ni "esto lo subo luego", ni "¿quieres que suba tambien esto?".

⚠️ **Lo que escribas DESPUES de publicar, se publica tambien.** Documenta
primero, publica al final.

---

## ⚡ CERO PREGUNTAS. Son DOS ordenes.

**Regla del sistema:** *"cuando el dueño publique y cuando yo cierre, no
quiero que me pregunte nada. Ya quiero que este todo automatico."*

```bash
# 1 · guardar lo que falte  (mirando la lista, NUNCA `git add .` a ciegas)
git status --short
git add <los archivos de este trabajo>
git commit -m "<titulo corto: que cambia>

<cuerpo: por que, si no se ve solo mirando el codigo>"

# 2 · publicar. Una sola orden. Hace TODO y no pregunta nada.
npm run publicar
```

Eso es la skill entera. Todo lo demas de este archivo es para entender que hace
por dentro y que hacer si falla.

**Si `npm run publicar` se niega porque quedan archivos sin guardar**, te enseña
la lista: guardalos (paso 1) y vuelve a lanzarlo. **No hay tercer paso.**

---

## Que hace `npm run publicar` por dentro

`scripts/publicar.mjs`, en este orden, parando al primer fallo:

| | Paso | Coste |
|---|---|---|
| 1 | Comprueba que no queda nada sin guardar, ni aqui ni en la carpeta principal | instantaneo |
| 2 | Pone `dev` al dia con GitHub (`fetch` + `merge --ff-only`) | ~2 s |
| 3 | Une la rama de ESTE chat a `dev`. Si choca, **deshace la union** y avisa | ~1 s |
| 4 | **La puerta**: `npm run typecheck` + `npm run puerta`, **en paralelo** | **~7 s** |
| 5 | `main` avanza hasta `dev` sin `checkout`, con compare-and-swap | instantaneo |
| 6 | **Un solo push** de `main` y `dev` | ~2 s |
| 7 | Espera a que la web sirva ESE commit (`/api/version`) | 2-3 min |
| 8 | Comprueba ademas que la ruta viva responde 200 | ~1 s |

**La puerta y el dominio los pone el proyecto**, no el script — por eso este
mismo `publicar.mjs` vale igual aqui que en la plantilla madre:

```jsonc
// package.json
"nvision": { "web": "https://app.tu-dominio.com", "rutaViva": "/login" },
"scripts": {
  "typecheck": "tsc --noEmit",
  "puerta": "node scripts/check-loquesea.mjs && ...",   // TUS vigilantes
  "prebuild": "npm run puerta"                          // una sola fuente
}
```

⚠️ **En `puerta` NUNCA van los vigilantes de disciplina LOCAL** (el que mira las
carpetas de chat, el que mira si `dev` esta al dia). Esos viven en `predev`.
Meterlos aqui tumba publicaciones legitimas: paso el 2026-07-30 con
`check:flujo` en `prebuild` (Knowledge `ia-vigilante-de-disciplina-local-nunca-en-prebuild`).

**Si la puerta (4) falla, DESHACE la union**: `dev` no se queda roto.
**Si otro chat movio `dev` mientras tanto, NO deshace nada** y avisa: no se pisa
trabajo ajeno.

### Lo que YA NO hace, y por que

**No monta la web en local.** Ese `npm run build` costaba **5 min 16 s medidos**
(NVISION, 2026-08-05) y es EL MISMO que Vercel hace despues en sus maquinas en
**150-170 s**. Se hacia dos veces y la lenta era la de casa. Y si falla en
Vercel, **la web se queda como estaba**: no se rompe nada.

Lo que de verdad atrapa un fallo antes de subir son los tipos y los vigilantes:
**7 segundos**. Eso es la puerta.

**No cierra la carpeta del chat.** Publicar no es terminar: despues de publicar
se puede seguir trabajando. Cerrar la carpeta es cosa de `npm run cerrar`.

### Prueba sin tocar la web

```bash
npm run publicar -- --ensayo    # hace TODO menos subir, y lo deshace
```

---

## Por que ya no pide permisos

En `.claude/settings.json`, la lista `ask` se quedo **solo** con lo que de
verdad destruye (`git push --force`, `supabase db push`) — y este flujo no usa
ninguna de las dos.

Es lo unico que hacia falta: el modo Bypass de Claude Code *"salta todas las
preguntas **excepto las forzadas por reglas `ask` explicitas**"*, y `ask` gana a
`allow`. Con `git push`, `vercel` y `npx vercel` en esa lista, publicar
preguntaba **3 veces, siempre**, aunque el Bypass estuviera puesto.

⚠️ **Si alguien vuelve a meter `Bash(git push:*)` en `ask`, las 3 preguntas
vuelven.** No es un fallo del programa: es esa lista.

---

## Reglas duras

1. **Sin orden del dueño, no se publica.** Ni "de paso", ni "ya que estaba".
2. **Siempre por `dev`.** Nunca de la rama directo a `main`. El script lo impone.
3. **Nunca `git add .` a ciegas.** Mirar la lista. Lo que no sea de este trabajo se queda fuera **y se avisa**.
4. **Nunca incluir secretos** (`.env`, `.env.local`, `.mcp.json`, `*.pem`, `*.key`).
5. **Nunca `--force`.** Reescribe la historia y puede borrar trabajo de otro chat.
6. **Un fallo de la puerta NO rompe la web.** La web se queda como estaba. Decirselo al dueño para que no se asuste.
7. **"Publicado" solo se dice cuando el script lo dice.** El paso 7 es el que manda, no el push.
8. **Terminar SIEMPRE con el enlace** a la pantalla que cambio — el comando imprime el dominio. Sin enlace, el mensaje esta incompleto.

---

## Errores ya cometidos (auto-blindaje)

| Error | Que hacer |
|---|---|
| **Preguntar 3 veces en cada publicacion, con el Bypass puesto** | Es la lista `ask` de `.claude/settings.json`, no el programa. Solo `--force` y `supabase db push` |
| **Montar la web en local antes de subir (5 min 16 s tirados)** | Lo hace Vercel. La puerta local son 7 s: tipos + vigilantes |
| **`npm run typecheck` no existia y el skill lo llamaba** | Ya existe (`tsc --noEmit`). Cada publicacion gastaba un turno en un error |
| **Publicar en ~12 ordenes sueltas** | Una sola: `npm run publicar`. Cada ida y vuelta al modelo costaba mas que el propio git |
| **Publicar cerraba la carpeta del chat** | Ya no. Publicar no es terminar; eso es `npm run cerrar` |
| Unir la rama directo a `main`, saltandose `dev` | El script lo impone: `rama → dev → main` |
| Subir solo `main` y dejar `dev` atras | Un solo push con las dos |
| Tocar la rama de otro chat | Solo la de este chat |
| Decir "publicado" justo despues del push | El script espera a que la web sirva ESE commit |
| Dar por hecho que el dominio responde | Se comprueba `/api/version` **y** la ruta viva |
| **Meter un vigilante de disciplina local en la puerta** | Esos van en `predev`. En la puerta tumban publicaciones buenas |

**Caso real (2026-07-25 → 2026-07-30):** la regla "toda rama nace de `dev`" se
escribio en `AGENTS.md` pero **este skill no nombraba `dev` ni una vez**.
Durante un mes cada publicacion fue rama → `main`. Una regla sin la maquina que
la ejecuta no se cumple sola. **Hoy la maquina es `scripts/publicar.mjs`.**
