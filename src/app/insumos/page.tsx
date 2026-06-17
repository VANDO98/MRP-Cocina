import { db } from '@/lib/db';

export default function InsumosPage() {
  const insumos = db.prepare(`
    SELECT i.id_insumo, i.nombre_insumo, ci.nombre_categoria, u.simbolo
    FROM Insumo i
    LEFT JOIN Categoria_Insumo ci ON i.id_categoria_insumo = ci.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY i.nombre_insumo ASC
  `).all() as any[];

  return (
    <div>
      <h1>Catálogo de Insumos</h1>
      <p style={{ marginBottom: '2rem' }}>Lista de insumos disponibles con sus categorías y unidades de medida.</p>

      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre del Insumo</th>
            <th>Categoría</th>
            <th>Unidad de Medida</th>
          </tr>
        </thead>
        <tbody>
          {insumos.map(insumo => (
            <tr key={insumo.id_insumo}>
              <td>{insumo.id_insumo}</td>
              <td style={{ fontWeight: 600 }}>{insumo.nombre_insumo}</td>
              <td>{insumo.nombre_categoria}</td>
              <td>{insumo.simbolo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
