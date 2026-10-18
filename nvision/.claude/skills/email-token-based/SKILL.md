---
name: email-token-based
scope: template
description: |
  Instala el sistema de emails SIN Supabase (custom token-based auth flow): TODO el correo
  sale por Resend con tokens propios; Supabase Auth (GoTrue) NO envia ni un solo email.
  Crea tabla auth_tokens, motor sendEmail() unico, plantillas branded, flujos request/confirm
  de reset de contraseña y confirmacion de email, signup sin email de Supabase, y webhook de
  Resend con auto-suppression de bounces/complaints (soporta cientos/miles de emails).

  Usar cuando: "emails sin supabase", "custom token flow", "auth emails con resend",
  "que supabase no mande correos", "email token based", "reset password con resend",
  "confirmacion de email propia", "bypass de emails de supabase auth", "soportar muchos emails".

  Pre-requisito: /add-login (necesita profiles + auth en Supabase) + cuenta Resend.
  NO USAR para: email marketing masivo, push notifications.
allowed-tools: Bash(npm *), Bash(npx *), Read, Write, Edit, Glob, Grep
---

# Email Token-Based — sistema de emails sin Supabase (production-grade)

Instala la metodologia **custom token-based auth flow**: Supabase NUNCA envia un correo;
todo sale por Resend con tokens propios. Incluye webhook + auto-suppression para soportar
volumen alto sin quemar la reputacion de envio.

NO PREGUNTES. Ejecuta el Golden Path completo.

## Principio (no romper)

- Supabase/GoTrue no manda ningun email. Solo se usa su Admin API + la BD.
- Un unico punto de envio: `sendEmail()` (Resend).
- Tokens propios en `auth_tokens` (TTL + single-use).
- PROHIBIDO: `auth.resetPasswordForEmail`, `auth.signInWithOtp`, `signUp` con confirmacion nativa, o cualquier email nativo de Supabase.
- NO es el "Custom SMTP" de Supabase. Aqui Supabase no toca el correo.

## Pre-requisitos

1. `/add-login` ejecutado (existe `profiles` con columna `email` + `auth.users`).
2. Cuenta Resend con dominio verificado.
3. `npm install resend svix`

## Variables de entorno (.env.local)

```
RESEND_API_KEY=re_xxx
RESEND_WEBHOOK_SECRET=whsec_xxx          # secreto del webhook (Resend > Webhooks)
EMAIL_FROM="Tu App <noreply@tudominio.com>"
EMAIL_REPLY_TO="hola@tudominio.com"
NEXT_PUBLIC_APP_NAME="Tu App"
NEXT_PUBLIC_SITE_URL=https://tudominio.com
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Archivos a crear

### 1. Migracion SQL — `supabase/migrations/$(date +%Y%m%d%H%M%S)_email_token_based.sql`

```sql
-- Custom token-based auth flow: Supabase no envia emails, los manda Resend.

-- Nucleo: tokens propios para reset/confirmacion/invitacion/magic-link.
create table if not exists public.auth_tokens (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('password_reset','email_confirmation','invitation','magic_link')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists auth_tokens_token_idx on public.auth_tokens(token);
create index if not exists auth_tokens_email_type_idx on public.auth_tokens(email, type, created_at);
alter table public.auth_tokens enable row level security;
-- Sin policies a proposito: solo el service role (que bypassa RLS) opera estas tablas.

-- Tracking de cada envio.
create table if not exists public.email_messages (
  id uuid primary key default gen_random_uuid(),
  resend_id text,
  to_email text not null,
  from_email text,
  subject text,
  tag text,
  template_name text,
  status text not null default 'sent' check (status in ('sent','failed','delivered','bounced','complained')),
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists email_messages_resend_idx on public.email_messages(resend_id);
alter table public.email_messages enable row level security;

-- Historial de eventos del webhook de Resend (delivered/opened/clicked/bounced/complained).
create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  resend_id text,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.email_events enable row level security;

-- Bloqueados/bajas. sendEmail() consulta esto antes de enviar; el webhook la rellena con bounces/complaints.
create table if not exists public.email_suppressions (
  email text primary key,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.email_suppressions enable row level security;
```

### 2. Service role client — `src/lib/supabase/service.ts` (crear si no existe)

```typescript
import { createClient } from '@supabase/supabase-js'

export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service role env vars no configuradas')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
```

### 3. Motor de envio unico — `src/lib/email/server.ts`

```typescript
import { Resend } from 'resend'
import { createServiceRoleClient } from '@/lib/supabase/service'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const EMAIL_FROM = process.env.EMAIL_FROM || 'App <noreply@example.com>'
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || undefined

let resend: Resend | null = null
function getResend(): Resend | null {
  if (!RESEND_API_KEY) return null
  if (!resend) resend = new Resend(RESEND_API_KEY)
  return resend
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
  replyTo?: string
  tag?: string
  templateName?: string
  metadata?: Record<string, unknown>
}
export interface SendEmailResult { ok: boolean; id?: string; error?: string; skipped?: boolean }

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const client = getResend()
  if (!client) return { ok: false, skipped: true, error: 'RESEND_API_KEY no configurada' }

  const list = Array.isArray(input.to) ? input.to : [input.to]
  const cleanTo = list.map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (cleanTo.length === 0) return { ok: false, error: 'Sin destinatarios.' }

  const admin = createServiceRoleClient()
  const { data: suppressed } = await admin.from('email_suppressions').select('email').in('email', cleanTo)
  if (suppressed && suppressed.length > 0) {
    const blocked = suppressed.map((s: { email: string }) => s.email)
    const remaining = cleanTo.filter((e) => !blocked.includes(e))
    if (remaining.length === 0) return { ok: false, skipped: true, error: 'Destinatarios bloqueados (suppressed).' }
    cleanTo.splice(0, cleanTo.length, ...remaining)
  }

  const fromAddr = input.from || EMAIL_FROM
  const baseRow = {
    to_email: cleanTo[0], from_email: fromAddr, subject: input.subject,
    tag: input.tag ?? null, template_name: input.templateName ?? null, metadata: input.metadata ?? {},
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromAddr, to: cleanTo, subject: input.subject, html: input.html, text: input.text,
      replyTo: input.replyTo || EMAIL_REPLY_TO,
      tags: input.tag ? [{ name: 'category', value: input.tag }] : undefined,
    })
    if (error) {
      await admin.from('email_messages').insert({ ...baseRow, resend_id: null, status: 'failed', error_message: error.message }).then(() => null, () => null)
      return { ok: false, error: error.message }
    }
    await admin.from('email_messages').insert({ ...baseRow, resend_id: data?.id ?? null, status: 'sent' }).then(() => null, () => null)
    return { ok: true, id: data?.id }
  } catch (err) {
    const message = (err as Error).message
    await admin.from('email_messages').insert({ ...baseRow, resend_id: null, status: 'failed', error_message: message }).then(() => null, () => null)
    return { ok: false, error: message }
  }
}
```

### 4. Plantillas — `src/lib/email/templates/`

`_base-layout.ts`:

```typescript
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'App'

export function baseLayout(opts: { preview?: string; bodyHtml: string }): string {
  const preview = opts.preview ? `<span style="display:none;opacity:0">${opts.preview}</span>` : ''
  return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;background:#0f0f13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">${preview}
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="100%" style="max-width:560px" cellpadding="0" cellspacing="0">
<tr><td style="background:#09090b;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center;color:#f4f4f5;font-size:18px;font-weight:bold">${APP_NAME}</td></tr>
<tr><td style="background:#18181b;padding:32px;color:#f4f4f5">${opts.bodyHtml}</td></tr>
<tr><td style="background:#09090b;padding:16px 32px;border-radius:0 0 12px 12px;color:#71717a;font-size:12px;text-align:center">Recibiste este correo porque tienes una cuenta en ${APP_NAME}.</td></tr>
</table></td></tr></table></body></html>`
}

export function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#683ACC;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold">${label}</a>`
}
```

`password-reset.ts`:

```typescript
import { baseLayout, button } from './_base-layout'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'App'

export function renderPasswordResetEmail(opts: { resetLink: string }): { subject: string; html: string; text: string } {
  const html = baseLayout({
    preview: 'Restablece tu contraseña',
    bodyHtml: `
      <h1 style="margin:0 0 16px;font-size:24px">Restablece tu contraseña</h1>
      <p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px">Pulsa el boton para crear una nueva contraseña. El enlace caduca en 24 horas y solo funciona una vez.</p>
      <div style="text-align:center;margin:32px 0">${button(opts.resetLink, 'Crear nueva contraseña')}</div>
      <p style="color:#71717a;font-size:13px">Si no pediste esto, ignora este correo.</p>`,
  })
  return { subject: 'Restablece tu contraseña', html, text: `Restablece tu contraseña en ${APP_NAME}: ${opts.resetLink} (caduca en 24h, un solo uso).` }
}
```

`email-confirmation.ts`:

```typescript
import { baseLayout, button } from './_base-layout'
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'App'

export function renderEmailConfirmationEmail(opts: { confirmLink: string }): { subject: string; html: string; text: string } {
  const html = baseLayout({
    preview: 'Confirma tu cuenta',
    bodyHtml: `
      <h1 style="margin:0 0 16px;font-size:24px">Confirma tu cuenta</h1>
      <p style="color:#a1a1aa;font-size:16px;line-height:1.6;margin:0 0 24px">Pulsa el boton para activar tu cuenta. El enlace caduca en 24 horas.</p>
      <div style="text-align:center;margin:32px 0">${button(opts.confirmLink, 'Confirmar mi cuenta')}</div>`,
  })
  return { subject: `Confirma tu cuenta en ${APP_NAME}`, html, text: `Confirma tu cuenta en ${APP_NAME}: ${opts.confirmLink}` }
}
```

### 5. Flujo reset de contraseña (con throttle anti-abuso)

`src/app/api/auth/reset-password/request/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/server'
import { renderPasswordResetEmail } from '@/lib/email/templates/password-reset'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const TOKEN_TTL_HOURS = 24
const MAX_PER_WINDOW = 3
const WINDOW_MIN = 10

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string }
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !/^.+@.+\..+$/.test(email)) return Response.json({ error: 'email invalido' }, { status: 400 })

  const supabase = createServiceRoleClient()

  // Throttle: max MAX_PER_WINDOW solicitudes por email en WINDOW_MIN minutos.
  const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString()
  const { count } = await supabase.from('auth_tokens')
    .select('id', { count: 'exact', head: true })
    .eq('email', email).eq('type', 'password_reset').gte('created_at', since)
  if ((count ?? 0) >= MAX_PER_WINDOW) return Response.json({ ok: true, sent: true }) // anti-leak + anti-abuso

  const { data: profile } = await supabase.from('profiles').select('id, email').ilike('email', email).maybeSingle()
  if (!profile) return Response.json({ ok: true, sent: true }) // anti-leak

  const p = profile as { id: string; email: string }
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TOKEN_TTL_HOURS * 3600 * 1000).toISOString()
  const { error: insErr } = await supabase.from('auth_tokens').insert({ token, email: p.email, user_id: p.id, type: 'password_reset', expires_at: expiresAt })
  if (insErr) return Response.json({ error: insErr.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { subject, html, text } = renderPasswordResetEmail({ resetLink: `${baseUrl}/auth/reset-password?token=${token}` })
  const result = await sendEmail({ to: p.email, subject, html, text, tag: 'auth_password_reset', templateName: 'password-reset' })
  if (!result.ok) return Response.json({ error: result.error }, { status: 500 })
  return Response.json({ ok: true, sent: true })
}
```

`src/app/api/auth/reset-password/confirm/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; password?: string }
  const token = (body.token ?? '').trim()
  const password = body.password ?? ''
  if (!token) return Response.json({ error: 'Token invalido' }, { status: 400 })
  if (!password || password.length < 8) return Response.json({ error: 'La contraseña debe tener minimo 8 caracteres' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: row } = await supabase.from('auth_tokens').select('id, user_id, expires_at, used_at').eq('token', token).eq('type', 'password_reset').maybeSingle()
  if (!row) return Response.json({ error: 'Token invalido o caducado' }, { status: 400 })

  const r = row as { id: string; user_id: string | null; expires_at: string; used_at: string | null }
  if (r.used_at) return Response.json({ error: 'Este enlace ya fue usado. Pide otro nuevo.' }, { status: 400 })
  if (new Date(r.expires_at) < new Date()) return Response.json({ error: 'El enlace ha caducado. Pide otro nuevo.' }, { status: 400 })
  if (!r.user_id) return Response.json({ error: 'Usuario no encontrado' }, { status: 400 })

  const { error: updErr } = await supabase.auth.admin.updateUserById(r.user_id, { password })
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 })
  await supabase.from('auth_tokens').update({ used_at: new Date().toISOString() }).eq('id', r.id)
  return Response.json({ ok: true })
}
```

`src/app/auth/reset-password/page.tsx`:

```tsx
'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    setLoading(true)
    const res = await fetch('/api/auth/reset-password/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error || 'Error'); return }
    setDone(true)
    setTimeout(() => router.push('/login'), 1500)
  }

  if (!token) return <p className="text-center text-sm text-muted-foreground">Enlace invalido.</p>
  if (done) return <p className="text-center">Contraseña actualizada. Redirigiendo...</p>
  return (
    <form onSubmit={submit} className="mx-auto flex max-w-sm flex-col gap-3 p-4">
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva contraseña" minLength={8} required className="rounded-lg border px-3 py-3 text-base" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" minLength={8} required className="rounded-lg border px-3 py-3 text-base" />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <button disabled={loading} className="rounded-lg bg-primary px-4 py-3 font-semibold text-white disabled:opacity-60">{loading ? 'Guardando...' : 'Guardar contraseña'}</button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetForm /></Suspense>
}
```

### 6. Flujo confirmacion de email

`src/app/api/auth/email-confirmation/request/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import crypto from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/server'
import { renderEmailConfirmationEmail } from '@/lib/email/templates/email-confirmation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const TTL_HOURS = 24

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { email?: string }
  const email = (body.email ?? '').trim().toLowerCase()
  if (!email) return Response.json({ error: 'email invalido' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: profile } = await supabase.from('profiles').select('id, email').ilike('email', email).maybeSingle()
  if (!profile) return Response.json({ ok: true })
  const p = profile as { id: string; email: string }

  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString()
  await supabase.from('auth_tokens').insert({ token, email: p.email, user_id: p.id, type: 'email_confirmation', expires_at: expiresAt })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { subject, html, text } = renderEmailConfirmationEmail({ confirmLink: `${baseUrl}/auth/confirm-email?token=${token}` })
  await sendEmail({ to: p.email, subject, html, text, tag: 'auth_email_confirmation', templateName: 'email-confirmation' })
  return Response.json({ ok: true })
}
```

`src/app/api/auth/email-confirmation/confirm/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { token?: string }
  const token = (body.token ?? '').trim()
  if (!token) return Response.json({ error: 'Token invalido' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const { data: row } = await supabase.from('auth_tokens').select('id, user_id, expires_at, used_at').eq('token', token).eq('type', 'email_confirmation').maybeSingle()
  if (!row) return Response.json({ error: 'Token invalido o caducado' }, { status: 400 })
  const r = row as { id: string; user_id: string | null; expires_at: string; used_at: string | null }
  if (r.used_at) return Response.json({ error: 'Este enlace ya fue usado.' }, { status: 400 })
  if (new Date(r.expires_at) < new Date()) return Response.json({ error: 'El enlace ha caducado.' }, { status: 400 })
  if (!r.user_id) return Response.json({ error: 'Usuario no encontrado' }, { status: 400 })

  const { error: updErr } = await supabase.auth.admin.updateUserById(r.user_id, { email_confirm: true })
  if (updErr) return Response.json({ error: updErr.message }, { status: 500 })
  await supabase.from('auth_tokens').update({ used_at: new Date().toISOString() }).eq('id', r.id)
  return Response.json({ ok: true })
}
```

`src/app/auth/confirm-email/page.tsx`:

```tsx
'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ConfirmEmail() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setState('error'); setError('Enlace invalido.'); return }
    void (async () => {
      const res = await fetch('/api/auth/email-confirmation/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setState('error'); setError(data.error || 'No se pudo confirmar.'); return }
      setState('ok')
      setTimeout(() => router.push('/login'), 1500)
    })()
  }, [token, router])

  return (
    <div className="mx-auto max-w-sm p-6 text-center">
      {state === 'loading' && <p>Confirmando tu cuenta...</p>}
      {state === 'ok' && <p>Cuenta confirmada. Redirigiendo...</p>}
      {state === 'error' && <p className="text-red-500">{error}</p>}
    </div>
  )
}

export default function ConfirmEmailPage() {
  return <Suspense fallback={null}><ConfirmEmail /></Suspense>
}
```

### 7. Signup sin email de Supabase — `src/app/auth/signup-actions.ts`

```typescript
'use server'
import crypto from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/email/server'
import { renderEmailConfirmationEmail } from '@/lib/email/templates/email-confirmation'

const TTL_HOURS = 24

// Crea el usuario SIN que Supabase mande correo (email_confirm:false) y dispara
// nuestra confirmacion por token + Resend.
export async function signUpWithEmailConfirmation(email: string, password: string) {
  const e = email.trim().toLowerCase()
  const supabase = createServiceRoleClient()
  const { data, error } = await supabase.auth.admin.createUser({ email: e, password, email_confirm: false })
  if (error) return { ok: false, error: error.message }

  const userId = data.user?.id ?? null
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + TTL_HOURS * 3600 * 1000).toISOString()
  await supabase.from('auth_tokens').insert({ token, email: e, user_id: userId, type: 'email_confirmation', expires_at: expiresAt })

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const { subject, html, text } = renderEmailConfirmationEmail({ confirmLink: `${baseUrl}/auth/confirm-email?token=${token}` })
  await sendEmail({ to: e, subject, html, text, tag: 'auth_email_confirmation', templateName: 'email-confirmation' })
  return { ok: true, userId }
}
```

### 8. Webhook de Resend (escala: status + auto-suppression) — `src/app/api/webhooks/resend/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { Webhook } from 'svix'
import { createServiceRoleClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET

interface ResendEvent { type: string; data: { email_id?: string; to?: string[] } }

export async function POST(req: NextRequest) {
  const payload = await req.text()
  let evt: ResendEvent
  if (WEBHOOK_SECRET) {
    try {
      evt = new Webhook(WEBHOOK_SECRET).verify(payload, {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
      }) as ResendEvent
    } catch {
      return new Response('invalid signature', { status: 400 })
    }
  } else {
    evt = JSON.parse(payload) as ResendEvent
  }

  const admin = createServiceRoleClient()
  const emailId = evt.data?.email_id ?? null
  await admin.from('email_events').insert({ resend_id: emailId, type: evt.type, payload: evt }).then(() => null, () => null)

  const statusMap: Record<string, string> = { 'email.delivered': 'delivered', 'email.bounced': 'bounced', 'email.complained': 'complained' }
  const newStatus = statusMap[evt.type]
  if (emailId && newStatus) {
    await admin.from('email_messages').update({ status: newStatus }).eq('resend_id', emailId).then(() => null, () => null)
  }
  // Higiene de entregabilidad: bounce/complaint -> suppress (no volver a enviar a ese email).
  if (evt.type === 'email.bounced' || evt.type === 'email.complained') {
    const tos = Array.isArray(evt.data?.to) ? evt.data.to : []
    for (const addr of tos) {
      await admin.from('email_suppressions').upsert({ email: addr.toLowerCase(), reason: evt.type }, { onConflict: 'email' }).then(() => null, () => null)
    }
  }
  return Response.json({ ok: true })
}
```

Tras desplegar: en Resend > Webhooks, apuntar a `https://<dominio>/api/webhooks/resend` y copiar el signing secret a `RESEND_WEBHOOK_SECRET`.

## Conversion desde add-login (pasar el proyecto a Opcion token-based)

Si el proyecto corrio `/add-login` antes, este skill DEBE dejar el proyecto 100% sin emails de Supabase. Buscar y reemplazar:

1. **Reset**: cualquier llamada a `supabase.auth.resetPasswordForEmail(...)` en el form de "olvide contraseña" -> reemplazar por `fetch('/api/auth/reset-password/request', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email }) })`.
2. **Signup**: cualquier `supabase.auth.signUp({...})` que dispare confirmacion nativa -> reemplazar por `signUpWithEmailConfirmation(email, password)` (paso 7).
3. **Copy**: quitar textos del tipo "te enviamos un enlace de confirmacion" que asuman email de Supabase; la confirmacion ahora es nuestra.

Grep guia: `grep -rn "resetPasswordForEmail\|signInWithOtp\|\.signUp(" src/`.

## Como extender (invitacion, magic link)

Copiar el patron request/confirm cambiando 2 cosas: el `type` en `auth_tokens` y la accion del confirm (Admin API). Ej. invitacion -> `type='invitation'`, el confirm crea/asigna rol; magic link -> `type='magic_link'`, el confirm crea sesion. SIEMPRE token propio + envio por `sendEmail()`.

## Flujo de ejecucion

1. Verificar `/add-login` (existe `profiles` con `email`). Si no, decir al dueño que corra `/add-login` primero.
2. `npm install resend svix`.
3. Crear TODOS los archivos (crear `src/lib/supabase/service.ts` solo si no existe).
4. Aplicar la migracion via Supabase MCP (`apply_migration`).
5. **Conversion desde add-login**: aplicar la seccion de arriba (reemplazar resetPasswordForEmail + signUp + copy).
6. Recordar al dueño: configurar env vars, verificar dominio en Resend, y crear el webhook en Resend.
7. Auto-actualizar `BUSINESS_LOGIC.md`.
8. Mensaje final.

## Mensaje final

```
Sistema de emails sin Supabase instalado (custom token-based auth flow, production-grade).

Supabase Auth NO envia correos. Todo sale por Resend con tokens propios + webhook que
maneja bounces/complaints (soporta volumen alto).

Configura en .env.local:
  RESEND_API_KEY, RESEND_WEBHOOK_SECRET, EMAIL_FROM, EMAIL_REPLY_TO,
  NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_SITE_URL, SUPABASE_SERVICE_ROLE_KEY

Pasos manuales:
  1. Verifica tu dominio en Resend (DNS).
  2. Crea el webhook en Resend -> https://<dominio>/api/webhooks/resend -> copia el secret.

Regla: en signup usa signUpWithEmailConfirmation().
PROHIBIDO: resetPasswordForEmail / signInWithOtp / signUp con confirmacion nativa.
```

---

## REGLA OBLIGATORIA — Auto-actualizar BUSINESS_LOGIC.md

Al final de la ejecucion exitosa, ANTES del mensaje final:

1. Lee `BUSINESS_LOGIC.md` en la raiz.
2. En `## 6. Plugins instalados` añade:

```
### Email Token-Based (custom token-based auth flow)
- **Activado:** [YYYY-MM-DD]
- **Cuadrante principal:** Producto
- **Carpeta:** src/lib/email + src/app/api/auth + src/app/api/webhooks/resend
- **Tablas Supabase:** auth_tokens, email_messages, email_events, email_suppressions
- **Integraciones externas:** Resend (envio + webhook via svix)
- **Variables de entorno:** RESEND_API_KEY, RESEND_WEBHOOK_SECRET, EMAIL_FROM, EMAIL_REPLY_TO, NEXT_PUBLIC_APP_NAME, NEXT_PUBLIC_SITE_URL, SUPABASE_SERVICE_ROLE_KEY
- **Que hace:** todos los emails (auth + transaccionales) salen por Resend con tokens propios; Supabase Auth no envia nada; webhook maneja bounces/complaints.
```

3. Si añade tablas, registralas en `## 5.2 Tablas añadidas por plugins`.
4. Guarda el archivo.

Regla **no negociable**: si no se actualiza el BL, el plugin se considera no documentado.
