# 🔐 Secrets Rule Rollout — Playbook portable

> **Qué es esto.** Registro de la "REGLA ABSOLUTA — PROHIBIDO LEER FICHEROS DE SECRETOS"
> aplicada a este proyecto NVISION®, **por qué** se hizo, **qué ficheros** cambiaron, y la
> **guía paso a paso para que otro agente replique exactamente lo mismo** en cualquier
> proyecto que sea copia de esta plantilla.
>
> Por que existe esta regla: *"ningún agente lea el fichero .env o .env.local o similares
> que tengan keys o claves privadas, solamente puedes copiar el fichero"*.
> Knowledge canónico: `ia-prohibido-leer-env-secrets-solo-copiar`.

---

## 1. La regla (en una frase)

Ningún agente (Claude Code, subagentes, forks, workflows, NVISION AI, cualquier modelo futuro)
**lee el CONTENIDO** de un fichero de secretos. La única operación permitida es **copiarlo de
forma opaca** (mover bytes). Los **valores los pone el humano**; la IA solo comprueba que una
variable **existe** (`grep -c '^VAR=' .env.local` → 0/1), nunca el valor.

**Ficheros cubiertos:** `.env`, `.env.local`, `.env.*`, `*.pem`, `*.key`, llaves SSH,
`credentials.json`, JSON de service-account, y cualquier fichero con claves/tokens/passwords.

**Prohibido sobre esos ficheros:** tool `Read`; `cat`/`head`/`tail`/`less`/`more`/`sed`/`awk`;
`grep`/`rg` que imprima valores; `echo $SECRET`/`printenv`/`env` mostrando un valor; abrirlo en visor.

**Único permitido — copia opaca:** `cp`/`mv` (p.ej. `cp .env.local.example .env.local` si el
example NO trae secretos reales). La copia nunca se trackea en git ni se sube a nada externo.

## 2. Por qué

Cualquier lectura deja la clave en el **transcript / historial / caché** del agente, donde
puede filtrarse aunque se borre después. **Una clave que entra al contexto ya está comprometida.**
La regla mueve el secreto fuera del alcance del modelo por diseño, no por buena voluntad.

**Modelo estándar elegido:** *Nivel 0 — `.env.local` manual.* La IA hace el 95% (crear el
fichero por copia opaca, listar las KEYS necesarias, cablear `process.env.X`, validar existencia)
y el humano hace el 5% irreductible: pegar el valor una vez por un canal que la IA no ve.

---

## 3. Qué se cambió en este proyecto (changelog file-by-file)

| # | Fichero | Cambio | Por qué |
|---|---------|--------|---------|
| A1 | `AGENTS.md` | Nueva sección **"⚡⚡⚡ REGLA ABSOLUTA — PROHIBIDO LEER FICHEROS DE SECRETOS"** + subsección **"Manejo de secretos estándar (Nivel 0)"**, justo tras *"Seguridad de la memoria"* (+ línea de enlace en esa subsección) | Es la regla dura; CLAUDE.md se carga cada sesión → ancla de persistencia |
| A2 | `CLAUDE.md` / `GEMINI.md` | Nada que hacer: son accesos directos (symlink) a `AGENTS.md` | Un solo archivo con tres nombres, imposible desincronizar |
| B1 | `.claude/skills/new-ecoai/SKILL.md` | Paso "Configuración de secretos (Nivel 0)" en *Notas* + bullet en *Ciberseguridad base* | El flujo de instalación es donde se introducen los secretos |
| B2 | `.env.local.example` | Cabecera-comentario con el contrato de seguridad | Lo ve cualquiera que abra el fichero al rellenarlo |
| B3 | `README.md` | Sección "🔐 Manejo de secretos" + fix `.env.example`→`.env.local.example` | Documentación para humanos que clonan |
| C1 | `.claude/skills/supabase/SKILL.md` | "Cargar Credenciales" reescrito: **MCP por defecto**; el `export $(grep\|cut)` queda como **excepción sancionada** (valor nunca se imprime) | Era el único skill que extraía valores de `.env` |
| C2 | `.claude/skills/add-mobile/SKILL.md` | VAPID: prohibido `npx web-push generate-vapid-keys` (imprime la privada); patrón **"genera-a-fichero"** (escribe en `.env.local`, imprime solo la pública) | La generación de claves volcaba la privada al transcript |

**No se tocó** código de la app ni nada destructivo. Inventario de skills sin cambios (frontmatter intacto).

---

## 4. Cómo replicarlo en OTRO proyecto copia de esta plantilla

> Otro agente: ejecuta esto en la raíz del proyecto destino (donde viven `AGENTS.md`,
> `package.json`, `.claude/skills/`). Es **idempotente**: si algo ya está, no lo dupliques.
> **Nunca** `cat`/`Read` un `.env*` durante este proceso.

### Paso 0 — Diagnóstico (qué falta)
```bash
grep -c "PROHIBIDO LEER FICHEROS DE SECRETOS" AGENTS.md            # 0 = falta la regla
grep -c "ningun agente lee el CONTENIDO\|copia opaca" .env.local.example 2>/dev/null
grep -rnE "cat +\.env|\bRead\b.*\.env|\.env[a-z.]* *\| *cut|echo +\\\$[A-Z_]+|printenv" \
  .claude/skills --include="*.md" | grep -v "process.env" | grep -v "appendFileSync"
```

### Paso 1 — Regla en AGENTS.md (A1)
Inserta, justo después de la subsección *"Seguridad de la memoria"* (o cerca del inicio si no
existe esa sección), el bloque completo de la sección **"⚡⚡⚡ REGLA ABSOLUTA — PROHIBIDO LEER
FICHEROS DE SECRETOS"** + la subsección **"Manejo de secretos estándar (Nivel 0)"**. Copia el
texto literal desde el `AGENTS.md` de este proyecto de referencia (es la fuente canónica).

### Paso 2 — Comprobar los accesos directos (A2)
```bash
ls -la AGENTS.md CLAUDE.md GEMINI.md   # CLAUDE.md y GEMINI.md deben salir como "-> AGENTS.md"
```

### Paso 3 — Contrato en `.env.local.example` (B2)
Si no tiene la cabecera de seguridad, añádela arriba del todo (copia opaca, listar keys, el
humano pega, verificación con `grep -c`, "ningún agente lee el contenido"). Si el fichero no
existe, créalo con esa cabecera + las KEYS del proyecto (solo nombres, sin valores).

### Paso 4 — README (B3)
Añade la sección "🔐 Manejo de secretos" y, si el README usa `cp .env.example`, corrígelo a
`cp .env.local.example .env.local`.

### Paso 5 — new-ecoai (B1)
En `.claude/skills/new-ecoai/SKILL.md` añade el paso "Configuración de secretos (Nivel 0)" en
*Notas* y el bullet en *Ciberseguridad base* (ver el de este proyecto).

### Paso 6 — Reconciliar skills que leen valores (C1, C2)
- **supabase**: si "Cargar Credenciales" hace `export X=$(grep ... | cut ...)` sin contexto,
  reescríbelo para **priorizar el MCP** y dejar el `export` como **excepción sancionada** (con
  la nota "el valor nunca se imprime; prohibido `echo`/`cat`/`printenv` después").
- **add-mobile**: si genera VAPID con `npx web-push generate-vapid-keys`, cámbialo al patrón
  "genera-a-fichero":
  ```bash
  node -e "const k=require('web-push').generateVAPIDKeys();require('fs').appendFileSync('.env.local','\nNEXT_PUBLIC_VAPID_PUBLIC_KEY='+k.publicKey+'\nVAPID_PRIVATE_KEY='+k.privateKey+'\nVAPID_SUBJECT=mailto:tu@email.com\n');console.log('VAPID escritas en .env.local. Publica:',k.publicKey)"
  ```
- Revisa el resto de skills con el grep del Paso 0. Cualquier otro `cat/Read/echo` de valores → reescribir.


### Paso 8 — Verificar
```bash
npm run skills:inventory
grep -c "PROHIBIDO LEER FICHEROS DE SECRETOS" AGENTS.md   # ≥ 1
# El grep del Paso 0 sobre skills NO debe devolver nada salvo el export sancionado de supabase
```

### Paso 9 — Guardar en el Knowledge
Registra la regla en el Knowledge del proyecto (cuadrante **Reglas**) con el slug canónico
`ia-prohibido-leer-env-secrets-solo-copiar`, para que la IA del SaaS también la respete.

---

## 5. Checklist de "hecho"

- [ ] `AGENTS.md` contiene la REGLA ABSOLUTA + sub-sección Nivel 0
- [ ] `CLAUDE.md` y `GEMINI.md` son accesos directos a `AGENTS.md`
- [ ] `.env.local.example` tiene la cabecera del contrato
- [ ] `README.md` tiene la sección "🔐 Manejo de secretos"
- [ ] `new-ecoai` documenta el paso de secretos
- [ ] `supabase` prioriza MCP; `export` marcado como excepción
- [ ] `add-mobile` usa "genera-a-fichero" para VAPID
- [ ] El grep detector no encuentra lecturas de valores (salvo el export sancionado)
- [ ] Regla guardada en el Knowledge (`ia-prohibido-leer-env-secrets-solo-copiar`)
