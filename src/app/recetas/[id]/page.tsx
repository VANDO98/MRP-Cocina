import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function RecetaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const recetas = await db`
    SELECT r.id_receta, r.nombre_receta, cr.nombre_categoria 
    FROM Receta r
    LEFT JOIN Categoria_Receta cr ON r.id_categoria_receta = cr.id_categoria_receta
    WHERE r.id_receta = ${id}
  `;
  const receta = recetas[0];

  if (!receta) {
    notFound();
  }

  const detalles = await db`
    SELECT rd.cantidad_unitaria, i.nombre_insumo, u.simbolo, ci.nombre_categoria as cat_insumo
    FROM Receta_Detalle rd
    JOIN Insumo i ON rd.id_insumo = i.id_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    LEFT JOIN Categoria_Insumo ci ON i.id_categoria_insumo = ci.id_categoria_insumo
    WHERE rd.id_receta = ${id}
    ORDER BY i.nombre_insumo ASC
  `;

  return (
    <div>
      <Link href="/recetas" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600 }}>
        &larr; Volver a Recetas
      </Link>
      
      <div className="card" style={{ marginTop: '1.5rem', marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.5rem' }}>{receta.nombre_receta}</h1>
        <p style={{ color: 'var(--secondary-color)', fontWeight: 600 }}>Categoría: {receta.nombre_categoria}</p>
      </div>

      <h2>Explosión de Materiales (BOM)</h2>
      {detalles.length === 0 ? (
        <p>No hay insumos registrados para esta receta.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Insumo</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Categoría</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151', textAlign: 'right' }}>Cantidad Unitaria</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151', textAlign: 'center' }}>Unidad</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((d, index) => {
              const cantNum = Number(d.cantidad_unitaria);
              return (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontWeight: 600 }}>{d.nombre_insumo}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{d.cat_insumo}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'right', fontWeight: 'bold' }}>
                    {cantNum.toFixed(6).replace(/\.?0+$/, '')}
                  </td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center', color: '#666' }}>{d.simbolo}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
