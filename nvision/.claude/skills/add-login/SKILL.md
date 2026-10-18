---
name: add-login
scope: template
description: "Inyectar sistema de autenticacion completo: login, signup, password reset, profiles, Google OAuth, y RLS. Activar cuando el usuario dice: necesito login, agregar registro, autenticacion, que los usuarios puedan entrar, crear cuentas, o proteger rutas."
allowed-tools: Read, Write, Edit, Bash
---

# Sistema de Autenticacion Completo

Inyecta autenticacion B2B production-ready con Supabase + Next.js 16.

**NO preguntes. Ejecuta el Golden Path completo.**

---

## Contexto Tecnico

**Next.js 16:**
- `proxy.ts` (no middleware.ts) - Node.js runtime
- Funcion: `proxy()` (no middleware())

**Supabase SSR:**
- `@supabase/ssr` con `getAll()` / `setAll()` (NUNCA get/set/remove)
- Server: siempre `getUser()`, NUNCA `getSession()`

**Patron Profiles:**
- `auth.users` es privado y limitado
- `public.profiles` almacena datos del usuario
- Trigger crea perfil automaticamente al signup

**Google OAuth:**
- Supabase tiene Google OAuth built-in (NO se necesita NextAuth)
- `signInWithOAuth({ provider: 'google' })` maneja el redirect completo
- `access_type: 'offline'` + `prompt: 'consent'` para obtener refresh tokens
- Callback route en `/callback` intercambia code por sesión
- Futuro: refresh tokens permiten integrar Google Workspace (Gmail, Calendar, Sheets)

---

## Archivos a Crear

> ⚠️ **SOLO PANTALLAS DE AUTH.** Esta skill construye **únicamente** las pantallas de auth (login, signup, reset/update password, callback) — **nada de landing, marketing ni otras pantallas**.
>
> **El branding ya está puesto — NO lo rebrandees a mano.** `new-ecoai` define el color de marca del proyecto (token `brand` en `globals.css` + `tailwind.config.ts`) ANTES de que se ejecute add-login. Las plantillas de abajo usan ese token (`bg-brand`, `ring-brand`, `text-brand`, `text-brand-contrast`), así que el login sale **automáticamente con la marca del usuario**. Si el usuario aún no definió su marca, el token está en neutro limpio. **NUNCA** un color de otra marca (ni dorado, ni azul, ni el de NVISION).

### 1. `src/proxy.ts` (va en `src/`, NUNCA en la raíz)

> ⚠️ En proyectos con carpeta `src/` (como este template), Next 16 SOLO detecta el proxy en `src/proxy.ts`. En la raíz lo ignora y las rutas quedan SIN proteger (devuelven 200, no redirigen a /login). Créalo SIEMPRE en `src/proxy.ts`; tras crearlo, limpia la caché con `rm -rf .next` para que se regenere.

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### 2. `src/lib/supabase/proxy.ts`

```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Rutas protegidas: el OS (/dashboard, /knowledge, /perfil — admin) y la APP (/app — clientes).
  // El gate de ROL del OS lo refuerza ademas el layout (admin); aqui cortamos en el edge.
  const isProtectedRoute = ['/dashboard', '/knowledge', '/perfil', '/app'].some((p) =>
    request.nextUrl.pathname.startsWith(p))
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                      request.nextUrl.pathname.startsWith('/signup') ||
                      request.nextUrl.pathname.startsWith('/callback')

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (isAuthRoute && user) {
    // Ya logueado: vuelve a la raiz; la app enruta por rol (admin -> OS, cliente -> APP).
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}
```

### 3. `src/types/database.ts`

```typescript
export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
    }
  }
}
```

### 4. `src/actions/auth.ts`

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Routing por ROL: el dueno/equipo (admin) aterriza en su OS; los clientes, en la APP.
const OS_HOME = '/dashboard'    // el OS arranca en el Dashboard (dentro del shell (admin)/)
const APP_HOME = '/app'         // donde vive la APP (lo que usan tus clientes)

async function postLoginDestination(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return '/login'
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles(name)')
    .eq('id', user.id)
    .single()
  const roleName = (profile as { roles?: { name?: string } } | null)?.roles?.name
  return roleName === 'admin' ? OS_HOME : APP_HOME
}

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(await postLoginDestination(supabase))
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/check-email')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/update-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect(await postLoginDestination(supabase))
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: formData.get('full_name') as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}
```

### 5. `src/hooks/useAuth.ts`

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function getProfile(userId: string) {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      setProfile(data)
    }

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        getProfile(user.id)
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        if (currentUser) {
          getProfile(currentUser.id)
        } else {
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, profile, loading }
}
```

### 6. `src/features/auth/components/LoginForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { login } from '@/actions/auth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { AuthDivider } from './AuthDivider'

export function LoginForm() {
  const searchParams = useSearchParams()
  const oauthError = searchParams.get('error')
  const [error, setError] = useState<string | null>(
    oauthError === 'auth_callback_failed' ? 'Error al iniciar sesión con Google. Intenta de nuevo.' : null
  )
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <GoogleSignInButton />

      <AuthDivider />

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-4 py-2 font-semibold text-brand-contrast hover:bg-brand/90 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <p className="text-center text-sm text-neutral-400">
          <Link href="/forgot-password" className="text-brand hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </p>
      </form>
    </div>
  )
}
```

### 7. `src/features/auth/components/SignupForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { signup } from '@/actions/auth'
import { GoogleSignInButton } from './GoogleSignInButton'
import { AuthDivider } from './AuthDivider'

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <GoogleSignInButton label="Registrarse con Google" />

      <AuthDivider />

      <form action={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-brand px-4 py-2 font-semibold text-brand-contrast hover:bg-brand/90 disabled:opacity-50"
        >
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>
      </form>
    </div>
  )
}
```

### 8. `src/features/auth/components/ForgotPasswordForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { resetPassword } from '@/actions/auth'

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await resetPassword(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <p className="text-emerald-400">Te enviamos un enlace para restablecerla. Revisa tu correo.</p>
      </div>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-2 font-semibold text-brand-contrast hover:bg-brand/90 disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar enlace'}
      </button>
    </form>
  )
}
```

### 9. `src/features/auth/components/UpdatePasswordForm.tsx`

```tsx
'use client'

import { useState } from 'react'
import { updatePassword } from '@/actions/auth'

export function UpdatePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await updatePassword(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium">
          Nueva contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={6}
          className="mt-1 block w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-neutral-100 placeholder-neutral-500 shadow-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-brand px-4 py-2 font-semibold text-brand-contrast hover:bg-brand/90 disabled:opacity-50"
      >
        {loading ? 'Guardando...' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
```

### 10. `src/features/auth/components/index.ts`

```typescript
export { LoginForm } from './LoginForm'
export { SignupForm } from './SignupForm'
export { GoogleSignInButton } from './GoogleSignInButton'
export { AuthDivider } from './AuthDivider'
export { ForgotPasswordForm } from './ForgotPasswordForm'
export { UpdatePasswordForm } from './UpdatePasswordForm'
```

### 11. `src/app/(auth)/login/page.tsx`

```tsx
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components'

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Bienvenido de nuevo</h1>
          <p className="mt-2 text-neutral-400">Entra a tu cuenta</p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-neutral-400">
          ¿No tienes cuenta?{' '}
          <Link href="/signup" className="text-brand hover:underline">
            Crear cuenta
          </Link>
        </p>
      </div>
    </div>
  )
}
```

### 12. `src/app/(auth)/signup/page.tsx`

```tsx
import Link from 'next/link'
import { SignupForm } from '@/features/auth/components'

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Crear cuenta</h1>
          <p className="mt-2 text-neutral-400">Empieza gratis</p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-neutral-400">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-brand hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  )
}
```

### 13. `src/app/(auth)/check-email/page.tsx`

```tsx
import Link from 'next/link'

export default function CheckEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-md space-y-8 p-8 text-center">
        <h1 className="text-3xl font-bold">Revisa tu correo</h1>
        <p className="text-neutral-400">
          Te enviamos un enlace de confirmación. Ábrelo para completar tu registro.
        </p>
        <Link
          href="/login"
          className="inline-block text-brand hover:underline"
        >
          Volver al login
        </Link>
      </div>
    </div>
  )
}
```

### 14. `src/app/(auth)/forgot-password/page.tsx`

```tsx
import Link from 'next/link'
import { ForgotPasswordForm } from '@/features/auth/components'

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Reset password</h1>
          <p className="mt-2 text-neutral-400">Enter your email to receive a reset link</p>
        </div>

        <ForgotPasswordForm />

        <p className="text-center text-sm text-neutral-400">
          <Link href="/login" className="text-brand hover:underline">
            Volver al login
          </Link>
        </p>
      </div>
    </div>
  )
}
```

### 15. `src/app/(auth)/update-password/page.tsx`

```tsx
import { UpdatePasswordForm } from '@/features/auth/components'

export default function UpdatePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-neutral-100">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Set new password</h1>
          <p className="mt-2 text-neutral-400">Enter your new password below</p>
        </div>

        <UpdatePasswordForm />
      </div>
    </div>
  )
}
```

### 16. `src/app/(auth)/callback/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

### 17. `src/features/auth/components/GoogleSignInButton.tsx`

```tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface GoogleSignInButtonProps {
  redirectTo?: string
  label?: string
}

export function GoogleSignInButton({
  redirectTo = '/',
  label = 'Continuar con Google',
}: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleGoogleSignIn() {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback?next=${redirectTo}`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })

    if (error) {
      console.error('Google sign-in error:', error.message)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="flex w-full items-center justify-center gap-3 rounded-md border border-neutral-700 bg-neutral-900 px-4 py-2.5 text-sm font-medium text-neutral-200 shadow-sm transition-colors hover:bg-neutral-800 disabled:opacity-50"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {loading ? 'Redirigiendo...' : label}
    </button>
  )
}
```

### 18. `src/features/auth/components/AuthDivider.tsx`

```tsx
export function AuthDivider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-neutral-700" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="bg-neutral-950 px-2 text-neutral-500">o</span>
      </div>
    </div>
  )
}
```

---

## Flujo de Ejecucion

1. Crear TODOS los archivos de codigo listados arriba
2. Verificar que `@supabase/ssr` este instalado (si no: `npm install @supabase/ssr`)
3. **Usar Supabase MCP para crear la tabla profiles:**

```
Usa el MCP de Supabase con `apply_migration` para ejecutar:

-- Tabla profiles · esquema CANONICO (add-login es el dueño del esquema profiles).
-- 100% idempotente: si ya se ejecuto /new-ecoai (que crea profiles), esto NO rompe
-- ni duplica policies. Mismos nombres de policy que new-ecoai.
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);
-- por si existia una version vieja sin estas columnas
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists avatar_url text;

-- RLS (drop-if-exists antes de create = re-ejecutable, sin duplicar)
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Trigger: crear perfil automaticamente al signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

4. Mostrar mensaje de completacion

---

## Configuración automática de Supabase Auth (ejecútala ANTES del mensaje final)

Deja la auth de Supabase configurada **por API**, sin que el usuario toque el dashboard. Usa el `SUPABASE_ACCESS_TOKEN` y el `project_ref` que ya están en el `.mcp.json` del proyecto (`PORT` = el puerto real donde corre el dev server: 3000/3001…):

```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/PROJECT_REF/config/auth" \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "http://localhost:PORT",
    "uri_allow_list": "http://localhost:PORT/**",
    "mailer_autoconfirm": true
  }'
```

- `site_url` + `uri_allow_list` → para que los redirects de auth funcionen en local.
- `mailer_autoconfirm: true` → desactiva "Confirm email" (el signup loguea al instante; sin esto habría que confirmar por correo).
- Si dudas de los nombres de campo, haz primero un `GET` al mismo endpoint y míralos. **NUNCA muestres el token en el chat.**
- ⚠️ **Role-aware con confirm-email off:** al desactivar la confirmación, tras el signup el usuario queda **auto-logueado** → el redirect post-login DEBE ser role-aware (`postLoginDestination`: admin → OS, cliente → APP). NO mandes ciegamente a la APP, o el admin acaba en la pantalla equivocada.
- **Google OAuth NO se puede automatizar** (requiere Google Cloud) → ese sí queda como paso manual (ver mensaje final).

---

## Mensaje Final

Despues de crear archivos Y ejecutar la migracion, muestra:

```
Auth B2B implementado!

Incluye:
- Login/Signup con Email/Password
- Login/Signup con Google OAuth
- Password Reset completo
- Tabla profiles (creada vía MCP) con full_name y avatar_url de Google
- Hook useAuth() con user + profile
- Rutas protegidas (la APP en /app; el OS se afina en el build)
- Callback OAuth (/callback)
- Action updateProfile() para editar perfil

Configurar credenciales:

1. Ve a supabase.com > tu proyecto > Settings > API
2. Copia a .env.local:

   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   NEXT_PUBLIC_SITE_URL=http://localhost:3000

3. Site URL + Redirect URLs + Confirm email: YA configurados automáticamente por mí vía API (no toques el dashboard).

4. Para Google OAuth:
   a. Google Cloud Console > APIs & Services > Credentials
   b. Crear OAuth 2.0 Client ID (tipo: Web application)
   c. Authorized redirect URI: https://TU_PROJECT_REF.supabase.co/auth/v1/callback
   d. En Supabase Dashboard > Authentication > Providers > Google:
      - Habilitar Google provider
      - Pegar Client ID y Client Secret de Google

5. npm run dev

Auth lista: login/signup/reset ya construidos con la marca del proyecto.
```

---

## REGLA OBLIGATORIA — Auto-actualizar BUSINESS_LOGIC.md

Al final de la ejecución exitosa, ANTES de mostrar el mensaje final al usuario:

1. Lee `BUSINESS_LOGIC.md` en la raíz del proyecto.
2. Localiza la sección `## 6. Plugins instalados`.
3. Añade una entrada nueva con este formato:

```
### [Nombre del plugin]
- **Activado:** [fecha YYYY-MM-DD]
- **Cuadrante principal:** [Marketing / Ventas / Producto / Finanzas]
- **Carpeta:** `src/features/[plugin]`
- **Tablas Supabase:** [si aplica]
- **Knowledges asociados:** [si aplica]
- **Integraciones externas:** [si aplica]
- **Variables de entorno:** [si aplica]
- **Qué hace:** [una frase descriptiva]
```

4. Si el plugin requiere tablas Supabase nuevas, añade también el detalle en `## 5.2 Tablas añadidas por plugins` (sub-sección de "Arquitectura de Datos").

5. Guarda el archivo.

Esta regla es **no negociable**. Si no se actualiza el BL, el plugin se considera "no documentado" y rompe la regla de "single source of truth" del proyecto.
