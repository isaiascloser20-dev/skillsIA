'use client'

import { useState } from 'react'

/* Perfil del OS: cuenta (email + contraseña) + ajustes (notificaciones PWA).
 * Placeholder funcional: el cambio de contraseña real lo cablea add-login y
 * las notificaciones push las cablea add-mobile (PWA). Usa el token `brand`. */
export function PerfilClient({ email }: { email: string }) {
  const [notif, setNotif] = useState(false)
  const card = 'rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6'

  return (
    <div className="mx-auto max-w-2xl p-6 pt-16 sm:p-10 md:pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">Perfil</p>
      <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Tu cuenta</h1>

      <div className={`mt-6 ${card}`}>
        <h2 className="text-sm font-bold text-neutral-200">Cuenta</h2>
        <div className="mt-4 space-y-3">
          <Row label="Email">
            <span className="text-sm text-neutral-300">{email || 'Sin email'}</span>
          </Row>
          <Row label="Contraseña">
            <button className="rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-neutral-200 hover:border-white/25 hover:text-white">
              Cambiar
            </button>
          </Row>
        </div>
      </div>

      <div className={`mt-4 ${card}`}>
        <h2 className="text-sm font-bold text-neutral-200">Ajustes</h2>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-neutral-200">Notificaciones</p>
            <p className="mt-0.5 text-xs text-neutral-400">Recibe avisos en tu dispositivo (requiere instalar la app).</p>
          </div>
          <button
            onClick={() => setNotif((v) => !v)}
            role="switch"
            aria-checked={notif}
            aria-label="Activar notificaciones"
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${notif ? 'bg-brand' : 'bg-white/15'}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${notif ? 'left-6' : 'left-1'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-white/5 pt-3 first:border-0 first:pt-0">
      <span className="text-xs uppercase tracking-wide text-neutral-500">{label}</span>
      {children}
    </div>
  )
}
