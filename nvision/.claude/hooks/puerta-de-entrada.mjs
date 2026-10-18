#!/usr/bin/env node
/**
 * LA PUERTA DE ENTRADA · la red que hace obligatorio el disparador.
 *
 * Se engancha como `PreToolUse` sobre Edit / Write / NotebookEdit y BLOQUEA la
 * escritura cuando el chat no ha hecho lo que tenia que hacer al empezar:
 *
 *   1. Abrir SU carpeta y SU rama          →  npm run chat:nuevo <nombre>
 *   2. Escribir el PRP y esperar el OK     →  .claude/PRPs/<rama>.md · estado: aprobado
 *
 * POR QUE EXISTE
 * Las dos reglas llevaban meses escritas y no se cumplian, porque no habia
 * ninguna maquina que las ejecutara: dependian de que la IA se acordara.
 * Verificado el 2026-08-05: el unico vigilante (`check-flujo`) corre solo en
 * `predev` y solo salta si estas en la carpeta principal con una rama que NO es
 * `dev`. Trabajar en la principal con `dev` puesta —el estado normal— no
 * disparaba nada, y un chat que nunca arranca el servidor no lo ejecutaba jamas.
 * Esa misma sesion trabajo en la carpeta principal sin que nadie dijera nada.
 *
 * el dueño: "Tiene que ser obligatorio."
 *
 * QUE NO BLOQUEA NUNCA
 *   · lo que esta fuera del proyecto (scratchpad, memoria, la plantilla madre)
 *   · los propios `.claude/PRPs/**` — si no, seria imposible escribir el PRP
 *   · leer, buscar, investigar: esto solo mira la ESCRITURA
 *
 * Ante la duda, DEJA PASAR. Un vigilante que bloquea trabajo bueno se acaba
 * apagando, y entonces no vigila nada.
 */

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, sep, join, basename } from 'node:path'

/* ── entrada ────────────────────────────────────────────────────────── */

let entrada = ''
try {
  entrada = readFileSync(0, 'utf8')
} catch {
  process.exit(0) // sin datos: no es asunto nuestro
}

let evento
try {
  evento = JSON.parse(entrada)
} catch {
  process.exit(0)
}

const dejarPasar = () => process.exit(0)

const bloquear = (motivo) => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: motivo,
      },
    })
  )
  process.exit(0)
}

/* ── que archivo se quiere tocar ────────────────────────────────────── */

const ti = evento.tool_input || {}
const destino = ti.file_path || ti.notebook_path || ti.path
if (!destino || typeof destino !== 'string') dejarPasar()

const ruta = resolve(destino)

/* ── donde vive el proyecto ─────────────────────────────────────────── */

const git = (args, cwd) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

// El script vive en <proyecto>/.claude/hooks/, asi que el proyecto esta dos
// carpetas arriba. Es fiable aunque el enganche se dispare desde otra carpeta.
const AQUI = resolve(new URL('.', import.meta.url).pathname, '..', '..')

const crudo = git(['worktree', 'list', '--porcelain'], AQUI)
if (!crudo) dejarPasar() // sin git no hay nada que vigilar

const carpetas = []
{
  let actual = {}
  for (const l of crudo.split('\n')) {
    if (l.startsWith('worktree ')) actual = { ruta: resolve(l.slice(9)) }
    else if (l.startsWith('branch ')) {
      actual.rama = l.slice(7).replace('refs/heads/', '')
      carpetas.push(actual)
    } else if (l === '') actual = {}
  }
}
if (!carpetas.length) dejarPasar()

const principal = carpetas[0]
const dentroDe = (padre, hijo) => hijo === padre || hijo.startsWith(padre + sep)

/* ── 0 · fuera del proyecto: nunca se bloquea ───────────────────────── */

const suCarpeta = carpetas.find((c) => dentroDe(c.ruta, ruta))
if (!suCarpeta) dejarPasar()

/* ── 1 · en la carpeta principal NO se trabaja ──────────────────────── */

if (suCarpeta.ruta === principal.ruta) {
  bloquear(
    'BLOQUEADO · estas escribiendo en la CARPETA PRINCIPAL del proyecto.\n\n' +
      `   ${ruta}\n\n` +
      'Ahi no se trabaja: es de donde nacen las ramas de los chats. Dos chats\n' +
      'trabajando ahi se pisan los archivos a media frase.\n\n' +
      'QUE HACER, en este orden:\n' +
      '  1. npm run chat:nuevo <nombre-corto-de-lo-que-vas-a-hacer>\n' +
      '  2. Escribe el PRP en esa carpeta: .claude/PRPs/<nombre>.md\n' +
      '  3. Presentaselo al dueño y ESPERA su OK\n' +
      '  4. Con su OK, pon `estado: aprobado` en el PRP y ya puedes construir\n\n' +
      'A partir del paso 1, escribe siempre con la ruta de TU carpeta.'
  )
}

/* ── 2 · en la carpeta de un chat: hace falta PRP aprobado ──────────── */

const rama = suCarpeta.rama || 'sin-rama'
const nombrePRP = `${basename(rama)}.md`
const rutaPRP = join(suCarpeta.ruta, '.claude', 'PRPs', nombrePRP)

// El propio PRP (y cualquier cosa dentro de PRPs/) siempre se puede escribir:
// si no, no habria manera de crearlo.
if (dentroDe(join(suCarpeta.ruta, '.claude', 'PRPs'), ruta)) dejarPasar()

if (!existsSync(rutaPRP)) {
  bloquear(
    'BLOQUEADO · este chat todavia no tiene un plan aprobado por el dueño.\n\n' +
      `   Falta:  ${rutaPRP}\n\n` +
      'El sistema es: el dueño dice su idea -> se abre la carpeta -> SE ESCRIBE EL PRP\n' +
      '-> se le presenta -> se ESPERA su OK -> y solo entonces se construye.\n\n' +
      'QUE HACER:\n' +
      `  1. Escribe el PRP en ${rutaPRP}\n` +
      '     con esta cabecera:\n\n' +
      `        ---\n        rama: ${rama}\n        estado: propuesto\n        ---\n\n` +
      '  2. Presentaselo al dueño en el chat: objetivo, que vas a hacer, en fases.\n' +
      '  3. Cuando el diga que si, cambia `estado: propuesto` por `estado: aprobado`.\n\n' +
      'Hasta ese momento no se escribe ni una linea de codigo.'
  )
}

const textoPRP = (() => {
  try {
    return readFileSync(rutaPRP, 'utf8')
  } catch {
    return ''
  }
})()

/* ── 2-bis · el PRP tiene que estar COMPLETO ────────────────────────────
 * el dueño no abre el archivo: lo que lee es el mismo texto pegado en el chat,
 * en casillas. Por eso lo que la maquina puede obligar es que el CONTENIDO
 * este completo — si esta completo para ella, esta completo para el.
 *
 * Regla del sistema: "hay veces que no hay una estandarizacion y ese es el
 * problema... Es asi como lo quiero siempre, pero hay veces que no me lo
 * entregas asi."                                                          */

// Los titulos se buscan tolerando tildes, para que un PRP no se bloquee por un
// acento. Se busca SOBRE EL TEXTO ORIGINAL: normalizarlo cambia su longitud y
// los indices dejan de cuadrar (fallo cometido y corregido el 2026-08-05).
const SECCIONES = [
  { titulo: 'Objetivo', patron: /^#{1,4}[ \t]+objetivo\b/im },
  { titulo: 'Qué voy a hacer', patron: /^#{1,4}[ \t]+qu[eé] voy a hacer\b/im },
  { titulo: 'Fases', patron: /^#{1,4}[ \t]+fases\b/im },
  { titulo: 'Qué NO entra', patron: /^#{1,4}[ \t]+qu[eé] no entra\b/im },
  { titulo: 'Cómo lo verás', patron: /^#{1,4}[ \t]+c[oó]mo lo ver[aá]s\b/im },
]

const faltan = SECCIONES.filter((s) => !s.patron.test(textoPRP)).map((s) => s.titulo)

// Las fases van en casillas: es lo que el dueño ve y lo que se va marcando.
// El minimo son 3 CASILLAS en total, no 3 fases: las fases son las que pida el
// trabajo — dos en algo pequeño, ocho en algo grande.
const casillas = (textoPRP.match(/^\s*[-*]\s+\[[ xX]\]/gm) || []).length
if (casillas < 3) faltan.push('Fases con casillas `- [ ]` (hay ' + casillas + ', hacen falta 3+)')

// "Qué NO entra" vacio es el hueco por el que se cuela el trabajo no pedido.
const trozoNoEntra = (() => {
  const m = textoPRP.match(/^#{1,4}[ \t]+qu[eé] no entra\b/im)
  if (!m) return ''
  const resto = textoPRP.slice(m.index + m[0].length)
  const sig = resto.search(/^#{1,4}[ \t]+\S/m)
  return sig < 0 ? resto : resto.slice(0, sig)
})()
if (trozoNoEntra && !/^\s*[-*]\s+\S/m.test(trozoNoEntra)) faltan.push('`Qué NO entra` está vacío')

if (faltan.length) {
  bloquear(
    'BLOQUEADO · el PRP de este chat esta incompleto.\n\n' +
      `   ${rutaPRP}\n\n` +
      'FALTA:\n' +
      faltan.map((f) => `   · ${f}`).join('\n') +
      '\n\n' +
      'El PRP se le PEGA A MARCO EN EL CHAT, entero, en casillas. El archivo es\n' +
      'solo el recibo que lee esta puerta: el no lo abre nunca. Por eso tiene que\n' +
      'estar completo aqui — si esta completo aqui, esta completo para el.\n\n' +
      'PLANTILLA, exactamente estas 5 secciones:\n\n' +
      '   ## Objetivo\n' +
      '   Una o dos frases: que se consigue.\n\n' +
      '   ## Que voy a hacer\n' +
      '   - bullets cortos, sin tecnicismos\n\n' +
      '   ## Fases\n' +
      '   **A · <nombre de la fase>**\n' +
      '   - [ ] paso concreto\n' +
      '   - [ ] paso concreto\n\n' +
      '   ## Que NO entra\n' +
      '   - lo que queda fuera a proposito\n\n' +
      '   ## Como lo veras\n' +
      '   - que va a ver el dueño cuando este hecho\n\n' +
      '⛔ PROHIBIDO responder "lo dejé en tal archivo" o mandarle a abrir un .md.\n' +
      '   Se pega en el mensaje, y se abre el panel de tareas con una entrada por fase.'
  )
}

if (!/^\s*estado:\s*aprobado\s*$/m.test(textoPRP)) {
  const estadoActual = (textoPRP.match(/^\s*estado:\s*(.+)$/m) || [, '(sin estado)'])[1].trim()
  bloquear(
    'BLOQUEADO · el plan de este chat existe pero el dueño todavia NO lo ha aprobado.\n\n' +
      `   ${rutaPRP}\n` +
      `   estado actual: ${estadoActual}\n\n` +
      'Presentaselo al dueño en el chat y ESPERA su respuesta. Cuando diga que si,\n' +
      'pon `estado: aprobado` en la cabecera del PRP y podras construir.\n\n' +
      'PROHIBIDO ponerlo tu por iniciativa: el OK es suyo, no tuyo.'
  )
}

dejarPasar()
