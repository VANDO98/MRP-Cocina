import { db } from '@/lib/db';
import Link from 'next/link';

export default async function RecetasPage() {
  const recetas = await db`
    SELECT r.id_receta, r.nombre_receta, cr.nombre_categoria 
    FROM Receta r
    LEFT JOIN Categoria_Receta cr ON r.id_categoria_receta = cr.id_categoria_receta
    ORDER BY r.nombre_receta ASC
  `;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Catálogo de Recetas</h1>
        <Link href="/recetas/nuevo" className="btn" style={{ padding: '0.35rem 1rem', borderRadius: '4px', textDecoration: 'none', border: 'none' }}>
          + Nueva Receta
        </Link>
      </div>

      <table style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>ID</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Nombre de la Receta</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Categoría</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151', width: '200px' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {recetas.map(receta => (
            <tr key={receta.id_receta} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{receta.id_receta}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontWeight: 600 }}>{receta.nombre_receta}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{receta.nombre_categoria}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
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
  );
}
