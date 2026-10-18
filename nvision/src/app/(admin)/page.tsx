import { redirect } from 'next/navigation'

// La pantalla inicial (Home) del OS es el Dashboard.
export default function OsIndex() {
  redirect('/dashboard')
}
