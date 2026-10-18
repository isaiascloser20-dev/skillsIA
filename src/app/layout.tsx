import type { Metadata } from 'next'
import './globals.css'

// new-ecoai reemplaza estos valores por el nombre/marca del proyecto del usuario.
// White-label: el proyecto generado NUNCA lleva branding NVISION.
export const metadata: Metadata = {
  title: 'Mi Proyecto',
  description: 'Mi Ecosistema',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
