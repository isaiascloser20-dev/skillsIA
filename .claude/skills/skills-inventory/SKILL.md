---
name: skills-inventory
scope: template
description: "Muestra al dueño el inventario de skills que tiene su Ecosistema de IA. Escanea .claude/skills/, lee el frontmatter de cada SKILL.md y presenta una tabla organizada por categoria (setup, feature, contenido, mantenimiento) con nombre, que hace en una linea y una frase de ejemplo que la activa. Activar cuando el usuario dice: que skills tengo, que puede hacer mi ecosistema, lista de skills, que herramientas tengo, que sabes hacer, muestrame los skills, inventario de skills, que comandos hay."
allowed-tools: Read, Grep, Glob, Bash
---

# skills-inventory — que puede hacer mi ecosistema

El dueño no tiene por que saber que skills trae su Ecosistema. Este skill se lo enseña:
escanea su propia carpeta de skills, lee lo que cada una hace y se lo presenta claro,
agrupado por para-que-sirve, con un ejemplo de frase para activar cada una.

Es el "menu" de su ecosistema. Cero tecnicismos.

## Cuando se activa

El dueño pregunta cosas como:

- "¿Que skills tengo?"
- "¿Que puede hacer mi ecosistema?"
- "Lista de skills" / "inventario de skills"
- "¿Que herramientas tengo?" / "¿Que sabes hacer?"
- "Muestrame los skills" / "¿Que comandos hay?"

## Proceso paso a paso

### 1. Localizar la carpeta de skills

Los skills viven en `.claude/skills/`. Cada skill es una carpeta con un `SKILL.md` dentro.

```bash
ls -d .claude/skills/*/
```

Si no existe `.claude/skills/`, decir al dueño que su proyecto todavia no tiene skills
instalados y parar. NO inventar una lista.

### 2. Leer el frontmatter de cada SKILL.md

Para cada carpeta, abrir su `SKILL.md` y sacar del bloque frontmatter (entre las dos lineas `---`):

- `name` — el nombre del skill (si falta, usar el nombre de la carpeta).
- `description` — que hace. Coger la **primera frase** (hasta el primer punto), recortada a ~90 caracteres, para el resumen de una linea.
- La description tambien suele traer los "triggers" (las frases que la activan). De ahi sacas **una** frase de ejemplo natural.

Si un `SKILL.md` **no tiene** `description`, escribir literalmente **"sin descripcion"** en su fila. NO inventar lo que hace.

Si una carpeta **no tiene** `SKILL.md`, ignorarla (no es un skill valido).

Comando util para listar nombre + primera frase de cada uno de golpe:

```bash
for d in .claude/skills/*/; do
  f="$d/SKILL.md"
  [ -f "$f" ] || continue
  name=$(grep -m1 '^name:' "$f" | sed 's/name: *//')
  echo "=== ${name:-$(basename $d)} ==="
  grep -m1 '^description:' "$f" | sed 's/description: *//' | sed 's/^["'\'']//' | cut -c1-160
done
```

### 3. Clasificar cada skill por categoria

Agrupar por para-que-sirve. Usa estas 4 categorias (asigna por el sentido de su description):

| Categoria | Que entra |
|-----------|-----------|
| **Setup** | Arrancar y mantener el ecosistema: crear el proyecto, login, pagos, emails, PWA, actualizar/migrar/eyectar la plantilla, crear skills. |
| **Feature** | Construir funcionalidad: planificar (prp), ejecutar por fases (bucle-agentico), IA, base de datos, testing. |
| **Contenido** | Diseño y material visual: imagenes, visuales de video, landings, frontend. |
| **Mantenimiento** | Cuidar el proyecto por dentro: memoria, contexto (primer), optimizar skills, reparar la base, este mismo inventario. |

Si un skill no encaja claro, mételo en la categoria mas cercana; nunca lo dejes fuera.

### 4. Presentar el inventario

Formato de salida: una tabla por categoria. Cabecera con el total real de skills encontrados.

```
Tu ecosistema tiene N skills. Esto es lo que puede hacer:

## Setup
| Skill | Que hace | Dile algo como |
|-------|----------|----------------|
| add-login | Mete login, registro y recuperar contraseña | "necesito que la gente pueda entrar" |
| ... | ... | ... |

## Feature
| Skill | Que hace | Dile algo como |
|-------|----------|----------------|
| ... | ... | ... |

## Contenido
| Skill | Que hace | Dile algo como |
|-------|----------|----------------|
| ... | ... | ... |

## Mantenimiento
| Skill | Que hace | Dile algo como |
|-------|----------|----------------|
| ... | ... | ... |
```

Reglas del formato:
- El total N = numero real de skills encontrados con `SKILL.md` valido. Contarlos, no estimarlos.
- La columna "Que hace" = una frase corta y clara, sin tecnicismos, sacada de la description.
- La columna "Dile algo como" = una frase natural que el dueño diria para activarla, sacada de sus triggers.
- Si una categoria queda vacia, no la pintes.
- Cierra ofreciendo ayuda: "¿Con cual arrancamos?".

## Anti-patrones (NO hacer)

- **NO inventar skills** que no existen fisicamente en `.claude/skills/`. Solo se lista lo que hay.
- **NO inventar la descripcion** de un skill. Si su `SKILL.md` no tiene `description`, su fila dice **"sin descripcion"**.
- **NO** listar una carpeta sin `SKILL.md` como si fuera un skill.
- **NO** falsear el total: el numero de la cabecera es el conteo real.
- **NO** meter tecnicismos en las columnas (nada de "frontmatter", "allowed-tools", rutas internas). El dueño no necesita saber eso.
- **NO** asumir la lista de otro proyecto: siempre se escanea la carpeta real de ESTE proyecto (cada ecosistema puede tener skills distintos si el dueño añadio los suyos).
