import { createClient } from '@/lib/supabase/server'
import { PerfilClient } from '@/features/perfil/PerfilClient'

// Perfil del admin (dentro del shell del OS). Cuenta + ajustes (notificaciones).
export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <PerfilClient email={user?.email ?? ''} />
}
