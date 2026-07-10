import { db } from '@/lib/db';
import Link from 'next/link';
import ExportarRecetasBtn from '@/components/ExportarRecetasBtn';

export default async function RecetasPage() {
  const recetas = await db`
    SELECT r.id_receta, r.nombre_receta, cr.nombre_categoria
    FROM Receta r
    LEFT JOIN Categoria_Receta cr ON r.id_categoria_receta = cr.id_categoria_receta
    ORDER BY r.nombre_receta ASC
  `;

  // Agrupar por categoría
  type RecetaRow = (typeof recetas)[number];
  const porCategoria: Record<string, RecetaRow[]> = {};
  recetas.forEach(r => {
    const cat = r.nombre_categoria || 'Sin categoría';
    if (!porCategoria[cat]) porCategoria[cat] = [];
    porCategoria[cat].push(r);
  });
  const categorias = Object.keys(porCategoria).sort();

  return (
    <div>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <span className="overline">BOM · Fichas Técnicas</span>
            <h1>Catálogo de <em>Recetas</em></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
              {recetas.length} receta{recetas.length !== 1 ? 's' : ''} · {categorias.length} categoría{categorias.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Link href="/recetas/importar" className="btn btn-outline" style={{ borderColor: 'var(--primary-color)' }}>
              🧹 Pulir / Importar ERP
            </Link>
            <ExportarRecetasBtn />
            <Link href="/recetas/nuevo" className="btn">
              + Nueva Receta
            </Link>
          </div>
        </div>
      </div>

      {/* ── TABLA DE RECETAS ── */}
      {recetas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">📖</span>
            No hay recetas registradas aún.
            <div style={{ marginTop: '1rem' }}>
              <Link href="/recetas/nuevo" className="btn">Crear primera receta →</Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Nombre de la Receta</th>
                <th>Categoría</th>
                <th style={{ width: '200px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {recetas.map(receta => (
                <tr key={receta.id_receta}>
                  <td>
                    <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                      #{receta.id_receta}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{receta.nombre_receta}</td>
                  <td>
                    {receta.nombre_categoria && (
                      <span className="badge">{receta.nombre_categoria}</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <Link href={`/recetas/${receta.id_receta}`} className="btn-action">
                        📋 Ver BOM
                      </Link>
                      <Link href={`/recetas/${receta.id_receta}/editar`} className="btn-action btn-action-edit">
                        ✏️ Editar
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
