import { db } from '@/lib/db';

export default async function InsumosPage() {
  const insumos = await db`
    SELECT i.id_insumo, i.nombre_insumo, ci.nombre_categoria, u.simbolo
    FROM Insumo i
    LEFT JOIN Categoria_Insumo ci ON i.id_categoria_insumo = ci.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY ci.nombre_categoria ASC, i.nombre_insumo ASC
  `;

  // Agrupar por categoría para mejor navegación
  type InsumoRow = (typeof insumos)[number];
  const porCategoria: Record<string, InsumoRow[]> = {};
  insumos.forEach(i => {
    const cat = i.nombre_categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(i);
  });
  const categorias = Object.keys(porCategoria).sort();

  return (
    <div>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <span className="overline">Inventario · Ingredientes</span>
          <h1>Catálogo de <em>Insumos</em></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
            {insumos.length} insumo{insumos.length !== 1 ? 's' : ''} · {categorias.length} categoría{categorias.length !== 1 ? 's' : ''}
          </p>
        </div>
        <a href="/insumos/nuevo" className="btn">+ Nuevo Insumo</a>
      </div>

      {/* ── TABLA DE INSUMOS ── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '60px' }}>ID</th>
              <th>Nombre del Insumo</th>
              <th>Categoría</th>
              <th style={{ width: '120px', textAlign: 'center' }}>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {insumos.map(insumo => (
              <tr key={insumo.id_insumo}>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                    #{insumo.id_insumo}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{insumo.nombre_insumo}</td>
                <td>
                  {insumo.nombre_categoria && (
                    <span className="badge">{insumo.nombre_categoria}</span>
                  )}
                </td>
                <td style={{ textAlign: 'center' }}>
                  {insumo.simbolo && (
                    <span className="badge badge-accent" style={{ fontFamily: 'var(--font-ui)', fontWeight: 600 }}>
                      {insumo.simbolo}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {insumos.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <span className="empty-state-icon">🧅</span>
                    No hay insumos registrados.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
