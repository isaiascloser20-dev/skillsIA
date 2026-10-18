#!/usr/bin/env node
/**
 * check:flujo — vigilante de EL WORKFLOW (dev → rama → dev → main).
 *
 * POR QUE EXISTE
 * El 2026-07-25 se escribio en AGENTS.md una linea: "toda rama de feature/fix
 * nace de `dev`". Nadie construyo la pieza que la ejecuta: el skill /publicar
 * unia la rama directo a `main` y no nombraba `dev` ni una vez. Resultado:
 * `dev` nacio ese dia y no recibio NADA en un mes entero. El primer commit
 * que le faltaba era, literalmente, la regla que la creo.
 *
 * Y ademas, los 4 sitios que explican como se trabaja decian cosas distintas:
 * los manuales del Eter enseñaban 4 sitios SIN `dev`, y GitFlow_Explicado.md
 * afirmaba que produccion se despliega con `vercel --prod` (falso desde el
 * 2026-07-25).
 *
 * La leccion: una regla escrita en un documento no se ejecuta sola.
 * Este script es la maquina que la vigila.
 *
 * QUE COMPRUEBA
 *   1. `dev` no se ha quedado atras de `main`.
 *   2. Los skills del flujo (/publicar, /cerrar, /primer) nombran `dev`.
 *   3. Los documentos que explican el flujo dicen todos lo mismo.
 *   4. Nadie ha vuelto a colar afirmaciones ya derogadas.
 *
 * ⚡ VA EN `predev`, NUNCA EN `prebuild`. Vigila la disciplina de la MÁQUINA DE
 * MARCO (en qué carpeta estás, con qué rama puesta). El servidor que despliega
 * no tiene nada de eso: se baja el código en una carpeta suelta con la rama
 * `master`, así que el vigilante SIEMPRE se dispara y tumba el despliegue.
 * Pasó dos veces: producción se quedó servidando una versión vieja durante
 * horas mientras los `push` salían bien. Knowledge:
 * `ia-vigilante-de-disciplina-local-nunca-en-prebuild`.
 */

import { readFileSync, existsSync, realpathSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, basename } from 'node:path'

// Red de seguridad: aunque alguien lo vuelva a enganchar al build, en un
// servidor de despliegue se aparta en vez de tumbarlo.
if (process.env.VERCEL || process.env.CI) {
  console.log('· check:flujo — servidor de despliegue: no aplica (vigila la máquina del dueño).')
  process.exit(0)
}

const RAIZ = process.cwd()
const problemas = []

const leer = (p) => (existsSync(join(RAIZ, p)) ? readFileSync(join(RAIZ, p), 'utf8') : null)
const git = (cmd) => {
  try {
    return execSync(`git ${cmd}`, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

/* 1 · dev no puede quedarse atras de main ------------------------------- */

const avisos = []
const hayDev = git('rev-parse --verify dev') !== null
if (hayDev) {
  const atras = git('rev-list --count dev..main')
  if (atras && Number(atras) > 0) {
    problemas.push(
      `\`dev\` esta ${atras} commit(s) por detras de \`main\`.\n` +
        `   Toda rama nueva nace de \`dev\`: si esta atrasada, nace de una foto vieja.\n` +
        `   Arreglo: git checkout dev && git merge main --ff-only && git checkout -`
    )
  }
} else if (git('rev-parse --verify HEAD') !== null) {
  // Proyecto recien clonado: todavia no tiene `dev`. Se avisa, NO se bloquea:
  // tumbar el primer build de alguien que acaba de empezar es un estorbo.
  avisos.push(
    `Todavia no existe la rama \`dev\`, y EL WORKFLOW la necesita (dev → rama → dev → main).\n` +
      `   Crearla es un segundo:  git branch dev main`
  )
}

/* 0 · NO SE TRABAJA EN LA CARPETA PRINCIPAL ------------------------------ */

// Esta es LA guardia del modelo. `/primer` dice "abre tu carpeta con chat:nuevo",
// pero eso es una instruccion escrita: depende de que la IA la lea y la obedezca.
// Aqui esta la maquina. En la carpeta principal SOLO puede estar `dev`: es el punto
// del que nacen las ramas, no un sitio de trabajo. Si hay otra rama puesta, es que
// un chat se puso a trabajar ahi en vez de abrir la suya, y ese chat se va a pisar
// con los demas.
//
// Corre en `predev`, asi que salta en cuanto alguien intenta arrancar el servidor
// donde no debe.

const wtCrudo = git('worktree list --porcelain') || ''
const worktrees = []
{
  let actual = {}
  for (const l of wtCrudo.split('\n')) {
    if (l.startsWith('worktree ')) actual = { ruta: l.slice(9) }
    else if (l.startsWith('branch ')) {
      actual.rama = l.slice(7).replace('refs/heads/', '')
      worktrees.push(actual)
    } else if (l === '') actual = {}
  }
}
const principal = worktrees[0]
const esPrincipal = principal && realpathSync(principal.ruta) === realpathSync(RAIZ)
const ramaAqui = git('rev-parse --abbrev-ref HEAD')

if (esPrincipal && ramaAqui && ramaAqui !== 'dev') {
  problemas.push(
    `Estas trabajando en la CARPETA PRINCIPAL, con la rama \`${ramaAqui}\` puesta.\n` +
      `   Aqui NO se trabaja: es de donde nacen las ramas de los chats.\n` +
      `   Dos chats aqui se pisan — uno le cambia los archivos al otro a media frase.\n\n` +
      `   Arreglo, un comando:\n` +
      `     npm run chat:nuevo <nombre-corto-de-lo-que-haces>\n\n` +
      `   Eso abre TU carpeta con TU rama, y trabajas ahi sin pisar a nadie.\n` +
      `   Si ya tenias trabajo hecho en esta rama, no se pierde: sigue en \`${ramaAqui}\`,\n` +
      `   y desde tu carpeta nueva la unes cuando quieras.`
  )
}

/* 1-bis · carpetas de chat huerfanas ------------------------------------ */

// Un chat = una rama = una carpeta. Si un chat se cerro mal, su carpeta se
// queda ahi. No es un error (no se pierde nada), pero hay que recogerla.
const chats = worktrees.slice(1).filter((w) => w.rama && !['dev', 'main'].includes(w.rama))
const huerfanas = chats.filter((w) => {
  const pendiente = git(`log --oneline dev..${w.rama}`)
  return pendiente === '' // su trabajo ya esta en dev → se puede recoger
})
if (huerfanas.length > 0) {
  avisos.push(
    `Hay ${huerfanas.length} carpeta(s) de chat ya publicadas sin recoger:\n` +
      huerfanas.map((w) => `      - ${w.ruta}  (${w.rama})`).join('\n') +
      `\n   Recogerlas:  npm run chat:cerrar -- --limpiar`
  )
}

/* 1-ter · carpetas FANTASMA (existen en disco pero no son de nadie) ------ */

// Distinto de las huerfanas de arriba: estas ni siquiera estan registradas como
// carpeta de trabajo. Aparecieron el 2026-08-05 (calendario, calendario-motor,
// calendario-guardado, subida-audio) y NO son restos de un cierre: se crearon
// entre 12 min y 4 h DESPUES de que su chat se cerrara, con solo la huella de un
// `next dev` arrancando dentro. Verificado: `git worktree remove --force` borra
// todo, incluidos `.next` y `node_modules`.
//
// No se ha identificado que las crea. Hasta saberlo, al menos el sistema las VE
// y lo dice, en vez de que el dueño se las encuentre por casualidad.
if (principal) {
  const carpetaDeChats = join(principal.ruta, '..', `${basename(principal.ruta)}-chats`)
  if (existsSync(carpetaDeChats)) {
    const registradas = new Set(worktrees.map((w) => realpathSync(w.ruta)))
    let fantasmas = []
    try {
      fantasmas = readdirSync(carpetaDeChats, { withFileTypes: true })
        .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
        .map((e) => join(carpetaDeChats, e.name))
        .filter((p) => {
          try {
            return !registradas.has(realpathSync(p))
          } catch {
            return false
          }
        })
    } catch {
      /* si no se puede leer, no se avisa de nada */
    }
    if (fantasmas.length) {
      avisos.push(
        `Hay ${fantasmas.length} carpeta(s) FANTASMA en ${carpetaDeChats}:\n` +
          fantasmas
            .map((p) => {
              let nacida = '?'
              try {
                nacida = statSync(p).birthtime.toISOString().slice(0, 16).replace('T', ' ')
              } catch {
                /* sin fecha */
              }
              return `      - ${basename(p)}   (creada ${nacida})`
            })
            .join('\n') +
          `\n   No son de ningun chat: git no las conoce. Algo las creo despues de cerrar.\n` +
          `   No estorban, pero avisa al dueño antes de tocarlas.`
      )
    }
  }
}

/* 2 · el flujo tiene que estar en alguna MAQUINA, no solo en la prosa ---- */

// Antes esto contaba cuantas veces el TEXTO de cada skill decia "dev". Servia
// cuando el flujo vivia escrito en el propio SKILL.md. Desde que la mecanica se
// movio a `scripts/publicar.mjs` y `scripts/cerrar.mjs`, el texto ya no lo dice
// —lo hace el script— y el vigilante daba un FALSO POSITIVO que tumbaba
// `npm run dev`. Paso el 2026-08-05.
//
// Lo que importa no es que el texto lo nombre: es que EXISTA la maquina y el
// skill mande a ella. Eso es lo que se comprueba ahora.
const PIEZAS = [
  { skill: 'publicar', maquina: 'scripts/publicar.mjs', orden: 'npm run publicar' },
  { skill: 'cerrar', maquina: 'scripts/cerrar.mjs', orden: 'npm run cerrar' },
]

for (const { skill, maquina, orden } of PIEZAS) {
  const texto = leer(`.claude/skills/${skill}/SKILL.md`)
  if (texto === null) continue // el skill puede no existir en un proyecto concreto

  const codigo = leer(maquina)
  if (codigo === null) {
    // Sin maquina, el flujo tiene que estar en el texto del skill (modelo viejo).
    const menciones = (texto.match(/\bdev\b/g) || []).length
    if (menciones < 3) {
      problemas.push(
        `El skill \`/${skill}\` no nombra \`dev\` (${menciones} veces) y tampoco existe \`${maquina}\`.\n` +
          `   El flujo tiene que vivir en alguna parte: o en el texto del skill, o en su script.\n` +
          `   Fue exactamente el fallo del 2026-07-25 (/publicar unia la rama directo a main).`
      )
    }
    continue
  }

  if (!texto.includes(orden)) {
    problemas.push(
      `El skill \`/${skill}\` no manda a su maquina.\n` +
        `   Existe \`${maquina}\`, pero el skill no dice \`${orden}\` en ningun sitio.\n` +
        `   Un skill que explica el flujo a mano en vez de llamar a su script se desincroniza.`
    )
  }
  // La maquina tiene que HACER el recorrido, o delegar en la que lo hace.
  // `cerrar.mjs` no nombra `dev`: llama a `publicar.mjs`, que es quien lo hace.
  // Contar palabras aqui seria repetir el mismo error que este bloque arregla.
  const loHace = (codigo.match(/\bdev\b/g) || []).length >= 3
  const loDelega = /publicar\.mjs/.test(codigo)
  if (!loHace && !loDelega) {
    problemas.push(
      `\`${maquina}\` ni ejecuta el recorrido \`rama → dev → main\` ni delega en quien lo hace.\n` +
        `   O nombra \`dev\` y lo recorre, o llama a \`scripts/publicar.mjs\`.`
    )
  }
}

// `/primer` sigue siendo texto puro: ahi si tiene que estar escrito.
{
  const t = leer('.claude/skills/primer/SKILL.md')
  if (t !== null && (t.match(/\bdev\b/g) || []).length < 3) {
    problemas.push(
      '`/primer` casi no nombra `dev`.\n' +
        '   Es lo primero que lee la IA en cada chat: ahi tiene que estar el recorrido entero.'
    )
  }
}

/* 2-bis · la puerta de entrada tiene que estar enchufada ---------------- */

// La regla "un chat = una carpeta" y la regla "el PRP se aprueba antes de
// construir" llevaban meses escritas y no se cumplian, porque dependian de que
// la IA se acordara. La maquina que las obliga es el enganche.
{
  const enganche = leer('.claude/hooks/puerta-de-entrada.mjs')
  const ajustes = leer('.claude/settings.json')
  if (enganche === null) {
    problemas.push(
      'Falta `.claude/hooks/puerta-de-entrada.mjs`.\n' +
        '   Es lo unico que impide trabajar en la carpeta principal o sin PRP aprobado.'
    )
  } else if (ajustes === null || !ajustes.includes('puerta-de-entrada.mjs')) {
    problemas.push(
      'La puerta de entrada existe pero NO esta enchufada en `.claude/settings.json`.\n' +
        '   Sin el enganche `PreToolUse`, el archivo esta ahi de adorno y no bloquea nada.'
    )
  }
}

/* 3 · los documentos del flujo dicen todos lo mismo ---------------------- */

// Solo las reglas y los .md del Entrenamiento del Eter (los 3 productos que
// explican como se trabaja) + GitFlow_Explicado. Los manuales viejos de Vibe
// Coding (`Manual_VibeCoding_*`, `Manual_Git_NVISION`) NO entran: el pack del
// Eter los reemplazo y no son la fuente de nada.
const DOCS = ['AGENTS.md']
for (const d of DOCS) {
  const t = leer(d)
  if (t === null) continue
  if (!/\bdev\b/.test(t)) {
    problemas.push(
      `\`${d}\` explica como se trabaja pero NO menciona \`dev\`.\n` +
        `   Todos los documentos del flujo tienen que decir lo mismo: dev → rama → dev → main.`
    )
  }
}

/* 4 · afirmaciones ya derogadas ----------------------------------------- */

const DEROGADO = [
  { patron: /vercel --prod/i, que: 'produccion NO se despliega con `vercel --prod` (derogado el 2026-07-25: se publica subiendo a `main`)' },
  { patron: /directo a `?main`?/i, que: 'nada va directo a `main`: siempre pasa por `dev`' },
]
for (const d of DOCS) {
  const t = leer(d)
  if (t === null) continue
  for (const { patron, que } of DEROGADO) {
    // se permite si va acompañado de PROHIBIDO / NUNCA / derogad* en la misma linea
    const lineas = t.split('\n').filter((l) => patron.test(l) && !/PROHIBID|NUNCA|derogad|Prohibido|jamas|jamás/i.test(l))
    if (lineas.length) {
      problemas.push(`\`${d}\` dice algo ya derogado: ${que}\n   Linea: "${lineas[0].trim().slice(0, 110)}"`)
    }
  }
}

/* ----------------------------------------------------------------------- */

if (problemas.length > 0) {
  console.error('\n\x1b[31m✗ check:flujo — EL WORKFLOW no se esta cumpliendo\x1b[0m\n')
  problemas.forEach((p, i) => console.error(`   ${i + 1}. ${p}\n`))
  console.error(
    '   EL WORKFLOW: dev → rama → dev → main → la web.\n' +
      '   Fuente: AGENTS.md · Knowledge `ia-workflow-rama-dev-main` · sprint FLUJO.\n'
  )
  process.exit(1)
}

if (avisos.length > 0) {
  console.warn('\n\x1b[33m! check:flujo — aviso\x1b[0m\n')
  avisos.forEach((a) => console.warn(`   ${a}\n`))
}

console.log('✓ check:flujo — skills y documentos coherentes con EL WORKFLOW.')
