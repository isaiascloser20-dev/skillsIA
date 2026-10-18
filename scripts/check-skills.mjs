#!/usr/bin/env node
/**
 * check:skills — vigilante de skills duplicadas.
 *
 * POR QUE EXISTE
 * Cuando la misma skill existe en la carpeta global del usuario
 * (~/.claude/skills/) y en la del proyecto (.claude/skills/), GANA LA GLOBAL
 * y la del proyecto se ignora EN SILENCIO. Nadie ve un error.
 *
 * Caso real en NVISION (2026-06-10 → 2026-07-30): 19 skills copiadas a la
 * carpeta global en un solo comando. Mes y medio despues el agente seguia
 * cargando esas versiones de junio, y una regla escrita en julio dentro del
 * skill nunca llego a cumplirse porque la copia que se cargaba no la tenia.
 *
 * QUE COMPRUEBA
 *   1. Que NO haya skills en la carpeta global del usuario (~/.claude/skills/).
 *      Unica excepcion: enlaces simbolicos a skills del propio Claude Code.
 *   2. Que el proyecto NO tenga una segunda carpeta de skills (.agents/skills/)
 *      tapando a la de verdad (.claude/skills/).
 *
 * Enganchado a `predev` (la carpeta global vive en tu ordenador, el servidor
 * de despliegue nunca la ve) y a `prebuild`.
 */

import { readdirSync, existsSync, lstatSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const RAIZ = process.cwd()
const GLOBAL = join(homedir(), '.claude', 'skills')
const PROYECTO = join(RAIZ, '.claude', 'skills')
const SEGUNDA = join(RAIZ, '.agents', 'skills')

const problemas = []

function carpetasDe(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .map((e) => ({ nombre: e.name, ruta: join(dir, e.name) }))
    .filter((e) => lstatSync(e.ruta).isDirectory() || lstatSync(e.ruta).isSymbolicLink())
}

// 1 · Cero skills reales en la carpeta global
const enGlobal = carpetasDe(GLOBAL).filter((e) => !lstatSync(e.ruta).isSymbolicLink())
if (enGlobal.length > 0) {
  problemas.push(
    `Hay ${enGlobal.length} skill(s) en la carpeta global (~/.claude/skills/):\n` +
      enGlobal.map((e) => `      - ${e.nombre}`).join('\n') +
      `\n\n   Las skills globales TAPAN a las del proyecto: se cargan ellas y el\n` +
      `   trabajo nuevo del proyecto se ignora en silencio.\n` +
      `   Arreglo: borrar esas carpetas de ~/.claude/skills/. Cada proyecto lleva\n` +
      `   las suyas en .claude/skills/, versionadas en git.`
  )
}

// 2 · Cero segunda carpeta de skills dentro del proyecto
const enSegunda = carpetasDe(SEGUNDA)
if (enSegunda.length > 0) {
  const tambienEnProyecto = enSegunda.filter((e) => existsSync(join(PROYECTO, e.nombre)))
  problemas.push(
    `El proyecto tiene DOS carpetas de skills: .claude/skills/ y .agents/skills/\n` +
      `   .agents/skills/ tiene ${enSegunda.length} skill(s)` +
      (tambienEnProyecto.length
        ? `, de las cuales ${tambienEnProyecto.length} duplican a las de .claude/skills/.`
        : '.') +
      `\n\n   Arreglo: dejar solo .claude/skills/.`
  )
}

if (problemas.length > 0) {
  console.error('\n\x1b[31m✗ check:skills — hay skills duplicadas\x1b[0m\n')
  problemas.forEach((p, i) => console.error(`   ${i + 1}. ${p}\n`))
  console.error('   Regla: UN solo juego de skills, el del proyecto, versionado en git.\n')
  process.exit(1)
}

const total = carpetasDe(PROYECTO).length
console.log(`✓ check:skills — ${total} skills, todas en el proyecto. Global limpio.`)
