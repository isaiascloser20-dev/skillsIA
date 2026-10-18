import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OsSidebar } from '@/features/os-shell/OsSidebar'

/**
 * Shell del OS. Envuelve TODAS las secciones del OS (Knowledge + plugins)
 * con el sidebar colapsable. El Knowledge (3D o basico) se renderiza en
 * <main>, encajado en la pantalla.
 *
 * HAS_APP: new-ecoai lo pone en `true` si el proyecto es OS+APP
 * (muestra el boton "Ir a la APP" en el sidebar). En Solo OS, queda en false.
 */
const HAS_APP = false

export default async function OsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single()
  const isAdmin = (profile as { roles?: { name?: string } } | null)?.roles?.name === 'admin'
  // Cliente (no-admin): a la APP si existe (OS+APP); si es Solo OS, no tiene sitio aqui -> /login.
  if (!isAdmin) redirect(HAS_APP ? '/app' : '/login')

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100">
      <OsSidebar hasApp={HAS_APP} userEmail={user.email ?? ''} />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
