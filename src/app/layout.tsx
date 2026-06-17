import './globals.css'
import Link from 'next/link'

export const metadata = {
  title: 'MRP Cocina — Sistema de Producción',
  description: 'Sistema de control de recetas, insumos y programación de producción diaria.',
}

const marqueeItems = [
  'Programas de Producción',
  'Consolidado de Insumos',
  'Control de Recetas',
  'Despacho Diario',
  'Catálogo de Insumos',
  'Ratios BOM',
  'Asertividad de Raciones',
  'Exportación Excel',
  'Eficiencia por Turno',
]

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const doubled = [...marqueeItems, ...marqueeItems]

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
            <Link href="/recetas">Recetas</Link>
            <Link href="/insumos">Insumos</Link>
            <Link href="/programas">Programas</Link>
          </div>
        </nav>

        {/* ── CONTENIDO PRINCIPAL ── */}
        <main className="container">
          {children}
        </main>

        {/* ── FOOTER CON CINTA MARQUEE ── */}
        <footer className="footer-marquee no-print">
          <div className="marquee-track">
            {doubled.map((item, i) => (
              <span key={i} className="marquee-item">
                {item}
                <span className="marquee-sep">/</span>
              </span>
            ))}
          </div>
        </footer>
      </body>
    </html>
  )
}
