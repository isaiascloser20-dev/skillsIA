---
name: playwright-cli
description: "Testing y QA automatizado con Playwright. Navega la app, llena formularios, hace click, toma screenshots y genera reportes. Usa el Playwright MCP para flujos interactivos y el CLI de Playwright para capturas rapidas, codegen y test suites. Activar cuando el usuario dice: testea esto, revisa que funcione, hay un bug, verificalo, checalo en el browser, o despues de implementar una feature para validar."
scope: template
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# Skill: QA Automatizado con Playwright

> Ejecutar QA: $ARGUMENTS

---

## Dos herramientas, cada una para lo suyo

- **Playwright MCP** (interactivo): conducir el navegador paso a paso — navegar, hacer click, llenar formularios, leer el estado de la pagina. Es la forma real de automatizar una interaccion multi-paso. Tools: `browser_navigate`, `browser_snapshot`, `browser_click`, `browser_type`, `browser_fill_form`, `browser_take_screenshot`, `browser_wait_for`.
- **Playwright CLI** (`npx playwright ...`): tareas no interactivas — capturas rapidas, grabar flujos (`codegen`) y correr suites de test (`test`).

**Principio sticky-notes**: NO volcar snapshots completos al contexto. Toma snapshots dirigidos, guarda screenshots a disco, lee detalle on-demand.

---

## Prerrequisitos

```bash
npx playwright install chromium
```

---

## Comandos CLI reales (ojo a la sintaxis)

```bash
# Screenshot — URL y ARCHIVO son POSICIONALES (NO existe --output)
npx playwright screenshot http://localhost:3000 captura.png
npx playwright screenshot --full-page http://localhost:3000/precios precios.png

# Mobile (iPhone): viewport explicito
npx playwright screenshot --viewport-size=375,812 http://localhost:3000/login login-mobile.png

# Grabar un flujo y generar codigo (abre navegador, registra acciones)
npx playwright codegen http://localhost:3000

# Correr la suite de tests del proyecto (si hay archivos *.spec.ts)
npx playwright test
```

> NO existen `npx playwright navigate|click|fill|snapshot`. Esas acciones interactivas se hacen con el **Playwright MCP** (abajo), no con el CLI.

---

## Acciones interactivas (Playwright MCP)

```
browser_navigate({ url })                 # ir a una pagina
browser_snapshot()                        # accessibility tree (dirigido, sin volcar al contexto)
browser_click({ element, ref })           # click
browser_type({ element, ref, text })      # escribir en un campo
browser_fill_form({ fields: [...] })      # llenar varios campos de golpe
browser_take_screenshot({ filename })     # captura a disco
browser_wait_for({ text | time })         # esperar a que algo aparezca/pase
```

---

## Flujo QA en 6 fases

### Fase 1: SETUP
Leer requerimientos: que feature/bug se verifica, criterios de exito, rutas involucradas, datos de prueba.

```bash
mkdir -p .qa-reports/[YYYY-MM-DD]-[nombre]/screenshots
```

### Fase 2: PROVISION
Preparar datos de prueba (usuario via Supabase MCP si aplica) y verificar que el server corre.

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### Fase 3: NAVIGATE
Abrir la app con el MCP y capturar el estado inicial.

```
browser_navigate({ url: 'http://localhost:3000/[ruta]' })
browser_take_screenshot({ filename: '.qa-reports/[fecha]-[nombre]/screenshots/01-inicio.png' })
```

Para una captura puntual sin sesion interactiva, el CLI vale:
```bash
npx playwright screenshot http://localhost:3000/[ruta] .qa-reports/[fecha]-[nombre]/screenshots/01-inicio.png
```

### Fase 4: TEST
Conducir el flujo con el MCP (click/fill) y capturar antes/despues de cada accion critica.

```
browser_navigate({ url: 'http://localhost:3000/login' })
browser_fill_form({ fields: [
  { name: 'email', value: 'test@example.com' },
  { name: 'password', value: 'testpassword' }
] })
browser_click({ element: 'boton Sign In' })
browser_wait_for({ text: 'Dashboard' })
browser_take_screenshot({ filename: '.qa-reports/[fecha]-[nombre]/screenshots/03-after-login.png' })
```

### Fase 5: DOCUMENT
Snapshot dirigido SOLO cuando necesites inspeccionar estructura: `browser_snapshot()` y guarda el resumen, no el arbol completo.

### Fase 6: REPORT
Generar reporte markdown con hallazgos (template abajo).

---

## Template del Reporte

Crear `.qa-reports/[YYYY-MM-DD]-[nombre]/report.md`:

```markdown
# QA Report: [Feature/Bug Name]

**Date**: [YYYY-MM-DD]
**Status**: PASSED | FAILED | PARTIALLY_FIXED

## Test Steps
1. [Paso] - Screenshot: `screenshots/01-nombre.png`
2. ...

## Findings
- [Issue encontrado o confirmacion de que funciona]

## Screenshots
- `screenshots/01-inicio.png` - Estado inicial
- ...

## Recommendations
- [Fix sugerido o siguiente paso]
```

---

## Modos de uso

| Comando | Que hace |
|---------|----------|
| `/playwright-cli verify [flujo]` | Verificar que un flujo funciona correctamente |
| `/playwright-cli reproduce [bug]` | Intentar reproducir un bug reportado |
| `/playwright-cli full [feature]` | QA completo de una feature (happy path + edge cases) |

---

## Directorio de output

```
.qa-reports/
  [YYYY-MM-DD]-[nombre]/
    report.md
    screenshots/
      01-nombre.png
      ...
```

---

## Reglas

- SIEMPRE crear el directorio de artefactos antes de empezar.
- Flujo interactivo (click/fill/multi-paso) → Playwright MCP. Captura puntual / codegen / test suite → CLI.
- NUNCA volcar snapshots completos al contexto (leerlos on-demand).
- Screenshots a disco, NO inline en el reporte (solo paths).
- SIEMPRE generar el reporte al final, incluso si todo paso.
- Si el server no corre, avisar al usuario en vez de fallar en silencio.
