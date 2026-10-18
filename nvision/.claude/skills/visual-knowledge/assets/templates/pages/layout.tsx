/**
 * Layout de la seccion Knowledge.
 *
 * El gate de auth+rol y el shell del OS (sidebar colapsable + botones) los pone
 * el layout PADRE `src/app/(admin)/layout.tsx`, que viene de fabrica con new-ecoai.
 * Aqui solo dejamos pasar el contenido: el cerebro 3D se renderiza DENTRO del
 * shell del OS (en su <main>), encajado en la pantalla. NO metas otro gate ni
 * otro contenedor full-screen aqui (romperia el shell).
 */
export default function KnowledgeLayout({ children }: { children: React.ReactNode }) {
  // El shell del OS ((admin)/layout) monta el <main> con altura 100vh (definida por `flex h-screen`).
  // Aqui le damos al cerebro un contenedor que TOMA esa altura con `h-full`.
  // OJO: NO uses `flex-1` aqui — el <main> es `display:block`, y `flex-1` fuera de un flex es INERTE:
  // el div quedaria con altura `auto`, `h-full` del cerebro se evaluaria como `auto` y caeria al
  // fallback `min-h-[80vh]` -> el cerebro saldria cortado al 80%. `h-full` SI propaga los 100vh.
  // `overflow-hidden`: el <main> ya scrollea; el cerebro tiene su propio scroll interno (vista Carpetas).
  return <div className="h-full min-w-0 overflow-hidden">{children}</div>
}
