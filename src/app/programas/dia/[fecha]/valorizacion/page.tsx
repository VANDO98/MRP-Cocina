import { db } from '@/lib/db';
import Link from 'next/link';
import ExportarValorizacionDiaBtn from '@/components/ExportarValorizacionDiaBtn';

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
  
  if (programas.length === 0) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <Link href="/programas" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem' }}>← Volver a Programas</Link>
        </div>
        <div className="card">
          <div className="empty-state">No hay programas de producción registrados para esta fecha ({fecha}).</div>
        </div>
      </div>
    );
  }

  const ids = programas.map(p => p.id_programa);

  // 2. Obtener el desglose de platos e insumos detallado por programa (turno)
  const recetasDetalle = await db`
    SELECT 
      pd.id_programa,
      r.nombre_receta as plato,
      i.id_insumo,
      i.nombre_insumo as insumo,
      c.nombre_categoria as categoria,
      u.simbolo,
      pd.raciones_programadas,
      pd.raciones_producidas,
      rd.cantidad_unitaria,
      i.precio_defecto
    FROM Programa_Detalle pd
    JOIN Receta r ON pd.id_receta = r.id_receta
    JOIN Receta_Detalle rd ON r.id_receta = rd.id_receta
    JOIN Insumo i ON rd.id_insumo = i.id_insumo
    LEFT JOIN Categoria_Insumo c ON i.id_categoria_insumo = c.id_categoria_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    WHERE pd.id_programa = ANY(${ids})
    ORDER BY r.nombre_receta ASC, c.nombre_categoria ASC, i.nombre_insumo ASC
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

  // 4. Obtener las cantidades reales del despacho consolidado por (id_programa, id_insumo)
  const despachoConsolidado = await db`
    SELECT id_programa, id_insumo, cantidad_real_entregada
    FROM Despacho_Consolidado
    WHERE id_programa = ANY(${ids})
  `;

  const mapDespachoReal: Record<string, number> = {};
  despachoConsolidado.forEach(d => {
    mapDespachoReal[`${d.id_programa}_${d.id_insumo}`] = Number(d.cantidad_real_entregada || 0);
  });

  // 5. Consolidar el teórico por insumo por cada programa para poder prorratear el real
  // key: id_programa_id_insumo -> sum(cantidad_teorica_producida)
  const totalTeoricoPorInsumoYProg: Record<string, number> = {};
  const conteoRecetasPorInsumoYProg: Record<string, number> = {};

  recetasDetalle.forEach(row => {
    const racionesProd = row.raciones_producidas !== null ? Number(row.raciones_producidas) : Number(row.raciones_programadas);
    const qtyProducida = racionesProd * Number(row.cantidad_unitaria);
    const key = `${row.id_programa}_${row.id_insumo}`;
    
    totalTeoricoPorInsumoYProg[key] = (totalTeoricoPorInsumoYProg[key] || 0) + qtyProducida;
    conteoRecetasPorInsumoYProg[key] = (conteoRecetasPorInsumoYProg[key] || 0) + 1;
  });

  // 6. Armar los datos por Turno con la distribución de platos e insumos
  let granTotalProyectado = 0;
  let granTotalProducido = 0;
  let granTotalDespachado = 0;

  const datosPorTurno = programas.map(prog => {
    let costoProyectado = 0;
    let costoProducido = 0;
    let costoDespachado = 0;

    // Filtrar recetas del programa actual
    const filasFiltradas = recetasDetalle.filter(r => r.id_programa === prog.id_programa);

    const filasMapeadas = filasFiltradas.map(row => {
      const idInsumo = row.id_insumo as number;
      const precio = mapaPrecios[idInsumo] !== undefined ? mapaPrecios[idInsumo] : Number(row.precio_defecto);
      
      const racionesProg = Number(row.raciones_programadas);
      const racionesProd = row.raciones_producidas !== null ? Number(row.raciones_producidas) : racionesProg;

      const qtyProyectada = racionesProg * Number(row.cantidad_unitaria);
      const qtyProducida = racionesProd * Number(row.cantidad_unitaria);

      // Prorrateo de despacho real
      const key = `${prog.id_programa}_${idInsumo}`;
      const totalRealDelInsumo = mapDespachoReal[key] || 0;
      const totalTeoricoDelInsumo = totalTeoricoPorInsumoYProg[key] || 0;
      
      let qtyRealDespachada = 0;
      if (totalTeoricoDelInsumo > 0) {
        qtyRealDespachada = totalRealDelInsumo * (qtyProducida / totalTeoricoDelInsumo);
      } else {
        const count = conteoRecetasPorInsumoYProg[key] || 1;
        qtyRealDespachada = totalRealDelInsumo / count;
      }

      const cp = qtyProyectada * precio;
      const cpr = qtyProducida * precio;
      const crd = qtyRealDespachada * precio;

      costoProyectado += cp;
      costoProducido += cpr;
      costoDespachado += crd;

      return {
        plato: row.plato as string,
        porciones: racionesProd,
        categoria: row.categoria as string || 'Otros',
        insumo: row.insumo as string,
        simbolo: row.simbolo as string || '-',
        precio,
        qtyProyectada,
        qtyProducida,
        qtyRealDespachada,
        cp, cpr, crd
      };
    }).sort((a, b) => a.plato.localeCompare(b.plato) || a.categoria.localeCompare(b.categoria) || a.insumo.localeCompare(b.insumo));

    granTotalProyectado += costoProyectado;
    granTotalProducido += costoProducido;
    granTotalDespachado += costoDespachado;

    return {
      id_programa: prog.id_programa as string,
      nombre_turno: prog.nombre_turno as string,
      costoProyectado,
      costoProducido,
      costoDespachado,
      filas: filasMapeadas
    };
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <Link href={`/programas/dia/${fecha}`} style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600 }}>
          ← Volver al Consolidado Diario
        </Link>
        <ExportarValorizacionDiaBtn fecha={fecha} datosPorTurno={datosPorTurno} />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <span className="overline">Reporte Financiero</span>
        <h1 style={{ color: 'var(--primary-color)', margin: '0.2rem 0' }}>Reporte de Valorización</h1>
        <p style={{ color: '#666', margin: 0, fontSize: '0.9rem' }}>Fecha de producción: <strong>{fecha}</strong></p>
      </div>

      {/* GRAN TOTAL DEL DÍA (KPI CARDS) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #ccc', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.05em' }}>
            Gran Total Proyectado (Día)
          </p>
          <h2 style={{ margin: 0, fontSize: '2rem', color: '#1e293b' }}>S/. {granTotalProyectado.toFixed(2)}</h2>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid var(--primary-color)', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.05em' }}>
            Gran Total Teórico Producido (Día)
          </p>
          <h2 style={{ margin: 0, fontSize: '2rem', color: 'var(--primary-color)' }}>S/. {granTotalProducido.toFixed(2)}</h2>
        </div>

        <div className="card" style={{ padding: '1.5rem', textAlign: 'center', borderTop: '4px solid #166534', borderRadius: '8px' }}>
          <p style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700, margin: '0 0 0.5rem 0', letterSpacing: '0.05em' }}>
            Gran Total Real Despachado (Día)
          </p>
          <h2 style={{ margin: 0, fontSize: '2rem', color: '#166534' }}>S/. {granTotalDespachado.toFixed(2)}</h2>
        </div>
      </div>

      {/* DESGLOSE POR TURNO */}
      {datosPorTurno.map(turno => (
        <div key={turno.id_programa} style={{ marginBottom: '3rem' }}>
          <div style={{
            background: '#f8fafc',
            borderBottom: '2px solid #cbd5e1',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderRadius: '6px 6px 0 0'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#1e293b', fontWeight: 700 }}>
              Turno: {turno.nombre_turno}
            </h2>
            <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--primary-color)' }}>
              Food Cost (T. Prod): S/. {turno.costoProducido.toFixed(2)}
            </span>
          </div>
          
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#475569', padding: '0 0.5rem' }}>
            <div><strong>Proyectado:</strong> S/. {turno.costoProyectado.toFixed(2)}</div>
            <div><strong>Teórico Producido:</strong> <span style={{ color: 'var(--primary-color)', fontWeight: 600 }}>S/. {turno.costoProducido.toFixed(2)}</span></div>
            <div><strong>Real Despachado:</strong> <span style={{ color: '#166534', fontWeight: 600 }}>S/. {turno.costoDespachado.toFixed(2)}</span></div>
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border-subtle)' }}>
            <table style={{ margin: 0, width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Plato</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: '#475569', width: '90px' }}>Porciones</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569', width: '130px' }}>Categoría</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#475569' }}>Insumo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#475569', width: '95px' }}>Precio (S/.)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#475569', width: '120px' }}>Teórico Prod.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#475569', width: '120px' }}>Costo T. Prod.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#475569', width: '120px' }}>Despacho Real</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontWeight: 700, color: '#475569', width: '120px' }}>Costo Real</th>
                </tr>
              </thead>
              <tbody>
                {turno.filas.map((f, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 700, color: '#1e293b' }}>{f.plato}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 600, color: '#475569' }}>{f.porciones}</td>
                    <td style={{ padding: '0.65rem 1rem', color: '#64748b' }}>{f.categoria}</td>
                    <td style={{ padding: '0.65rem 1rem', fontWeight: 500, color: '#334155' }}>{f.insumo}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: '#475569' }}>S/. {f.precio.toFixed(2)}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: '#334155' }}>{f.qtyProducida.toFixed(3)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{f.simbolo}</span></td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: 'var(--primary-color)' }}>S/. {f.cpr.toFixed(2)}</td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', color: '#334155' }}>{f.qtyRealDespachada.toFixed(3)} <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{f.simbolo}</span></td>
                    <td style={{ padding: '0.65rem 1rem', textAlign: 'right', fontWeight: 700, color: '#166534' }}>S/. {f.crd.toFixed(2)}</td>
                  </tr>
                ))}
                {turno.filas.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                      No hay insumos para este turno.
                    </td>
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
