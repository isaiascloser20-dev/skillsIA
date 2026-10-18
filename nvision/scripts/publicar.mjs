#!/usr/bin/env node
/**
 * npm run publicar
 *
 * Saca a la web el trabajo de ESTE chat, de una sola vez y sin preguntar nada.
 *
 *   dev al dia -> unir la rama -> puerta (tipos + vigilantes)
 *   -> un solo push -> esperar a que la web sirva el commit nuevo -> informe
 *
 * NO monta la web en local. Ese `next build` costaba 5 min 16 s medidos y es
 * EL MISMO que Vercel hace despues en sus maquinas en 150-170 s. Y si alli
 * falla, la web se queda como estaba: no se rompe nada. La puerta local
 * comprueba en ~7 s lo unico que de verdad atrapa un fallo antes de subir:
 * los tipos (`tsc --noEmit`) y los vigilantes del proyecto.
 *
 * Si la puerta falla, DESHACE la union para no dejar `dev` roto.
 *
 * Esta orden NO cierra la carpeta del chat: publicar no es terminar.
 * Para publicar Y cerrar: `npm run cerrar`.
 */

import { execFileSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/* ── donde vive la web ──────────────────────────────────────────────────
 * Se lee del propio proyecto, no se escribe aqui: este archivo es el MISMO
 * en NVISION y en la plantilla madre.
 *
 *   package.json  ->  "nvision": { "web": "https://app.tu-dominio.com" }
 *
 * Sin dominio, publica igual y avisa de que no puede comprobar que llego.  */
const paquete = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'))
const DOMINIO = (process.env.PUBLICAR_DOMINIO || paquete.nvision?.web || '').replace(/\/$/, '')
const RUTA_VERSION = '/api/version' // devuelve { version: <sha corto> }
const RUTA_VIVA = paquete.nvision?.rutaViva || '/login' // ruta publica que debe dar 200
const ESPERA_MAX_MS = 10 * 60 * 1000

/* ── la puerta ──────────────────────────────────────────────────────────
 * Lo que tiene que pasar ANTES de subir. Cada proyecto la define en su
 * package.json, y solo se lanza lo que exista:
 *
 *   "typecheck": "tsc --noEmit"
 *   "puerta":    "node scripts/check-loquesea.mjs && ..."
 *
 * ⚠️ En `puerta` NUNCA van los vigilantes de disciplina LOCAL (el que mira
 * las carpetas de chat, el que mira si `dev` esta al dia). Esos viven en
 * `predev`. Meterlos aqui tumba publicaciones legitimas — ya paso el
 * 2026-07-30 con `check:flujo` en `prebuild`.                            */
const PUERTA = ['typecheck', 'puerta'].filter((s) => paquete.scripts?.[s])

/* ── utiles ─────────────────────────────────────────────────────────── */
const RAIZ = process.cwd()
const T0 = Date.now()
/** `--ensayo`: hace TODO menos subir. Sirve para probar el camino entero
 *  (unir, puerta, `main` al dia) sin tocar la web. Al terminar lo deshace. */
const ENSAYO = process.argv.includes('--ensayo')

const C = { rojo: '\x1b[31m', verde: '\x1b[32m', gris: '\x1b[90m', fin: '\x1b[0m' }

const git = (args, cwd = RAIZ) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const gitOk = (args, cwd = RAIZ) => {
  try {
    return git(args, cwd)
  } catch {
    return null
  }
}

const gitIntenta = (args, cwd = RAIZ) => {
  try {
    return { ok: true, salida: git(args, cwd) }
  } catch (e) {
    return { ok: false, salida: `${e.stdout ?? ''}${e.stderr ?? ''}`.trim() }
  }
}

const paso = (txt) => console.log(`  ${C.gris}·${C.fin} ${txt}`)
const morir = (msg, detalle) => {
  console.error(`\n${C.rojo}✗ No se publico.${C.fin} La web sigue como estaba, no se rompio nada.`)
  console.error(`\n  ${msg}`)
  if (detalle) console.error(`\n${C.gris}${detalle.split('\n').slice(0, 25).join('\n')}${C.fin}`)
  console.error('')
  process.exit(1)
}
const duracion = () => {
  const s = Math.round((Date.now() - T0) / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

/** Lanza un comando y devuelve { nombre, code, salida }. */
const correr = (nombre, cmd, args, cwd) =>
  new Promise((res) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'], shell: false })
    let salida = ''
    p.stdout.on('data', (d) => (salida += d))
    p.stderr.on('data', (d) => (salida += d))
    p.on('error', (e) => res({ nombre, code: 1, salida: String(e) }))
    p.on('close', (code) => res({ nombre, code, salida }))
  })

/** Las carpetas de trabajo: [{ruta, rama}] · la [0] es la principal. */
function worktrees() {
  const salida = gitOk(['worktree', 'list', '--porcelain']) || ''
  const out = []
  let actual = {}
  for (const l of salida.split('\n')) {
    if (l.startsWith('worktree ')) actual = { ruta: l.slice(9) }
    else if (l.startsWith('branch ')) {
      actual.rama = l.slice(7).replace('refs/heads/', '')
      out.push(actual)
    } else if (l === '') actual = {}
  }
  return out
}

/* ── 0 · donde estamos ──────────────────────────────────────────────── */
console.log('')
const hojas = worktrees()
if (!hojas.length) morir('Esto no parece un repositorio de git.')
const principal = hojas[0].ruta
const rama = gitOk(['branch', '--show-current'])

if (!rama) morir('Esta carpeta no tiene ninguna rama puesta.')
if (rama === 'main') morir('Estas en `main`. En `main` no se trabaja: solo recibe lo terminado.')

const sucio = gitOk(['status', '--porcelain'])
if (sucio) {
  morir(
    `Hay ${sucio.split('\n').length} archivo(s) SIN GUARDAR en esta carpeta.\n` +
      '  Guardalos primero (mirando la lista, nunca `git add .` a ciegas):\n\n' +
      sucio
        .split('\n')
        .map((l) => `      ${l}`)
        .join('\n')
  )
}

/* ── 1 · `dev` al dia ───────────────────────────────────────────────── */
paso('Poniendo `dev` al dia')

const ramaPrincipal = gitOk(['branch', '--show-current'], principal)
if (ramaPrincipal !== 'dev') {
  morir(
    `La carpeta principal tiene puesta \`${ramaPrincipal}\`, no \`dev\`.\n` +
      '  En la carpeta principal SOLO puede estar `dev`. Ponla y vuelve a intentarlo.'
  )
}
// Solo lo que git ya sigue: un archivo modificado ahi SI estorbaria al unir.
// Los archivos sueltos que nadie ha guardado nunca (`??`) no tocan nada, y
// siempre hay alguno: bloquear por ellos haria imposible publicar.
const sucioPrincipal = gitOk(['status', '--porcelain', '--untracked-files=no'], principal)
if (sucioPrincipal) {
  morir(
    'La carpeta principal tiene cambios sin guardar sobre `dev`. No se toca `dev` con trabajo suelto encima:\n\n' +
      sucioPrincipal
        .split('\n')
        .map((l) => `      ${l}`)
        .join('\n')
  )
}

const traido = gitIntenta(['fetch', 'origin', '--quiet'], principal)
if (!traido.ok) morir('No pude conectar con GitHub.', traido.salida)

if (gitOk(['rev-parse', '--verify', '--quiet', 'origin/dev'], principal)) {
  const alDia = gitIntenta(['merge', '--ff-only', 'origin/dev'], principal)
  if (!alDia.ok) {
    morir(
      'El `dev` de aqui y el de GitHub se han separado. Alguien publico algo\n' +
        '  que este `dev` no tiene, o al reves. Hay que resolverlo a mano antes de publicar.',
      alDia.salida
    )
  }
}

/* ── 2 · unir la rama de este chat ──────────────────────────────────── */
const antesDeUnir = git(['rev-parse', 'HEAD'], principal)
let seUnio = false

if (rama !== 'dev') {
  const pendientes = gitOk(['log', '--oneline', `dev..${rama}`], principal)
  if (!pendientes) {
    paso(`\`${rama}\` no tiene nada nuevo que \`dev\` no tenga ya`)
  } else {
    paso(`Uniendo \`${rama}\` a \`dev\` (${pendientes.split('\n').length} cambio(s))`)
    const union = gitIntenta(['merge', '--no-edit', rama], principal)
    if (!union.ok) {
      gitIntenta(['merge', '--abort'], principal)
      morir(
        `Choque al unir \`${rama}\` con \`dev\`. La union se deshizo sola.\n` +
          '  Otro chat toco los mismos archivos. Hay que resolverlo a mano en `dev`.',
        union.salida
      )
    }
    seUnio = true
  }
}
/** Donde quedo `dev` justo despues de unir. Si cambia, es que otro chat metio
 *  algo por medio: entonces NO se deshace nada, para no pisar su trabajo. */
const trasUnir = seUnio ? git(['rev-parse', 'HEAD'], principal) : null

const deshacerUnion = () => {
  if (!seUnio) return
  if (gitOk(['rev-parse', 'HEAD'], principal) !== trasUnir) {
    console.error(
      `  ${C.gris}(otro chat ha movido \`dev\` mientras tanto: NO lo toco. Revisa \`dev\` a mano)${C.fin}`
    )
    return
  }
  gitIntenta(['reset', '--hard', antesDeUnir], principal)
  console.error(`  ${C.gris}(la union con \`dev\` se ha deshecho: \`dev\` queda como estaba)${C.fin}`)
}

/* ── 3 · la puerta · todo a la vez ──────────────────────────────────── */
if (!PUERTA.length) {
  paso('Puerta: este proyecto no define `typecheck` ni `puerta` — no hay nada que comprobar')
} else {
  paso(`Puerta: ${PUERTA.join(' + ')}`)
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const resultados = await Promise.all(
    PUERTA.map((s) => correr(s, npm, ['run', '--silent', s], principal))
  )
  const fallos = resultados.filter((r) => r.code !== 0)
  if (fallos.length) {
    deshacerUnion()
    morir(
      `La puerta paro esto antes de que llegara a la web. Fallo: ${fallos.map((f) => f.nombre).join(', ')}.`,
      fallos.map((f) => `[${f.nombre}]\n${f.salida}`).join('\n\n')
    )
  }
}

/* ── 4 · `main` avanza hasta `dev` (sin checkout) ───────────────────── */
paso('Llevando `main` al dia')

const mainEnUnaCarpeta = hojas.find((h) => h.rama === 'main')
if (mainEnUnaCarpeta) {
  deshacerUnion()
  morir(
    `\`main\` esta puesta en la carpeta ${mainEnUnaCarpeta.ruta}.\n` +
      '  Quitala de ahi: `main` no se trabaja, solo recibe lo terminado.'
  )
}

const mainAntes = gitOk(['rev-parse', 'refs/heads/main'], principal)
if (mainAntes) {
  const esAncestro = gitIntenta(['merge-base', '--is-ancestor', 'main', 'dev'], principal)
  if (!esAncestro.ok) {
    deshacerUnion()
    morir(
      '`main` tiene algo que `dev` no tiene. Alguien publico saltandose `dev`.\n' +
        '  Hay que ponerlo en `dev` primero: `main` solo avanza, nunca diverge.'
    )
  }
}
// Se le pasa el valor viejo: si `main` no es EXACTAMENTE lo que acabamos de
// leer, git se niega. Asi es imposible pisar lo que haya movido otro chat.
const shaCompleto = git(['rev-parse', 'refs/heads/dev'], principal)
const avance = gitIntenta(
  [
    'update-ref',
    '-m',
    'publicar: main avanza hasta dev',
    'refs/heads/main',
    shaCompleto,
    ...(mainAntes ? [mainAntes] : []),
  ],
  principal
)
if (!avance.ok) {
  deshacerUnion()
  morir('`main` se ha movido mientras publicaba. No toco nada. Vuelve a intentarlo.', avance.salida)
}

/* ── ensayo · hasta aqui llega la prueba, y se deshace ──────────────── */
if (ENSAYO) {
  const sha = git(['rev-parse', '--short=7', 'HEAD'], principal)
  if (mainAntes) gitIntenta(['update-ref', 'refs/heads/main', mainAntes, shaCompleto], principal)
  deshacerUnion()
  console.log(`\n${C.verde}✓ Ensayo en verde.${C.fin} Camino entero comprobado, sin tocar la web.`)
  console.log(`\n  Habria publicado:  ${sha}`)
  console.log(`  Puerta:            ${PUERTA.join(' + ') || '(ninguna)'}, en verde`)
  console.log(`  Tardo:             ${duracion()}`)
  console.log(`\n  ${C.gris}(la union con \`dev\` y el avance de \`main\` se han deshecho)${C.fin}\n`)
  process.exit(0)
}

/* ── 5 · un solo push ───────────────────────────────────────────────── */
paso('Subiendo `main` y `dev`')
const subida = gitIntenta(['push', 'origin', 'main', 'dev'], principal)
if (!subida.ok) morir('No se pudo subir a GitHub.', subida.salida)

const sha = git(['rev-parse', '--short=7', 'HEAD'], principal)

/* ── 6 · esperar a que la web sirva ESE commit ──────────────────────── */
if (!DOMINIO) {
  console.log(`\n${C.verde}✓ Subido.${C.fin} ${sha} ya esta en GitHub y el despliegue esta en marcha.`)
  console.log(`\n  ${C.rojo}No puedo comprobar que llegue a la web:${C.fin} este proyecto no dice cual es.`)
  console.log('  Ponlo en package.json y la proxima vez lo compruebo solo:\n')
  console.log(`      "nvision": { "web": "https://app.tu-dominio.com" }\n`)
  console.log(`  Tardo:    ${duracion()}\n`)
  process.exit(0)
}

paso(`Esperando a que la web sirva ${sha}`)

const limite = Date.now() + ESPERA_MAX_MS
let servido = null
let llego = false

while (Date.now() < limite) {
  try {
    const r = await fetch(`${DOMINIO}${RUTA_VERSION}`, {
      cache: 'no-store',
      headers: { 'cache-control': 'no-cache' },
    })
    if (r.ok) {
      const j = await r.json()
      servido = j.version
      if (servido === sha) {
        llego = true
        break
      }
    }
  } catch {
    /* la web puede parpadear a mitad del despliegue: se reintenta */
  }
  process.stdout.write(`${C.gris}.${C.fin}`)
  await dormir(5000)
}
process.stdout.write('\n')

if (!llego) {
  console.error(`\n${C.rojo}✗ Subido, pero la web todavia no sirve el cambio.${C.fin}`)
  console.error(`\n  Esperaba ${sha} y sigue sirviendo ${servido ?? '(no responde)'}.`)
  console.error('  El codigo YA esta en GitHub: mira el despliegue en Vercel.')
  console.error(`\n  ${DOMINIO}\n`)
  process.exit(1)
}

/* ── 7 · y ademas, que responda ─────────────────────────────────────── */
let estado = null
try {
  estado = (await fetch(`${DOMINIO}${RUTA_VIVA}`, { redirect: 'manual' })).status
} catch {
  /* se reporta abajo */
}
if (estado !== 200) {
  console.error(`\n${C.rojo}✗ La web sirve ${sha} pero ${RUTA_VIVA} responde ${estado ?? 'nada'}.${C.fin}\n`)
  process.exit(1)
}

/* ── 8 · informe ────────────────────────────────────────────────────── */
console.log(`\n${C.verde}✓ Publicado.${C.fin} La web ya esta sirviendo el cambio.`)
console.log(`\n  Version:  ${sha}`)
console.log(`  Enlace:   ${DOMINIO}`)
console.log(`  Tardo:    ${duracion()}`)
if (rama !== 'dev') console.log(`\n  La carpeta de este chat sigue abierta. Para cerrarla: npm run cerrar`)
console.log('')
