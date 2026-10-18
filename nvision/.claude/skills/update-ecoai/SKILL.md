---
name: update-ecoai
scope: template
description: "Actualizar la plantilla NVISION® del proyecto a la ultima version, RESPETANDO skills externos que el dueño haya añadido manualmente. Activar cuando el usuario dice: actualiza la plantilla, hay nueva version, update NVISION, quiero la ultima version, o cuando se detecta que el template esta desactualizado."
allowed-tools: Read, Bash, Glob
---

# Update NVISION® — preserva skills externos

Este skill actualiza las herramientas de desarrollo de la plantilla (carpeta `.claude/`) a la última versión disponible **sin tocar skills externos** que el dueño haya añadido manualmente desde la comunidad o de su propio bolsillo.

## Filosofía

La plantilla madre tiene skills "oficiales" (los que vienen de fábrica). El dueño puede añadir skills "externos" descargados de la comunidad NVISION® o creados por él. Cuando hace update, los **oficiales se actualizan** y los **externos se preservan**.

## Pre-requisitos

1. El dueño tiene un alias `nvision` configurado en `~/.zshrc` o `~/.bashrc` apuntando al repo madre clonado.
2. El dueño tiene permisos de lectura sobre el repo madre (`github.com/marcoapereirav-arch/N-EAI-FABER` u otro).

## Proceso

### Paso 1: Buscar el alias `nvision`

```bash
# Buscar en zshrc
grep "alias nvision" ~/.zshrc

# Si no esta, buscar en bashrc
grep "alias nvision" ~/.bashrc
```

El alias NUEVO **descarga siempre lo último de GitHub** y NO depende de ninguna ruta local:
```bash
alias nvision='T=$(mktemp -d) && git clone -q --depth 1 https://github.com/marcoapereirav-arch/N-EAI-FABER.git "$T" && git -C "$T" archive HEAD:nvision | tar -x && rm -rf "$T"'
```

**Si el alias del usuario usa un formato viejo** (`cp -r ...`, o `git -C /ruta archive HEAD:nvision` que depende de un clon local que se queda desactualizado), reemplázalo por el de arriba. Este clona fresco de GitHub cada vez, así que `nvision` siempre trae la última versión sin tener que actualizar ningún repo local a mano.

Si no encuentras el alias, pregunta al usuario:
> No encontré el alias `nvision`. Por favor, indica la ruta donde tienes clonado el repositorio de NVISION®.

### Paso 2: Actualizar el repositorio madre

```bash
cd [RUTA_REPO_MADRE]
git pull origin main
```

Si hay errores de git (cambios locales sin commit, conflictos), informa al usuario y sugiere solución. **No fuerces** un pull destructivo.

### Paso 3: Detectar skills externos del proyecto actual

Antes de tocar nada, listar los skills que existen en el proyecto del usuario y compararlos con los que existen en la plantilla madre:

```bash
# Skills del proyecto del usuario
ls -d [PROYECTO_ACTUAL]/.claude/skills/*/ 2>/dev/null | xargs -n1 basename > /tmp/skills_proyecto.txt

# Skills de la plantilla madre
ls -d [RUTA_REPO_MADRE]/nvision/.claude/skills/*/ 2>/dev/null | xargs -n1 basename > /tmp/skills_plantilla.txt

# Skills EXTERNOS (existen en proyecto pero NO en plantilla madre)
comm -23 <(sort /tmp/skills_proyecto.txt) <(sort /tmp/skills_plantilla.txt) > /tmp/skills_externos.txt
```

Si hay skills externos, muéstralos al usuario antes de continuar:
```
Detectados los siguientes skills externos (NO se tocarán):
- [skill-externo-1]
- [skill-externo-2]
```

### Paso 4: Actualización selectiva

**REGLA CRÍTICA: NO USAR `rm -rf .claude/`**. Hacer reemplazos selectivos respetando lo externo.

```bash
# 4.1 — Para cada skill OFICIAL de la plantilla madre, reemplazar o crear en el proyecto:
for skill in [RUTA_REPO_MADRE]/nvision/.claude/skills/*/; do
  skill_name=$(basename "$skill")
  rm -rf "[PROYECTO_ACTUAL]/.claude/skills/$skill_name"
  cp -r "$skill" "[PROYECTO_ACTUAL]/.claude/skills/$skill_name"
done

# 4.2 — Los skills EXTERNOS detectados en Paso 3 quedan intactos (no se tocan).

# 4.3 — Actualizar otros directorios de .claude/ (NO destructivamente):
# PRPs, design-systems, hooks: si vienen en la plantilla, actualizar selectivamente.
for dir in PRPs design-systems hooks; do
  if [ -d "[RUTA_REPO_MADRE]/nvision/.claude/$dir" ]; then
    # Reemplazar archivos uno a uno, sin borrar la carpeta entera (preserva archivos externos)
    cp -r "[RUTA_REPO_MADRE]/nvision/.claude/$dir/." "[PROYECTO_ACTUAL]/.claude/$dir/"
  fi
done

# 4.4 — Actualizar archivos sueltos en .claude/ (README.md, settings.json, etc.):
for file in [RUTA_REPO_MADRE]/nvision/.claude/*; do
  if [ -f "$file" ]; then
    cp "$file" "[PROYECTO_ACTUAL]/.claude/$(basename $file)"
  fi
done
```

### Paso 5: Confirmar actualización

Informa al usuario:

```
NVISION® actualizado correctamente.

Skills oficiales actualizados:
- [lista de skills que vienen en la plantilla madre]

Skills externos preservados (NO se tocaron):
- [lista de skills externos detectados en Paso 3]

Otros componentes actualizados:
- .claude/PRPs/ (templates PRP)
- .claude/design-systems/ (sistemas de diseño)
- .claude/hooks/ (si aplica)
- .claude/README.md, settings.json, etc.

Archivos del proyecto NO modificados:
- AGENTS.md (tu configuración del proyecto)
- BUSINESS_LOGIC.md (tu ficha técnica)
- .mcp.json (tus credenciales)
- .env.local (tus variables)
- src/ (tu código y plugins)
- supabase/ (tus migraciones)
```

## Notas

- Este skill **NO** ejecuta `rm -rf .claude/`. Es destructivo y eliminaría skills externos.
- Si un skill externo tiene el MISMO nombre que un skill oficial de la plantilla, prevalece el de la plantilla (se reemplaza). Esto es por diseño: la plantilla es la fuente de verdad para skills oficiales.
- Si el dueño quiere "forzar reset completo" (restaurar todo a la plantilla madre, perdiendo skills externos), hay que copiar manualmente desde el repo madre. No es algo que este skill haga.
- Los archivos del proyecto (`AGENTS.md`, `BUSINESS_LOGIC.md`, `src/`, etc.) **nunca** se tocan.
