import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'Órdenes de Producción',
  description: 'Sistema de control de recetas y programación diaria.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        <nav className="header no-print">
          <div>
            <strong style={{ fontSize: '1.2rem' }}>MRP Antigravity</strong>
          </div>
          <div>
            <Link href="/">Dashboard</Link>
            <Link href="/recetas">Recetas</Link>
            <Link href="/insumos">Insumos</Link>
            <Link href="/programas">Programas</Link>
          </div>
        </nav>
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  )
}
