import { db } from '@/lib/db';
import Link from 'next/link';

const ArrowIcon = () => (
  <svg fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" style={{ width: '0.85em', height: '0.85em', marginLeft: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
  </svg>
);

function getTurnoBadgeClass(nombre: string) {
  const n = nombre.toUpperCase();
  if (n.includes('DESAYUNO') && n.includes('ALMUERZO')) return 'badge-turno badge-turno-consolidado';
  if (n.includes('DESAYUNO')) return 'badge-turno badge-turno-desayuno';
  if (n.includes('ALMUERZO')) return 'badge-turno badge-turno-almuerzo';
  if (n.includes('CENA')) return 'badge-turno badge-turno-cena';
  return 'badge-turno badge-turno-default';
}

export default async function Dashboard() {
  // ── Contadores básicos ──
  const recetasQuery  = await db`SELECT COUNT(*) as count FROM Receta`;
  const insumosQuery  = await db`SELECT COUNT(*) as count FROM Insumo`;
  const programasQuery = await db`SELECT COUNT(*) as count FROM Programa_Produccion`;

  const recetasCount  = Number(recetasQuery[0]?.count  || 0);
  const insumosCount  = Number(insumosQuery[0]?.count  || 0);
  const programasCount = Number(programasQuery[0]?.count || 0);

  // ── Asertividad (estimado vs real) ──
  const programasRaciones = await db`
    SELECT
      p.id_programa,
      p.fecha,
      t.nombre_turno,
      SUM(pd.raciones_programadas)            as raciones_programadas,
      SUM(COALESCE(pd.raciones_producidas, 0)) as raciones_producidas
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    LEFT JOIN Programa_Detalle pd ON p.id_programa = pd.id_programa
    GROUP BY p.id_programa, p.fecha, t.nombre_turno, t.id_turno
    ORDER BY p.fecha DESC, t.id_turno ASC
    LIMIT 5
  `;

  let totalProgGlobal = 0;
  let totalProdGlobal = 0;
  programasRaciones.forEach(p => {
    totalProgGlobal += Number(p.raciones_programadas);
    totalProdGlobal += Number(p.raciones_producidas);
  });
  const asertividadGlobal = totalProgGlobal > 0
    ? (totalProdGlobal / totalProgGlobal) * 100
    : 0;

  // ── Eficiencia de consumo por turno ──
  const consumosPorTurno = await db`
    SELECT
      t.nombre_turno,
      SUM(dc.cantidad_teorica_calculada)        as total_teorico,
      SUM(COALESCE(dc.cantidad_real_entregada, 0)) as total_real
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    JOIN Despacho_Consolidado dc ON p.id_programa = dc.id_programa
    GROUP BY t.nombre_turno, t.id_turno
  `;

  // ── Desviaciones de ratios ──
  const datosRatios = await db`
    SELECT
      pd.id_receta, r.nombre_receta,
      pd.raciones_programadas,
      COALESCE(pd.raciones_producidas, 0) as raciones_producidas,
      rd.id_insumo, i.nombre_insumo, u.simbolo as unidad,
      rd.cantidad_unitaria                     as ratio_teorico,
      dc.cantidad_teorica_calculada            as total_teorico_insumo,
      COALESCE(dc.cantidad_real_entregada, 0)  as total_real_insumo
    FROM Programa_Produccion p
    JOIN Programa_Detalle pd   ON p.id_programa = pd.id_programa
    JOIN Receta r              ON pd.id_receta  = r.id_receta
    JOIN Receta_Detalle rd     ON pd.id_receta  = rd.id_receta
    JOIN Insumo i              ON rd.id_insumo  = i.id_insumo
    LEFT JOIN Unidad_Medida u  ON i.id_unidad   = u.id_unidad
    JOIN Despacho_Consolidado dc ON p.id_programa = dc.id_programa AND rd.id_insumo = dc.id_insumo
  `;

  type MapEntry = {
    nombre_receta: string; nombre_insumo: string; unidad: string;
    ratio_teorico: number; suma_proporcional: number; suma_producida: number;
  };
  const mapaRatios: Record<string, MapEntry> = {};

  datosRatios.forEach(d => {
    const key = `${d.id_receta}-${d.id_insumo}`;
    const rtNum  = Number(d.ratio_teorico);
    const rpNum  = Number(d.raciones_programadas);
    const prodNum = Number(d.raciones_producidas);
    const teoNum  = Number(d.total_teorico_insumo);
    const realNum = Number(d.total_real_insumo);
    const cantReq = rtNum * rpNum;
    const factor  = teoNum > 0 ? realNum / teoNum : 0;

    if (!mapaRatios[key]) {
      mapaRatios[key] = {
        nombre_receta: d.nombre_receta, nombre_insumo: d.nombre_insumo,
        unidad: d.unidad || '-', ratio_teorico: rtNum,
        suma_proporcional: 0, suma_producida: 0,
      };
    }
    mapaRatios[key].suma_proporcional += cantReq * factor;
    mapaRatios[key].suma_producida    += prodNum;
  });

  const desviacionesRatios = Object.values(mapaRatios)
    .map(m => {
      const ratio_real = m.suma_producida > 0 ? m.suma_proporcional / m.suma_producida : 0;
      const desviacion = m.ratio_teorico > 0
        ? ((ratio_real - m.ratio_teorico) / m.ratio_teorico) * 100 : 0;
      return { ...m, ratio_real, desviacion };
    })
    .filter(m => Math.abs(m.desviacion) > 0.1)
    .sort((a, b) => b.desviacion - a.desviacion)
    .slice(0, 5);

  // Color asertividad
  const asertColor = asertividadGlobal >= 95 ? 'success'
    : asertividadGlobal >= 75 ? 'warning' : 'danger';

  return (
    <div>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header">
        <span className="overline">Sistema de Control · Cocina</span>
        <h1>Panel de <em>Control</em> Analítico</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          Métricas en tiempo real de rendimiento, despacho y cumplimiento de raciones.
        </p>
      </div>

      {/* ── KPIs ── */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>

        {/* Asertividad */}
        <div className="kpi-card">
          <span className="kpi-label">Asertividad Global</span>
          <span className={`kpi-value`} style={{ color: asertividadGlobal >= 95 ? 'var(--success)' : asertividadGlobal >= 75 ? 'var(--warning)' : 'var(--danger)' }}>
            {asertividadGlobal.toFixed(1)}%
          </span>
          <span className="kpi-sub">Estimado vs real de raciones</span>
          <div className="kpi-bar">
            <div
              className={`kpi-bar-fill ${asertColor}`}
              style={{ width: `${Math.min(asertividadGlobal, 100)}%` }}
            />
          </div>
        </div>

        {/* Programas */}
        <div className="kpi-card">
          <span className="kpi-label">Programas Registrados</span>
          <span className="kpi-value">{programasCount}</span>
          <span className="kpi-sub">Turnos en el histórico</span>
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link href="/programas" className="btn-kpi">
              Ver programas <ArrowIcon />
            </Link>
          </div>
        </div>

        {/* Recetas */}
        <div className="kpi-card">
          <span className="kpi-label">Recetas (BOM)</span>
          <span className="kpi-value">{recetasCount}</span>
          <span className="kpi-sub">En catálogo activo</span>
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link href="/recetas" className="btn-kpi">
              Ver recetas <ArrowIcon />
            </Link>
          </div>
        </div>

        {/* Insumos */}
        <div className="kpi-card">
          <span className="kpi-label">Insumos</span>
          <span className="kpi-value">{insumosCount}</span>
          <span className="kpi-sub">Ingredientes registrados</span>
          <div style={{ marginTop: 'auto', paddingTop: '0.5rem' }}>
            <Link href="/insumos" className="btn-kpi">
              Ver insumos <ArrowIcon />
            </Link>
          </div>
        </div>

      </div>

      {/* ── DOS COLUMNAS: Eficiencia + Cumplimiento ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>

        {/* Eficiencia por turno */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <span className="overline">Despacho</span>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Eficiencia <em>por Turno</em></h2>
          <table className="table-clean">
            <thead>
              <tr>
                <th>Turno</th>
                <th style={{ textAlign: 'right' }}>Teórico</th>
                <th style={{ textAlign: 'right' }}>Real</th>
                <th style={{ textAlign: 'right' }}>Desviación</th>
              </tr>
            </thead>
            <tbody>
              {consumosPorTurno.map((ct, idx) => {
                const teo  = Number(ct.total_teorico);
                const real = Number(ct.total_real);
                const desv = teo > 0 ? ((real - teo) / teo) * 100 : 0;
                const isOver = desv > 0;
                return (
                  <tr key={idx}>
                    <td>
                      <span className={getTurnoBadgeClass(ct.nombre_turno)}>
                        {ct.nombre_turno}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>{teo.toFixed(2)}</td>
                    <td style={{ textAlign: 'right' }}>{real.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: isOver ? 'var(--danger)' : 'var(--success)' }}>
                      {isOver ? '+' : ''}{desv.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {consumosPorTurno.length === 0 && (
                <tr>
                  <td colSpan={4} className="empty-state" style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    Sin datos de despacho aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.75rem', fontStyle: 'italic' }}>
            * Desviación positiva = sobreconsumo de insumos.
          </p>
        </div>

        {/* Cumplimiento de raciones */}
        <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
          <span className="overline">Raciones</span>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Cumplimiento <em>Reciente</em></h2>
          <table className="table-clean">
            <thead>
              <tr>
                <th>Programa</th>
                <th style={{ textAlign: 'center' }}>Est.</th>
                <th style={{ textAlign: 'center' }}>Real</th>
                <th style={{ textAlign: 'right' }}>Cumpl.</th>
              </tr>
            </thead>
            <tbody>
              {programasRaciones.map((pr, idx) => {
                const prog = Number(pr.raciones_programadas);
                const prod = Number(pr.raciones_producidas);
                const cumpl = prog > 0 ? (prod / prog) * 100 : 0;
                const fecha = new Date(pr.fecha).toISOString().split('T')[0];
                return (
                  <tr key={idx}>
                    <td>
                      <Link
                        href={`/programas/${pr.id_programa}`}
                        style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', fontSize: '0.78rem' }}
                      >
                        {fecha}
                      </Link>
                      <span style={{ marginLeft: '0.6rem' }}>
                        <span className={getTurnoBadgeClass(pr.nombre_turno)}>
                          {pr.nombre_turno}
                        </span>
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>{prog}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{prod}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: cumpl >= 95 ? 'var(--success)' : 'var(--warning)' }}>
                      {cumpl.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {programasRaciones.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    Sin programas registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ALERTAS DE VARIACIÓN DE RATIOS ── */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
        <span className="overline">Control de Calidad</span>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '0.4rem' }}>Alertas de <em>Variación</em> de Ratios</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Platos e insumos con mayor desviación entre el ratio teórico (BOM) y el consumo real ponderado.
        </p>
        <div style={{ overflowX: 'auto' }}>
          <table className="table-clean">
            <thead>
              <tr>
                <th>Receta / Plato</th>
                <th>Insumo</th>
                <th style={{ textAlign: 'right' }}>Ratio BOM</th>
                <th style={{ textAlign: 'right' }}>Ratio Real</th>
                <th style={{ textAlign: 'right' }}>Variación</th>
              </tr>
            </thead>
            <tbody>
              {desviacionesRatios.map((dr, idx) => {
                const isOver = dr.desviacion > 0;
                return (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600 }}>{dr.nombre_receta}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {dr.nombre_insumo}
                      <span className="badge" style={{ marginLeft: '0.4rem', fontSize: '0.6rem' }}>{dr.unidad}</span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--text-secondary)' }}>
                      {dr.ratio_teorico.toFixed(5).replace(/\.?0+$/, '')}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {dr.ratio_real.toFixed(5).replace(/\.?0+$/, '')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${isOver ? 'badge-danger' : 'badge-success'}`}>
                        {isOver ? '+' : ''}{dr.desviacion.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              {desviacionesRatios.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <span style={{ display: 'block', fontSize: '1.5rem', marginBottom: '0.5rem' }}>✓</span>
                    Sin desviaciones significativas de ratios registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SEGURIDAD DE DATOS ── */}
      <div className="card" style={{ padding: '1.25rem 1.5rem', border: '1px solid #fed7aa', backgroundColor: '#fffcf5' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span className="overline" style={{ color: '#c2410c' }}>Seguridad</span>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.4rem', color: '#9a3412' }}>Copia de <em>Seguridad</em></h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '600px' }}>
              Descarga un respaldo completo (JSON) con todas las recetas, insumos, programas y despachos registrados en el sistema hasta este instante. Guarda este archivo en tu disco local o Drive.
            </p>
          </div>
          <a 
            href="/api/backup" 
            target="_blank"
            download
            className="btn" 
            style={{ backgroundColor: '#c2410c', color: '#fff', border: 'none', padding: '0.6rem 1.2rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <span style={{ fontSize: '1.1rem' }}>📥</span> Descargar Base de Datos
          </a>
        </div>
      </div>
    </div>
  );
}
