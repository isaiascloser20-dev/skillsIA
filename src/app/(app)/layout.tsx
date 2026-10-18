import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Solo el admin (dueno/equipo) ve el boton para volver al OS. Los clientes NO.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let isAdmin = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('roles(name)')
      .eq('id', user.id)
      .single()
    isAdmin = (profile as { roles?: { name?: string } } | null)?.roles?.name === 'admin'
  }

  return (
    <div className="min-h-screen">
      <main>{children}</main>
      {isAdmin && (
        <Link
          href="/dashboard"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border border-white/15 bg-neutral-900/90 px-4 py-2 text-xs font-medium text-neutral-200 shadow-lg backdrop-blur hover:border-white/30 hover:text-white"
        >
          <span className="text-base leading-none">«</span> Volver al OS
        </Link>
      )}
    </div>
  )
}
