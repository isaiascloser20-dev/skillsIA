/**
 * Knowledge BASICO (lo monta new-ecoai dentro del shell del OS).
 * Muestra los cuadrantes/areas de forma simple. `/visual-knowledge`
 * REEMPLAZA esta pagina por el cerebro 3D navegable + vista Carpetas.
 *
 * Estilo: clases estandar que se rebrandean con el brandkit del proyecto.
 */
const QUADRANTS = [
  { name: 'Marketing', desc: 'Branding, copy, contenidos, captacion, identidad visual.' },
  { name: 'Ventas', desc: 'Oferta, pipeline, scripts, objeciones, conversion.' },
  { name: 'Producto', desc: 'Arquitectura, plugins instalados, decisiones tecnicas, stack.' },
  { name: 'Finanzas', desc: 'Ingresos, costos, suscripciones, gastos, proyecciones.' },
  { name: 'Personal', desc: 'Historia, habitos, filosofia, journal del dueno.' },
  { name: 'Reglas', desc: 'Tono, palabras prohibidas, siempre haz X.' },
]

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-5xl p-6 sm:p-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">Knowledge</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">El cerebro de tu negocio</h1>
      <p className="mt-2 max-w-xl text-sm text-neutral-400">
        4 cuadrantes de negocio + 2 areas. Aqui vive todo tu conocimiento operativo.
      </p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUADRANTS.map((q) => (
          <div
            key={q.name}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/20"
          >
            <h2 className="font-semibold text-neutral-100">{q.name}</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">{q.desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
