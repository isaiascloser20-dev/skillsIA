---
name: cerrar
scope: template
description: "Dejar el trabajo cerrado antes de cerrar el chat. Documenta lo aprendido, actualiza STATE.md, y lanza `npm run cerrar`, que publica TODO y cierra la carpeta y la rama de ESTE chat sin tocar las de los otros chats abiertos. Termina diciendo si el chat se puede cerrar o no. Activar cuando el dueño dice: cierra, cerramos, ya termine, cierra el chat, damos por terminado, /cerrar, o cuando el dueño se despide al final de una sesion de trabajo."
allowed-tools: Bash, Read, Write, Edit, Grep, Glob
---

# Skill: Cerrar

> Dejar el trabajo cerrado, **sin preguntar nada**, y decirle al dueño si ya puede cerrar el chat.

**Esta skill NO cierra la ventana.** Ninguna skill puede. Lo que hace es dejar
el trabajo **literalmente cerrado** y terminar con una frase clara: se puede
cerrar, o falta esto.

---

## ⚡ CERO PREGUNTAS. El orden importa.

**Regla del sistema:** *"Cada vez que quiero cerrar algo, me ha pasado
en TODOS los chats: 'espera, hay algo por publicar'. Fuck off. Cuando te digo
cerrar, quiero que publiques todo y cierres todo de una puta vez."*
**Regla del sistema:** *"cuando el dueño publique y cuando yo cierre, no quiero que
me pregunte nada."*

```
1 · DOCUMENTAR   lo aprendido → Knowledge · BUSINESS_LOGIC.md · AGENTS.md
2 · ESTADO       STATE.md diciendo la verdad de hoy
3 · GUARDAR      git add <lo de este trabajo> && git commit
4 · npm run cerrar    ← publica TODO y cierra la carpeta y la rama. Una orden.
```

**Documentar va ANTES de publicar**, siempre. Lo ultimo que se escribe en un
cierre es su propia documentacion; si se publica antes, esa documentacion se
queda fuera de la web y el cierre termina con un "queda esto sin publicar, ¿lo
subo?" — que es justo lo prohibido.

⚠️ **`/cerrar` YA ES la orden de publicar.** No choca con la REGLA #2 ("nada
sale a la web sin que el dueño lo diga"): **decir "cierra" ES decirlo.** La regla
existe para que la IA no publique por iniciativa a mitad de un trabajo, no para
volver a pedir permiso cuando el ya dio la orden de cerrar.

Knowledge: `ia-cerrado-es-cerrar-todo-sin-preguntar`.

---

## Los pasos

### 1 · Guardar lo aprendido

Repasar el chat y sacar **lo que sirve para la proxima vez**:

- Una decision que se tomo y por que
- Un fallo que costo encontrar, y como se arreglo
- Una regla nueva que dijo el dueño
- Una forma de hacer algo que quedo establecida

| Que es | Donde |
|---|---|
| Una regla, un proceso, una decision del negocio | **Knowledge** (la base de conocimiento del proyecto) |
| Como esta construido algo tecnico | `BUSINESS_LOGIC.md` |
| Una orden corta que la IA debe obedecer siempre | `AGENTS.md` |

**Si no hay nada que guardar, decirlo.** Inventar aprendizajes ensucia el Knowledge.

### 2 · Actualizar el estado

`STATE.md` diciendo la verdad de hoy: que quedo hecho, que quedo a medias, que
viene despues. **Un `STATE.md` que miente es peor que no tenerlo.**

### 3 · Guardar

```bash
git status --short
git add <los archivos de este trabajo>     # NUNCA `git add .` a ciegas
git commit -m "<titulo corto>

<por que>"
```

### 4 · `npm run cerrar` · SE EJECUTA, NO SE OFRECE

```bash
npm run cerrar
```

Hace, en este orden:

1. **Publica TODO** (`scripts/publicar.mjs`: `dev` al dia → une la rama → puerta de 7 s → un push → espera a que la web sirva ESE commit).
2. **Cierra la carpeta y la rama de ESTE chat.** Se niega sin borrar nada si queda algo sin guardar o sin publicar.
3. **Lista los otros chats abiertos** y los deja como estan.

⚠️ **Ejecutalo. No preguntes "¿lo cierro?".** El comando **ya se niega solo** si
algo falta, asi que preguntar no protege de nada: solo deja la carpeta y la rama
tiradas, que es justo lo que este paso existe para evitar.

### 5 · El veredicto

**Todo cerrado** (lo que imprime el propio comando):

```
Cerrado. Ya puedes cerrar el chat.

  Publicado:  todo lo de este chat, y la web lo esta sirviendo
  Este chat:  carpeta y rama fuera (<nombre>)
  Otros:      <los que quedan abiertos, o ninguno>
```

Añade **el enlace** a lo que el dueño tiene que ver.

**Queda algo** — SOLO si de verdad no se puede resolver solo (un choque al unir,
la puerta en rojo):

```
NO cierres todavia. Queda esto:

  - <lo que falta y POR QUE no lo he podido resolver yo>

Dime que hago.
```

"Hay commits sin publicar" **NO** entra aqui: eso se publica y punto.

---

## Reglas duras

1. **Nunca decir "cerrado" si queda algo sin publicar.** Es justo el fallo que esta skill existe para evitar.
2. **Documentar ANTES de publicar.** Si no, la documentacion del cierre se queda fuera de la web.
3. **Publicar SIEMPRE dentro del cierre.** Preguntar "¿lo subo?" al cerrar es el fallo que mas mas ha quemado.
4. **Nunca borrar una carpeta ni una rama con trabajo sin unir.** El comando ya se niega; no forzarlo.
5. **Nunca inventar aprendizajes** para que el paso 1 parezca productivo.
6. **Se cierra siempre**, aunque el trabajo haya durado diez minutos.
7. **Los otros chats no se tocan.** Cerrar un chat cierra **su** carpeta y **su** rama.

---

## Errores ya cometidos (auto-blindaje)

| Error | Que hacer |
|---|---|
| **Preguntar "¿lo publico?" al cerrar, en TODOS los chats** | `/cerrar` ya es la orden. `npm run cerrar` publica y sigue |
| **Pedir permiso 3 veces por publicacion con el Bypass puesto** | Era la lista `ask` de `.claude/settings.json`. Ver el skill `publicar` |
| **Cerrar tardaba 10 min por montar la web en local** | Ya no se monta: la puerta son 7 s y Vercel hace el build |
| **`chat:cerrar` borraba la carpeta ESTANDO DENTRO** | Fallo mudo verificado el 2026-08-05: la carpeta se iba, **la rama se quedaba VIVA** y el mensaje decia "carpeta y rama fuera". Arreglado: se sale a la carpeta principal antes de borrar |
| Cerrar dejando cambios sin publicar | `npm run cerrar` publica primero, siempre |
| Publicar antes de documentar | Documentar es el paso 1; publicar, el 4 |
| Ramas acumuladas durante semanas | Se cierran en cada cierre. Las huerfanas: `npm run chat:cerrar -- --limpiar` |
| `STATE.md` diciendo algo de hace un mes | Paso 2 |
| Decir "listo" sin comprobar nada | El veredicto sale del comando, no de la sensacion |
