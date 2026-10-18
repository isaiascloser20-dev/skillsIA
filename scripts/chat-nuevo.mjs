#!/usr/bin/env node
/**
 * npm run chat:nuevo <nombre>
 *
 * Abre el sitio de trabajo de UN chat: su rama (nacida de `dev`) y su carpeta.
 * Las dos cosas en un solo comando, a proposito: si fueran tres pasos, algun
 * dia se harian dos. Asi no se puede hacer a medias.
 *
 * EL WORKFLOW: dev → rama → dev → main → la web.  Un chat = una rama = una carpeta.
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, symlinkSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'

const RAIZ = process.cwd()
const git = (cmd, opts = {}) =>
  execSync(`git ${cmd}`, { cwd: RAIZ, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim()
const gitSilencioso = (cmd) => {
  try {
    return git(cmd)
  } catch {
    return null
  }
}

const morir = (msg) => {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m\n`)
  process.exit(1)
}

/* ── el nombre del chat ─────────────────────────────────────────────── */

const bruto = process.argv.slice(2).join(' ').trim()
if (!bruto) morir('Falta el nombre. Ejemplo: npm run chat:nuevo order-bump')

const nombre = bruto
  .toLowerCase()
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
if (!nombre) morir(`"${bruto}" no deja un nombre usable.`)

const rama = `feature/${nombre}`

// Las carpetas de los chats SIEMPRE cuelgan del proyecto principal, no de donde
// se ejecute el comando. Si no, lanzarlo desde la carpeta de un chat anidaria
// carpetas dentro de carpetas.
const listaWt = execSync('git worktree list --porcelain', { cwd: RAIZ, encoding: 'utf8' })
const PRINCIPAL = listaWt.split('\n')[0].replace('worktree ', '').trim()
const CHATS = join(dirname(PRINCIPAL), `${basename(PRINCIPAL)}-chats`)
const carpeta = join(CHATS, nombre)

/* ── comprobaciones ANTES de tocar nada ─────────────────────────────── */

if (gitSilencioso('rev-parse --verify dev') === null) {
  morir('No existe la rama `dev`, y toda rama nace de ella.\n   Arreglo: git branch dev main')
}
if (gitSilencioso(`rev-parse --verify ${rama}`) !== null) {
  morir(`Ya existe la rama \`${rama}\`. Ese chat ya esta abierto.\n   Su carpeta: ${carpeta}`)
}
if (existsSync(carpeta)) {
  morir(`Ya existe la carpeta ${carpeta}, pero no su rama. Revisala a mano.`)
}

/* ── de que punto exacto nace la rama ───────────────────────────────── */

// La rama nace del `dev` MAS NUEVO que haya. No se intenta mover `dev` con un
// checkout: si otra carpeta lo tiene puesto (lo normal — la carpeta principal),
// el checkout falla y el comando entero se caeria.
gitSilencioso('fetch origin --quiet')
let base = 'dev'
let nota = ''
if (gitSilencioso('rev-parse --verify origin/dev') !== null) {
  const remotoAdelante = gitSilencioso('rev-list --count dev..origin/dev')
  if (remotoAdelante && Number(remotoAdelante) > 0) {
    base = 'origin/dev'
    nota = ` (el \`dev\` de GitHub, ${remotoAdelante} commit(s) mas nuevo que el local)`
  }
}
// Si `main` va por delante de las dos, es un bug del flujo: alguien publico
// saltandose `dev`. Se avisa, y se nace de `main` para no arrancar de una foto vieja.
const mainAdelante = gitSilencioso(`rev-list --count ${base}..main`)
if (mainAdelante && Number(mainAdelante) > 0) {
  console.log(
    `  ⚠ \`main\` va ${mainAdelante} commit(s) por delante de \`${base}\`: alguien publico saltandose \`dev\`.`
  )
  console.log(`    Esta rama nace de \`main\` para no arrancar de una foto vieja. Pon \`dev\` al dia cuando puedas.`)
  base = 'main'
  nota = ''
}

/* ── crear la rama y su carpeta, de una ─────────────────────────────── */

mkdirSync(CHATS, { recursive: true })
console.log(`\n  Abriendo el sitio de trabajo de este chat…`)
git(`worktree add -b ${rama} "${carpeta}" ${base}`)
console.log(`  · rama \`${rama}\` creada desde \`${base}\`${nota}`)
console.log(`  · carpeta ${carpeta}`)

/* ── dejarla lista para trabajar ────────────────────────────────────── */

// node_modules: clonado con APFS (comparte bloques → instantaneo y sin ocupar disco).
// Un enlace simbolico NO vale: Turbopack lo rechaza ("points out of the filesystem root").
const origenModulos = join(PRINCIPAL, 'node_modules')
if (existsSync(origenModulos)) {
  try {
    execSync(`cp -c -R "${origenModulos}" "${join(carpeta, 'node_modules')}"`, { stdio: 'ignore' })
    console.log('  · node_modules listo')
  } catch {
    console.log('  · node_modules NO se pudo clonar → ejecuta `npm install` en la carpeta')
  }
}
// Claves y config: se ENLAZAN, no se copian. Un enlace no duplica el secreto en
// el disco, y aqui si vale (Next lee el fichero; el veto de Turbopack era solo
// para node_modules). Nunca se lee su contenido.
for (const f of ['.env.local', '.mcp.json']) {
  const src = join(PRINCIPAL, f)
  if (existsSync(src) && !existsSync(join(carpeta, f))) {
    try {
      symlinkSync(src, join(carpeta, f))
      console.log(`  · ${f} enlazado`)
    } catch {}
  }
}

console.log(`\n\x1b[32m✓ Listo.\x1b[0m Este chat trabaja en:\n  ${carpeta}\n`)
console.log(`  Para arrancarlo:  cd "${carpeta}" && npm run dev`)
console.log(`  Al terminar:      npm run chat:cerrar ${nombre}\n`)
