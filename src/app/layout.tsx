import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'MRP Cocina — Sistema de Producción',
  description: 'Sistema de control de recetas, insumos y programación de producción diaria.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {/* ── NAVEGACIÓN PRINCIPAL ── */}
        <nav className="header no-print">
          <Link href="/" className="header-brand">
            MRP <em>Cocina</em>
          </Link>
          <div className="header-nav">
            <Link href="/">Dashboard</Link>
            <Link href="/programas" style={{ color: 'var(--accent)', fontWeight: 600 }}>Programas</Link>
            <Link href="/resaltar-pdf">Picking Almacén</Link>
            
            <div className="nav-dropdown">
              <span className="nav-dropdown-btn">Catálogos ▾</span>
              <div className="nav-dropdown-content">
                <Link href="/recetas">Recetas</Link>
                <Link href="/insumos">Insumos</Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <main className="container">
          {children}
        </main>
      </body>
    </html>
  )
}
