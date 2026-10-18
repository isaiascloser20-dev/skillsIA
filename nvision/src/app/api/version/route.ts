import { NextResponse } from 'next/server'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

/**
 * Dice QUE version de tu codigo esta sirviendo la web ahora mismo.
 *
 * Lo usa `npm run publicar`: despues de subir, espera aqui hasta que este
 * endpoint devuelve el commit que acaba de publicar. Sin esto, "publicado"
 * seria solo "el push salio bien", que no es lo mismo: el despliegue puede
 * fallar y la web seguir sirviendo lo viejo.
 *
 * No expone nada sensible: solo los 7 primeros caracteres del commit.
 */
export async function GET() {
  const version =
    process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ||
    'local'

  return new NextResponse(
    JSON.stringify({
      version,
      deployed_at: process.env.VERCEL_DEPLOYMENT_CREATED_AT ?? null,
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    },
  )
}
