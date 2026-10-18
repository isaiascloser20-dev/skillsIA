#!/usr/bin/env node
/**
 * npm run chat:cerrar [nombre]
 *
 * Cierra el sitio de trabajo de UN chat: borra su carpeta y su rama.
 * SE NIEGA si queda algo sin guardar o sin publicar. Nunca borra trabajo.
 *
 * Sin nombre, cierra el chat de la carpeta en la que estas.
 * Con `--limpiar`, ademas recoge las carpetas huerfanas (chats que se cerraron
 * mal y cuya rama ya esta publicada).
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, dirname, basename, resolve } from 'node:path'

const RAIZ = process.cwd()
const git = (cmd, cwd = RAIZ) =>
  execSync(`git ${cmd}`, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const gitSilencioso = (cmd, cwd = RAIZ) => {
  try {
    return git(cmd, cwd)
  } catch {
    return null
  }
}
const morir = (msg) => {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const limpiar = args.includes('--limpiar')
const nombreArg = args.filter((a) => !a.startsWith('--'))[0]

// Lista de carpetas de trabajo: [{ruta, rama}]
function worktrees() {
  const salida = gitSilencioso('worktree list --porcelain') || ''
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

const principal = worktrees()[0]?.ruta ?? RAIZ

/** Cierra una carpeta de chat. Devuelve true si la cerro. */
function cerrar({ ruta, rama }, { forzarComprobaciones = true } = {}) {
  const nom = basename(ruta)

  if (resolve(ruta) === resolve(principal)) {
    morir('Esa es la carpeta principal del proyecto. No se cierra.')
  }
  if (!rama || rama === 'dev' || rama === 'main') {
    morir(`La carpeta ${nom} tiene puesta \`${rama}\`. No es la rama de un chat.`)
  }

  if (forzarComprobaciones) {
    // 1 · nada sin guardar
    const sucio = gitSilencioso('status --porcelain', ruta)
    if (sucio) {
      morir(
        `El chat "${nom}" tiene ${sucio.split('\n').length} archivo(s) SIN GUARDAR.\n` +
          `   No se borra nada. Guarda o descarta primero.`
      )
    }
    // 2 · nada sin publicar.
    // Se compara con el `dev` MAS NUEVO (local o el de GitHub): el local puede ir
    // por detras — por ejemplo justo despues de publicar, o si otra carpeta lo tiene
    // puesto y no se ha podido mover. Comparar solo con el local daria un falso
    // "te queda algo sin publicar" y no dejaria cerrar nunca.
    gitSilencioso('fetch origin --quiet', ruta)
    let base = 'dev'
    const remotoAdelante = gitSilencioso('rev-list --count dev..origin/dev', ruta)
    if (remotoAdelante && Number(remotoAdelante) > 0) base = 'origin/dev'
    const sinPublicar = gitSilencioso(`log --oneline ${base}..${rama}`, ruta)
    if (sinPublicar) {
      morir(
        `El chat "${nom}" tiene ${sinPublicar.split('\n').length} cambio(s) SIN PUBLICAR:\n` +
          sinPublicar
            .split('\n')
            .map((l) => `      ${l}`)
            .join('\n') +
          `\n   No se borra nada. Publica primero ("publicalo").`
      )
    }
  }

  // Si estamos DENTRO de la carpeta que se va a borrar, hay que salir ANTES.
  // Un proceso no puede seguir trabajando en una carpeta que ya no existe: git
  // fallaba en silencio justo despues y la rama se quedaba VIVA mientras el
  // mensaje decia "carpeta y rama fuera". Verificado el 2026-08-05.
  if (resolve(process.cwd()).startsWith(resolve(ruta))) process.chdir(principal)

  // Desde aqui, TODO con cwd = carpeta principal: la de este chat ya no existe.
  git(`worktree remove "${ruta}" --force`, principal)
  // `-d` compara con el HEAD actual, no con `dev`, y se niega aunque el trabajo
  // ya este publicado. Aqui ya se comprobo arriba que `dev..rama` esta vacio
  // (nada sin publicar), asi que borrarla es seguro.
  gitSilencioso(`branch -d ${rama}`, principal) || gitSilencioso(`branch -D ${rama}`, principal)

  // NO se dice "cerrado" por haber lanzado los comandos: se MIRA. Es la misma
  // regla de publicar (un push que sale bien no es una web que sirve el cambio).
  // Regla del sistema: "cuando se cierra se debe de eliminar la carpeta y rama,
  // es obvio, si no el sistema NO tiene sentido que este".
  const carpetaSigue = existsSync(ruta)
  const ramaSigue = gitSilencioso(`rev-parse --verify --quiet refs/heads/${rama}`, principal) !== null

  if (!carpetaSigue && !ramaSigue) {
    console.log(`  ✓ cerrado "${nom}" · carpeta y rama fuera, comprobado`)
    return true
  }

  console.error(`\n\x1b[31m✗ "${nom}" NO se cerro del todo.\x1b[0m No se pierde nada, pero hay que mirarlo:\n`)
  if (carpetaSigue) {
    const dentro = (() => {
      try {
        return readdirSync(ruta).join(', ') || '(vacia)'
      } catch {
        return '(no se puede leer)'
      }
    })()
    console.error(`   · La CARPETA sigue ahi: ${ruta}`)
    console.error(`     dentro: ${dentro}`)
    console.error(`     git la borro y algo la ha vuelto a crear. Mira que proceso escribe ahi.`)
  }
  if (ramaSigue) {
    console.error(`   · La RAMA sigue viva: ${rama}`)
    console.error(`     borrala a mano cuando compruebes que su trabajo esta en \`dev\`.`)
  }
  console.error('')
  return false
  return true
}

/* ── cerrar el que toque ────────────────────────────────────────────── */

const lista = worktrees().slice(1) // el [0] es la carpeta principal

if (limpiar) {
  gitSilencioso('worktree prune')
  const huerfanas = lista.filter(({ rama }) => {
    const pendiente = gitSilencioso(`log --oneline dev..${rama}`)
    return !pendiente // ya esta todo en dev → se puede recoger
  })
  if (!huerfanas.length) {
    console.log('\n✓ No hay carpetas de chat que recoger.\n')
    process.exit(0)
  }
  console.log('\n  Recogiendo carpetas de chats ya publicados:')
  huerfanas.forEach((w) => cerrar(w))
  console.log('')
  process.exit(0)
}

let objetivo
if (nombreArg) {
  objetivo = lista.find((w) => basename(w.ruta) === nombreArg || w.rama === `feature/${nombreArg}`)
  if (!objetivo) morir(`No encuentro el chat "${nombreArg}".\n   Abiertos: ${lista.map((w) => basename(w.ruta)).join(', ') || 'ninguno'}`)
} else {
  objetivo = lista.find((w) => resolve(w.ruta) === resolve(RAIZ))
  if (!objetivo) {
    morir(
      'No estas dentro de la carpeta de un chat.\n' +
        `   Abiertos: ${lista.map((w) => basename(w.ruta)).join(', ') || 'ninguno'}\n` +
        '   Usa: npm run chat:cerrar <nombre>'
    )
  }
}

console.log('')
const bien = cerrar(objetivo)
console.log('')
// Si la carpeta o la rama sobrevivieron, se sale con error: quien llama a este
// comando (npm run cerrar) NO puede decir "cerrado" sobre algo que no lo esta.
if (!bien) process.exit(1)
