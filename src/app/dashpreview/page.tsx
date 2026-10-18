import { OsSidebar } from '@/features/os-shell/OsSidebar'
import { DashboardClient } from '@/features/dashboard/DashboardClient'

/**
 * Vista previa del Dashboard SIN login, para mirar el diseño mientras se construye.
 *
 * REGLA: aqui NO se escribe ningun color, tipografia ni nombre a mano.
 * Toma exactamente lo mismo que la pantalla real (/dashboard): el token `--brand`
 * y la tipografia del proyecto, que new-ecoai deja puestos con la marca del dueño.
 * Asi esta pantalla SIEMPRE se ve con la marca de quien tiene el proyecto delante.
 *
 * Si algun dia aparece aqui un color o un nombre escrito a mano, es un bug.
 */
export default function DashPreview() {
  return (
    <div className="flex h-screen bg-[#0d0b18] text-neutral-100">
      <OsSidebar hasApp userEmail="" />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <DashboardClient />
      </main>
    </div>
  )
}
