import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ValorizacionDiaPage({ params }: { params: Promise<{ fecha: string }> }) {
  const { fecha } = await params;
  
  // 1. Obtener los programas de la fecha
  const programas = await db`SELECT id_programa FROM Programa_Produccion WHERE fecha = ${fecha}`;
  if (programas.length === 0) return <div>No hay programas para esta fecha.</div>;
  const ids = programas.map(p => p.id_programa);

  // 2. Obtener insumos con cantidades del despacho consolidado
  const despachos = await db`
    SELECT
      i.id_insumo,
      i.nombre_insumo,
      c.nombre_categoria,
      u.simbolo,
      i.precio_defecto,
      SUM(dc.cantidad_teorica_calculada) as cantidad_teorica,
      SUM(COALESCE(dc.cantidad_real_entregada, 0)) as cantidad_real
    FROM Despacho_Consolidado dc
    JOIN Insumo i ON dc.id_insumo = i.id_insumo
    LEFT JOIN Categoria_Insumo c ON i.id_categoria_insumo = c.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    WHERE dc.id_programa = ANY(${ids})
    GROUP BY i.id_insumo, i.nombre_insumo, c.nombre_categoria, u.simbolo, i.precio_defecto
  `;

  // 3. Obtener el historial de precios aplicables a esta fecha
  const historiales = await db`
    SELECT id_insumo, precio_unitario 
    FROM Precio_Insumo_Historial 
    WHERE fecha_inicio <= ${fecha}
    ORDER BY fecha_inicio DESC
  `;

  // Crear un mapa para buscar rápidamente el precio vigente (el primero que encontremos, porque ordenamos DESC)
  const mapaPrecios: Record<number, number> = {};
  for (const h of historiales) {
    if (mapaPrecios[h.id_insumo as number] === undefined) {
      mapaPrecios[h.id_insumo as number] = Number(h.precio_unitario);
    }
  }

  // 4. Obtener raciones producidas vs programadas para el cálculo teórico-real
  const recetasData = await db`
    SELECT 
      rd.id_insumo,
      SUM(rd.cantidad_unitaria * pd.raciones_programadas) as total_requerido_proyectado,
      SUM(rd.cantidad_unitaria * COALESCE(pd.raciones_producidas, pd.raciones_programadas)) as total_requerido_producido
    FROM Programa_Detalle pd
    JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
    WHERE pd.id_programa = ANY(${ids})
    GROUP BY rd.id_insumo
  `;

  const mapRecetas: Record<number, { proyectado: number, producido: number }> = {};
  recetasData.forEach(r => {
    mapRecetas[r.id_insumo as number] = {
      proyectado: Number(r.total_requerido_proyectado),
      producido: Number(r.total_requerido_producido)
    };
  });

  // 5. Consolidar datos
  let costoProyectado = 0;
  let costoProducido = 0;
  let costoDespachado = 0;

  const filas = despachos.map(d => {
    const id = d.id_insumo as number;
    const precio = mapaPrecios[id] !== undefined ? mapaPrecios[id] : Number(d.precio_defecto);
    
    const qtyProyectada = mapRecetas[id]?.proyectado || Number(d.cantidad_teorica);
    const qtyProducida = mapRecetas[id]?.producido || 0;
    const qtyRealDespachada = Number(d.cantidad_real);

    const cp = qtyProyectada * precio;
    const cpr = qtyProducida * precio;
    const crd = qtyRealDespachada * precio;

    costoProyectado += cp;
    costoProducido += cpr;
    costoDespachado += crd;

    return {
      nombre: d.nombre_insumo as string,
      categoria: d.nombre_categoria as string,
      simbolo: d.simbolo as string,
      precio,
      qtyProyectada,
      qtyProducida,
      qtyRealDespachada,
      cp, cpr, crd
    };
  }).sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href="/" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem' }}>← Volver al Dashboard</Link>
      </div>

      <h1 style={{ color: 'var(--primary-color)' }}>Reporte de Valorización</h1>
      <p style={{ color: '#666' }}>Fecha de producción: <strong>{fecha}</strong></p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #ccc' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Costo Proyectado Inicial</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>S/. {costoProyectado.toFixed(2)}</h2>
          <p style={{ fontSize: '0.75rem', color: '#999', margin: '0.5rem 0 0 0' }}>Según recetas proyectadas</p>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--primary-color)' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Costo Teórico Producido</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-color)' }}>S/. {costoProducido.toFixed(2)}</h2>
          <p style={{ fontSize: '0.75rem', color: '#999', margin: '0.5rem 0 0 0' }}>Según raciones reales finales</p>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #2e7d32' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Costo Real Despachado</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#2e7d32' }}>S/. {costoDespachado.toFixed(2)}</h2>
          <p style={{ fontSize: '0.75rem', color: '#999', margin: '0.5rem 0 0 0' }}>Según inventario entregado</p>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Categoría</th>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Insumo</th>
              <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Precio (S/.)</th>
              <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Teórico Prod.</th>
              <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Costo T. Prod.</th>
              <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Despacho Real</th>
              <th style={{ padding: '1rem', textAlign: 'right', borderBottom: '2px solid #ddd' }}>Costo Real</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '0.8rem 1rem', color: '#666' }}>{f.categoria}</td>
                <td style={{ padding: '0.8rem 1rem', fontWeight: 500 }}>{f.nombre}</td>
                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#333' }}>{f.precio.toFixed(2)}</td>
                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#555' }}>{f.qtyProducida.toFixed(3)} {f.simbolo}</td>
                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary-color)' }}>{f.cpr.toFixed(2)}</td>
                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', color: '#555' }}>{f.qtyRealDespachada.toFixed(3)} {f.simbolo}</td>
                <td style={{ padding: '0.8rem 1rem', textAlign: 'right', fontWeight: 'bold', color: '#2e7d32' }}>{f.crd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
