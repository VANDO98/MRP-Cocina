import { db } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ValorizacionDiaPage({ params }: { params: Promise<{ fecha: string }> }) {
  const { fecha } = await params;
  
  // 1. Obtener los programas de la fecha (turnos)
  const programas = await db`
    SELECT p.id_programa, t.nombre_turno 
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.fecha = ${fecha}
    ORDER BY t.id_turno ASC
  `;
  if (programas.length === 0) return <div>No hay programas para esta fecha.</div>;
  const ids = programas.map(p => p.id_programa);

  // 2. Obtener insumos con cantidades del despacho consolidado agrupado por id_programa
  const despachos = await db`
    SELECT
      dc.id_programa,
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
    GROUP BY dc.id_programa, i.id_insumo, i.nombre_insumo, c.nombre_categoria, u.simbolo, i.precio_defecto
  `;

  // 3. Obtener el historial de precios aplicables a esta fecha
  const historiales = await db`
    SELECT id_insumo, precio_unitario 
    FROM Precio_Insumo_Historial 
    WHERE fecha_inicio <= ${fecha}
    ORDER BY fecha_inicio DESC
  `;

  const mapaPrecios: Record<number, number> = {};
  for (const h of historiales) {
    if (mapaPrecios[h.id_insumo as number] === undefined) {
      mapaPrecios[h.id_insumo as number] = Number(h.precio_unitario);
    }
  }

  // 4. Obtener raciones producidas vs programadas por id_programa
  const recetasData = await db`
    SELECT 
      pd.id_programa,
      rd.id_insumo,
      SUM(rd.cantidad_unitaria * pd.raciones_programadas) as total_requerido_proyectado,
      SUM(rd.cantidad_unitaria * COALESCE(pd.raciones_producidas, pd.raciones_programadas)) as total_requerido_producido
    FROM Programa_Detalle pd
    JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
    WHERE pd.id_programa = ANY(${ids})
    GROUP BY pd.id_programa, rd.id_insumo
  `;

  const mapRecetas: Record<string, { proyectado: number, producido: number }> = {};
  recetasData.forEach(r => {
    const key = `${r.id_programa}_${r.id_insumo}`;
    mapRecetas[key] = {
      proyectado: Number(r.total_requerido_proyectado),
      producido: Number(r.total_requerido_producido)
    };
  });

  // 5. Consolidar datos por turno
  let granTotalProyectado = 0;
  let granTotalProducido = 0;
  let granTotalDespachado = 0;

  const datosPorTurno = programas.map(prog => {
    let costoProyectado = 0;
    let costoProducido = 0;
    let costoDespachado = 0;

    const insumosDelTurno = despachos.filter(d => d.id_programa === prog.id_programa).map(d => {
      const id = d.id_insumo as number;
      const precio = mapaPrecios[id] !== undefined ? mapaPrecios[id] : Number(d.precio_defecto);
      
      const key = `${prog.id_programa}_${id}`;
      const qtyProyectada = mapRecetas[key]?.proyectado || Number(d.cantidad_teorica);
      const qtyProducida = mapRecetas[key]?.producido || 0;
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

    granTotalProyectado += costoProyectado;
    granTotalProducido += costoProducido;
    granTotalDespachado += costoDespachado;

    return {
      id_programa: prog.id_programa as string,
      nombre_turno: prog.nombre_turno as string,
      costoProyectado,
      costoProducido,
      costoDespachado,
      filas: insumosDelTurno
    };
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ marginBottom: '1rem' }}>
        <Link href={`/programas/dia/${fecha}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem' }}>← Volver al Consolidado Diario</Link>
      </div>

      <h1 style={{ color: 'var(--primary-color)' }}>Reporte de Valorización</h1>
      <p style={{ color: '#666' }}>Fecha de producción: <strong>{fecha}</strong></p>

      {/* GRAN TOTAL DEL DÍA */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #ccc' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Gran Total Proyectado (Día)</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem' }}>S/. {granTotalProyectado.toFixed(2)}</h2>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--primary-color)' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Gran Total Teórico Producido (Día)</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--primary-color)' }}>S/. {granTotalProducido.toFixed(2)}</h2>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #2e7d32' }}>
          <p style={{ fontSize: '0.85rem', color: '#666', textTransform: 'uppercase', margin: '0 0 0.5rem 0' }}>Gran Total Real Despachado (Día)</p>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#2e7d32' }}>S/. {granTotalDespachado.toFixed(2)}</h2>
        </div>
      </div>

      {/* DESGLOSE POR TURNO */}
      {datosPorTurno.map(turno => (
        <div key={turno.id_programa} style={{ marginBottom: '3rem' }}>
          <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Turno: {turno.nombre_turno}</span>
            <span style={{ fontSize: '1.2rem', color: 'var(--primary-color)' }}>Food Cost (T. Prod): S/. {turno.costoProducido.toFixed(2)}</span>
          </h2>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
            <div><strong>Proyectado:</strong> S/. {turno.costoProyectado.toFixed(2)}</div>
            <div style={{ color: 'var(--primary-color)' }}><strong>Teórico Producido:</strong> S/. {turno.costoProducido.toFixed(2)}</div>
            <div style={{ color: '#2e7d32' }}><strong>Real Despachado:</strong> S/. {turno.costoDespachado.toFixed(2)}</div>
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
                {turno.filas.map((f, idx) => (
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
                {turno.filas.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '1rem', textAlign: 'center', color: '#999' }}>No hay insumos para este turno.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
