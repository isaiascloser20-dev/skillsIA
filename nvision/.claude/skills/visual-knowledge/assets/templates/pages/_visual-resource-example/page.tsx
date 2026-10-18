import Link from 'next/link'

/**
 * EJEMPLO de página para un RECURSO VISUAL del Knowledge.
 *
 * Renombra esta carpeta al slug del recurso (ej: `brandkit`, `dashboard-ads`,
 * `mockups-app`) y mapéala en `app/(admin)/knowledge/[slug]/page.tsx` dentro
 * de `SPECIAL_RESOURCE_REDIRECTS`:
 *
 *   const SPECIAL_RESOURCE_REDIRECTS: Record<string, string> = {
 *     '<slug-del-SOP-en-BD>': '/knowledge/<nombre-de-esta-carpeta>',
 *   }
 *
 * Patrón:
 *  - Header NO sticky (`shrink-0`) con flecha "Volver al Knowledge" + título.
 *  - `backHref` se construye desde `?from=` para volver a la carpeta exacta.
 *  - El cuerpo es un contenedor `flex-1 min-h-0` con el recurso visual:
 *    iframe (HTML), <embed>/<object> (PDF), <img> (imagen), o componente
 *    React. NUNCA texto plano markdown — para eso ya está el editor.
 *
 * Inserta también el SOP en BD con `active=false` (no contamina el contexto
 * de la IA, es solo una entrada visual en el árbol del cerebro):
 *   INSERT INTO knowledges (slug, title, quadrant, folder_id, content, active)
 *   VALUES ('<slug>', '<Título>', 'marketing', '<uuid-carpeta>', '', false);
 */
export default async function VisualResourceExamplePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>
}) {
  const { from } = await searchParams
  const backHref = from ? `/knowledge?view=${encodeURIComponent(from)}` : '/knowledge'

  return (
    <div className="flex-1 min-w-0 flex flex-col h-screen overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-3 border-b border-white/10 bg-black px-4 py-3 md:px-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/55 hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver al Knowledge
        </Link>
      </div>

      <div className="flex-1 min-h-0 bg-black">
        {/*
          Sustituye este iframe por lo que tengas:
          - HTML:  <iframe src="/<slug>/index.html" className="w-full h-full border-0" />
          - PDF:   <embed src="/<slug>/file.pdf" type="application/pdf" className="w-full h-full" />
          - IMG:   <img src="/<slug>/poster.png" className="w-full h-full object-contain" />
          - React: <YourVisualComponent />
        */}
        <iframe
          src="/your-visual-resource/index.html"
          title="Recurso visual"
          className="w-full h-full border-0"
        />
      </div>
    </div>
  )
}
