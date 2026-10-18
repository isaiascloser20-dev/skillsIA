#!/usr/bin/env node
/**
 * npm run cerrar
 *
 * Cierra ESTE chat de una sola vez y sin preguntar nada:
 *
 *   publicar TODO  ->  cerrar la carpeta y la rama de este chat  ->  informe
 *
 * Decir "cierra" YA ES la orden de publicar. Nunca termina con un
 * "queda esto sin publicar, lo subo?" (Knowledge `ia-cerrado-es-cerrar-todo-sin-preguntar`).
 *
 * Lo que se escribe en el cierre (Knowledge, STATE.md, BUSINESS_LOGIC.md) se
 * escribe y se GUARDA antes de llamar aqui: asi entra en la misma publicacion
 * y no se queda fuera de la web.
 *
 * Las carpetas y ramas de los OTROS chats no se tocan.
 */

import { execFileSync, spawnSync } from 'node:child_process'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = process.cwd()
const AQUI = dirname(fileURLToPath(import.meta.url))
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

function worktrees(cwd = RAIZ) {
  const salida = gitOk(['worktree', 'list', '--porcelain'], cwd) || ''
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

const hojas = worktrees()
if (!hojas.length) {
  console.error(`\n${C.rojo}✗ Esto no parece un repositorio de git.${C.fin}\n`)
  process.exit(1)
}
const principal = hojas[0].ruta
const enUnChat = resolve(RAIZ) !== resolve(principal)
const nombreChat = enUnChat ? basename(RAIZ) : null

/* ── 1 · publicar TODO ──────────────────────────────────────────────── */
const publicado = spawnSync(process.execPath, [`${AQUI}/publicar.mjs`], {
  cwd: RAIZ,
  stdio: 'inherit',
})
if (publicado.status !== 0) {
  console.error(`\n${C.rojo}✗ NO cierres todavia.${C.fin} El cierre paro al publicar (arriba esta el motivo).\n`)
  process.exit(1)
}

/* ── 2 · cerrar la carpeta y la rama de ESTE chat ───────────────────── */
if (enUnChat) {
  // Se ejecuta DESDE la carpeta principal: la que se borra es esta, y un
  // proceso no puede seguir trabajando dentro de una carpeta que ya no existe.
  const cerrado = spawnSync(process.execPath, [`${AQUI}/chat-cerrar.mjs`, nombreChat], {
    cwd: principal,
    stdio: 'inherit',
  })
  if (cerrado.status !== 0) {
    console.error(`\n${C.rojo}✗ Publicado, pero la carpeta del chat no se pudo cerrar${C.fin} (motivo arriba).\n`)
    process.exit(1)
  }
} else {
  console.log(`\n  ${C.gris}·${C.fin} Este chat trabajaba en la carpeta principal: no hay carpeta que cerrar.`)
}

/* ── 3 · que queda en marcha ────────────────────────────────────────── */
const otros = worktrees(principal).slice(1)

console.log(`\n${C.verde}✓ Cerrado.${C.fin} Ya puedes cerrar el chat.\n`)
console.log(`  Publicado:  todo lo de este chat, y la web lo esta sirviendo`)
console.log(`  Este chat:  ${enUnChat ? `carpeta y rama fuera (${nombreChat})` : 'no tenia carpeta propia'}`)
if (otros.length) {
  console.log(`  Otros ${otros.length} chat(s) abiertos, los dejo como estan:`)
  for (const o of otros) {
    const ultimo = gitOk(['log', '--oneline', '-1', o.rama], principal) || ''
    console.log(`      · ${basename(o.ruta).padEnd(22)} ${o.rama.padEnd(26)} ${ultimo.slice(0, 60)}`)
  }
} else {
  console.log(`  Otros:      ninguno, no queda ningun chat abierto`)
}
console.log('')
