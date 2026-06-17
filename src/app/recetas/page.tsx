import { db } from '@/lib/db';
import Link from 'next/link';

export default function RecetasPage() {
  const recetas = db.prepare(`
    SELECT r.id_receta, r.nombre_receta, cr.nombre_categoria 
    FROM Receta r
    LEFT JOIN Categoria_Receta cr ON r.id_categoria_receta = cr.id_categoria_receta
    ORDER BY r.nombre_receta ASC
  `).all() as any[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Catálogo de Recetas</h1>
        <Link href="/recetas/nuevo" className="btn" style={{ padding: '0.4rem 1rem', fontSize: '14px' }}>
          + Nueva Receta
        </Link>
      </div>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre de la Receta</th>
            <th>Categoría</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {recetas.map(receta => (
            <tr key={receta.id_receta}>
              <td>{receta.id_receta}</td>
              <td style={{ fontWeight: 600 }}>{receta.nombre_receta}</td>
              <td>{receta.nombre_categoria}</td>
              <td>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Link href={`/recetas/${receta.id_receta}`} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                    Ver BOM
                  </Link>
                  <Link href={`/recetas/${receta.id_receta}/editar`} className="btn" style={{ backgroundColor: '#e2e2e2', color: '#333', border: '1px solid #ccc', padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                    Editar
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
