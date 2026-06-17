import { db } from '@/lib/db';
import Link from 'next/link';

export default function Dashboard() {
  // Contadores Básicos
  const recetasCount = db.prepare('SELECT COUNT(*) as count FROM Receta').get() as { count: number };
  const insumosCount = db.prepare('SELECT COUNT(*) as count FROM Insumo').get() as { count: number };
  const programasCount = db.prepare('SELECT COUNT(*) as count FROM Programa_Produccion').get() as { count: number };

  // 1. Asertividad de la Programación (Estimado vs Real)
  const programasRaciones = db.prepare(`
    SELECT 
      p.id_programa,
      p.fecha,
      t.nombre_turno,
      SUM(pd.raciones_programadas) as raciones_programadas,
      SUM(COALESCE(pd.raciones_producidas, 0)) as raciones_producidas
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    LEFT JOIN Programa_Detalle pd ON p.id_programa = pd.id_programa
    GROUP BY p.id_programa
    ORDER BY p.fecha DESC, t.id_turno ASC
    LIMIT 5
  `).all() as any[];

  // Calcular cumplimiento global promedio
  let totalProgramadasGlobal = 0;
  let totalProducidasGlobal = 0;
  programasRaciones.forEach(p => {
    totalProgramadasGlobal += p.raciones_programadas;
    totalProducidasGlobal += p.raciones_producidas;
  });
  const asertividadGlobal = totalProgramadasGlobal > 0 
    ? (totalProducidasGlobal / totalProgramadasGlobal) * 100 
    : 0;

  // 2. Eficiencia de Consumo por Turno
  const consumosPorTurno = db.prepare(`
    SELECT 
      t.nombre_turno,
      SUM(dc.cantidad_teorica_calculada) as total_teorico,
      SUM(COALESCE(dc.cantidad_real_entregada, 0)) as total_real
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    JOIN Despacho_Consolidado dc ON p.id_programa = dc.id_programa
    GROUP BY t.id_turno
  `).all() as any[];

  // 3. Desviaciones de Ratios (Rendimiento de Recetas)
  const datosRatios = db.prepare(`
    SELECT 
      pd.id_receta,
      r.nombre_receta,
      pd.raciones_programadas,
      COALESCE(pd.raciones_producidas, 0) as raciones_producidas,
      rd.id_insumo,
      i.nombre_insumo,
      u.simbolo as unidad,
      rd.cantidad_unitaria as ratio_teorico,
      dc.cantidad_teorica_calculada as total_teorico_insumo,
      COALESCE(dc.cantidad_real_entregada, 0) as total_real_insumo
    FROM Programa_Produccion p
    JOIN Programa_Detalle pd ON p.id_programa = pd.id_programa
    JOIN Receta r ON pd.id_receta = r.id_receta
    JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
    JOIN Insumo i ON rd.id_insumo = i.id_insumo
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    JOIN Despacho_Consolidado dc ON p.id_programa = dc.id_programa AND rd.id_insumo = dc.id_insumo
  `).all() as any[];

  // Agrupar y calcular desviación ponderada por Receta + Insumo
  const mapaRatios: Record<string, {
    nombre_receta: string;
    nombre_insumo: string;
    unidad: string;
    ratio_teorico: number;
    suma_proporcional: number;
    suma_producida: number;
  }> = {};

  datosRatios.forEach(d => {
    const key = `${d.id_receta}-${d.id_insumo}`;
    
    const cantidadRequerida = d.ratio_teorico * d.raciones_programadas;
    const factor = d.total_teorico_insumo > 0 ? (d.total_real_insumo / d.total_teorico_insumo) : 0;
    const entregadoProporcional = cantidadRequerida * factor;

    if (!mapaRatios[key]) {
      mapaRatios[key] = {
        nombre_receta: d.nombre_receta,
        nombre_insumo: d.nombre_insumo,
        unidad: d.unidad || '-',
        ratio_teorico: d.ratio_teorico,
        suma_proporcional: 0,
        suma_producida: 0
      };
    }
    mapaRatios[key].suma_proporcional += entregadoProporcional;
    mapaRatios[key].suma_producida += d.raciones_producidas;
  });

  // Convertir a array y calcular porcentaje de desviación
  const desviacionesRatios = Object.values(mapaRatios)
    .map(m => {
      const ratio_real = m.suma_producida > 0 ? (m.suma_proporcional / m.suma_producida) : 0;
      const desviacion = m.ratio_teorico > 0 ? ((ratio_real - m.ratio_teorico) / m.ratio_teorico) * 100 : 0;
      return {
        ...m,
        ratio_real,
        desviacion
      };
    })
    // Filtrar desvíos significativos (por ejemplo, > 0.1% o < -0.1%)
    .filter(m => Math.abs(m.desviacion) > 0.1)
    .sort((a, b) => b.desviacion - a.desviacion) // Ordenar de mayor desviación a menor
    .slice(0, 5); // Mostrar los top 5 críticos

  return (
    <div>
      <h1 style={{ marginBottom: '0.2rem' }}>Panel de Control Analítico</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Métricas de rendimiento de cocina, mermas de insumos y control de ratios.</p>

      {/* Grid de KPIs principales */}
      <div className="grid" style={{ marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>Asertividad Global</h3>
            <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0.2rem 0', color: '#2e7d32' }}>
              {asertividadGlobal.toFixed(1)}%
            </p>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>De cumplimiento estimado vs real</span>
          </div>
          <div style={{ marginTop: '1rem', width: '100%', height: '6px', backgroundColor: '#e2d9cd', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(asertividadGlobal, 100)}%`, height: '100%', backgroundColor: '#2e7d32' }}></div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>Programas Activos</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: '0.5rem 0 0.2rem 0', color: 'var(--primary-color)' }}>
            {programasCount.count}
          </p>
          <span style={{ fontSize: '0.8rem', color: '#888' }}>Turnos registrados en histórico</span>
          <div style={{ marginTop: '1.2rem' }}>
            <Link href="/programas" className="btn" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>Ver Programas</Link>
          </div>
        </div>

        <div className="card">
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: '#666', textTransform: 'uppercase' }}>Entidades</h3>
          <p style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0.5rem 0 0 0' }}>
            📖 Recetas: <span style={{ color: 'var(--primary-color)' }}>{recetasCount.count}</span>
          </p>
          <p style={{ fontSize: '1.2rem', fontWeight: '600', margin: '0.2rem 0 0 0' }}>
            🧅 Insumos: <span style={{ color: 'var(--primary-color)' }}>{insumosCount.count}</span>
          </p>
          <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.5rem' }}>
            <Link href="/recetas" className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Recetas</Link>
            <Link href="/insumos" className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>Insumos</Link>
          </div>
        </div>
      </div>

      {/* Dos Columnas: Eficiencia por Turno & Asertividad Reciente */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Eficiencia por Turno */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', color: '#4e3629' }}>
            ⚖️ Eficiencia de Despacho por Turno
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Turno</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Teórico Requerido</th>
                <th style={{ textAlign: 'right', padding: '0.5rem' }}>Real Entregado</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Desviación</th>
              </tr>
            </thead>
            <tbody>
              {consumosPorTurno.map((ct, idx) => {
                const desv = ct.total_teorico > 0 ? ((ct.total_real - ct.total_teorico) / ct.total_teorico) * 100 : 0;
                const isOver = desv > 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '0.6rem 0', fontWeight: 'bold' }}>{ct.nombre_turno}</td>
                    <td style={{ textAlign: 'right', padding: '0.6rem' }}>{ct.total_teorico.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '0.6rem' }}>{ct.total_real.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '0.6rem 0', fontWeight: 'bold', color: isOver ? '#c62828' : '#2e7d32' }}>
                      {isOver ? '+' : ''}{desv.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {consumosPorTurno.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>No hay datos registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
          <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '1rem', fontStyle: 'italic' }}>
            * Una desviación positiva indica sobreconsumo de insumos en cocina.
          </p>
        </div>

        {/* Asertividad de la Programación */}
        <div className="card" style={{ padding: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', color: '#4e3629' }}>
            📅 Cumplimiento de Platos Recientes
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eee' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0' }}>Programa (Fecha / Turno)</th>
                <th style={{ textAlign: 'center', padding: '0.5rem' }}>Est.</th>
                <th style={{ textAlign: 'center', padding: '0.5rem' }}>Real</th>
                <th style={{ textAlign: 'right', padding: '0.5rem 0' }}>Cumplimiento</th>
              </tr>
            </thead>
            <tbody>
              {programasRaciones.map((pr, idx) => {
                const cumpl = pr.raciones_programadas > 0 ? (pr.raciones_producidas / pr.raciones_programadas) * 100 : 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f9f9f9' }}>
                    <td style={{ padding: '0.6rem 0' }}>
                      <Link href={`/programas/${pr.id_programa}`} style={{ color: 'var(--primary-color)', fontWeight: 600, textDecoration: 'none' }}>
                        {pr.fecha} - {pr.nombre_turno}
                      </Link>
                    </td>
                    <td style={{ textAlign: 'center', padding: '0.6rem', color: '#666' }}>{pr.raciones_programadas}</td>
                    <td style={{ textAlign: 'center', padding: '0.6rem', fontWeight: 'bold' }}>{pr.raciones_producidas}</td>
                    <td style={{ textAlign: 'right', padding: '0.6rem 0', fontWeight: 'bold', color: cumpl >= 95 ? '#2e7d32' : '#d97706' }}>
                      {cumpl.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {programasRaciones.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '1rem', color: '#999' }}>No hay programas registrados.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rendimiento de Recetas (Desviación de Ratios) */}
      <div className="card" style={{ padding: '1.2rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid #ddd', paddingBottom: '0.5rem', color: '#4e3629' }}>
          ⚠️ Alertas de Variación de Ratios (Rendimiento Crítico de Recetas)
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
          Lista de platos e insumos que registran las mayores variaciones entre lo que dicta la receta teórica y el consumo real ponderado.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#faf9f8', borderBottom: '1px solid #ddd' }}>
                <th style={{ textAlign: 'left', padding: '0.6rem' }}>Receta / Plato</th>
                <th style={{ textAlign: 'left', padding: '0.6rem' }}>Insumo</th>
                <th style={{ textAlign: 'right', padding: '0.6rem' }}>Ratio Teórico (BOM)</th>
                <th style={{ textAlign: 'right', padding: '0.6rem' }}>Ratio Real Ponderado</th>
                <th style={{ textAlign: 'right', padding: '0.6rem' }}>Variación %</th>
              </tr>
            </thead>
            <tbody>
              {desviacionesRatios.map((dr, idx) => {
                const isOver = dr.desviacion > 0;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #eee', backgroundColor: isOver ? '#fffdfd' : '#fcfdfc' }}>
                    <td style={{ padding: '0.7rem 0.6rem', fontWeight: 600 }}>{dr.nombre_receta}</td>
                    <td style={{ padding: '0.7rem 0.6rem' }}>{dr.nombre_insumo} ({dr.unidad})</td>
                    <td style={{ textAlign: 'right', padding: '0.7rem 0.6rem', color: '#666' }}>{dr.ratio_teorico.toFixed(5).replace(/\.?0+$/, '')}</td>
                    <td style={{ textAlign: 'right', padding: '0.7rem 0.6rem', fontWeight: 'bold' }}>{dr.ratio_real.toFixed(5).replace(/\.?0+$/, '')}</td>
                    <td style={{ textAlign: 'right', padding: '0.7rem 0.6rem', fontWeight: 'bold', color: isOver ? '#c62828' : '#2e7d32' }}>
                      {isOver ? '+' : ''}{dr.desviacion.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {desviacionesRatios.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
                    No se registran desviaciones significativas de ratios de ingredientes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
