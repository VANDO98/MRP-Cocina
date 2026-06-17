import { db } from '@/lib/db';

export default async function InsumosPage() {
  const insumos = await db`
    SELECT i.id_insumo, i.nombre_insumo, ci.nombre_categoria, u.simbolo
    FROM Insumo i
    LEFT JOIN Categoria_Insumo ci ON i.id_categoria_insumo = ci.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY i.nombre_insumo ASC
  `;

  return (
    <div>
      <h1>Catálogo de Insumos</h1>
      <p style={{ marginBottom: '2rem' }}>Lista de insumos disponibles con sus categorías y unidades de medida.</p>

      <table style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
        <thead>
          <tr style={{ backgroundColor: '#f3f4f6' }}>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>ID</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Nombre del Insumo</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Categoría</th>
            <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Unidad de Medida</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map(insumo => (
            <tr key={insumo.id_insumo} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{insumo.id_insumo}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontWeight: 600 }}>{insumo.nombre_insumo}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{insumo.nombre_categoria}</td>
              <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{insumo.simbolo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
