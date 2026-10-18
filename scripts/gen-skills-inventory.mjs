#!/usr/bin/env node
// Genera .claude/skills/SKILLS_README.md desde el frontmatter de cada SKILL.md.
// Fuente unica de verdad del inventario de skills. NO editar SKILLS_README a mano.
// Tambien etiqueta scope: template en cualquier skill que no lo tenga.
// Uso: node scripts/gen-skills-inventory.mjs   (o: npm run skills:inventory)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const SKILLS_DIR = '.claude/skills'
const OUT = join(SKILLS_DIR, 'SKILLS_README.md')
const DEFAULT_SCOPE = 'template'
const ORDER = ['template', 'wisdom-portal', 'nvision-only']
const LABELS = {
  template: 'Template · vienen en la plantilla, los reciben los alumnos al clonar/update',
  'wisdom-portal': 'Wisdom Portal · se entregan aparte en la comunidad',
  'nvision-only': 'NVISION-only · privados, NO se comparten',
}

if (!existsSync(SKILLS_DIR)) {
  console.error(`No existe ${SKILLS_DIR} (ejecuta desde la raiz del proyecto).`)
  process.exit(1)
}

const dirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort()

const skills = []
let tagged = 0

for (const dir of dirs) {
  const file = join(SKILLS_DIR, dir, 'SKILL.md')
  if (!existsSync(file)) continue
  const lines = readFileSync(file, 'utf8').split('\n')
  if (lines[0].trim() !== '---') continue
  let fmEnd = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { fmEnd = i; break }
  }
  if (fmEnd < 0) continue
  const fm = lines.slice(1, fmEnd)

  let scope = null
  let nameIdx = -1
  let name = dir
  for (let i = 0; i < fm.length; i++) {
    const s = fm[i].match(/^scope:\s*(.+?)\s*$/)
    if (s) scope = s[1].trim()
    if (/^name:/.test(fm[i])) { nameIdx = i; name = fm[i].replace(/^name:\s*/, '').trim() }
  }

  if (!scope) {
    scope = DEFAULT_SCOPE
    const insertAt = nameIdx >= 0 ? nameIdx + 2 : 1
    lines.splice(insertAt, 0, `scope: ${scope}`)
    writeFileSync(file, lines.join('\n'))
    tagged++
  }

  // descripcion corta
  let desc = ''
  const dIdx = fm.findIndex((l) => /^description:/.test(l))
  if (dIdx >= 0) {
    let raw = fm[dIdx].replace(/^description:\s*/, '').trim()
    if (raw === '|' || raw === '>' || raw === '') {
      for (let j = dIdx + 1; j < fm.length; j++) { if (fm[j].trim()) { raw = fm[j].trim(); break } }
    }
    raw = raw.replace(/^["']|["']$/g, '').trim()
    desc = raw.split(/\.(\s|$)/)[0].slice(0, 110)
  }

  skills.push({ name, scope, desc })
}

let out = `# Skills System - NVISION®\n\n`
out += `> Inventario GENERADO automaticamente desde el frontmatter de cada SKILL.md.\n`
out += `> NO editar a mano. Regenerar con \`npm run skills:inventory\`.\n`
out += `> Para crear un skill nuevo usa \`/skill-creator\`.\n\n`
out += `**Total: ${skills.length} skills**\n\n`

const seen = new Set()
for (const sc of ORDER) {
  const group = skills.filter((s) => s.scope === sc)
  if (!group.length) continue
  seen.add(sc)
  out += `## ${LABELS[sc]} (${group.length})\n\n`
  out += `| Skill | Que hace |\n|-------|----------|\n`
  for (const s of group) out += `| \`${s.name}\` | ${s.desc} |\n`
  out += `\n`
}
const others = skills.filter((s) => !seen.has(s.scope))
if (others.length) {
  out += `## Otros (${others.length})\n\n| Skill | Scope | Que hace |\n|-------|-------|----------|\n`
  for (const s of others) out += `| \`${s.name}\` | ${s.scope} | ${s.desc} |\n`
  out += `\n`
}

writeFileSync(OUT, out)
console.log(`SKILLS_README.md regenerado · ${skills.length} skills · ${tagged} etiquetados con scope=${DEFAULT_SCOPE}`)
for (const sc of ORDER) {
  const c = skills.filter((s) => s.scope === sc).length
  if (c) console.log(`  ${sc}: ${c}`)
}
