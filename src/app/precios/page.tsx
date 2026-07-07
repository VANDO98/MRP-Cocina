import { db } from '@/lib/db';
import PreciosClient from '@/components/PreciosClient';

export const dynamic = 'force-dynamic';

export default async function PreciosPage() {
  const insumosQuery = await db`
    SELECT 
      i.id_insumo, 
      i.nombre_insumo, 
      c.nombre_categoria as categoria_insumo, 
      u.simbolo,
      i.precio_defecto
    FROM Insumo i
    LEFT JOIN Categoria_Insumo c ON i.id_categoria_insumo = c.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY c.nombre_categoria ASC, i.nombre_insumo ASC
  `;

  const historiales = await db`
    SELECT id_precio_historial, id_insumo, TO_CHAR(fecha_inicio, 'YYYY-MM-DD') as fecha_inicio, precio_unitario
    FROM Precio_Insumo_Historial
    ORDER BY fecha_inicio DESC
  `;

  const insumos = insumosQuery.map((i: any) => ({
    ...i,
    precio_defecto: Number(i.precio_defecto),
    historial: historiales.filter((h: any) => h.id_insumo === i.id_insumo).map((h: any) => ({
      ...h,
      precio_unitario: Number(h.precio_unitario)
    }))
  }));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, color: 'var(--primary-color)' }}>Gestión de Precios</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: '#666' }}>Define el precio base de tus insumos o agrega un precio específico a partir de una fecha.</p>
        </div>
      </div>
      <PreciosClient insumos={insumos} />
    </div>
  );
}
