import { db } from '@/lib/db';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';

export default async function DiaProgramasPage({ params }: { params: Promise<{ fecha: string }> }) {
  const { fecha } = await params;

  // Validar formato de fecha
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) notFound();

  // Traer todos los programas de esa fecha con sus recetas y raciones
  const programasDelDia = await db`
    SELECT 
      p.id_programa,
      p.fecha,
      t.nombre_turno,
      t.id_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.fecha = ${fecha}
    ORDER BY t.id_turno ASC
  `;

  if (programasDelDia.length === 0) notFound();

  const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Para cada programa, traer sus recetas y raciones
  const detallesPorPrograma: Record<string, Array<{
    id_receta: string;
    nombre_receta: string;
    raciones_programadas: number;
    raciones_producidas: number | null;
  }>> = {};

  for (const prog of programasDelDia) {
    const recetas = await db`
      SELECT pd.id_receta, r.nombre_receta, pd.raciones_programadas, pd.raciones_producidas
      FROM Programa_Detalle pd
      JOIN Receta r ON pd.id_receta = r.id_receta
      WHERE pd.id_programa = ${prog.id_programa}
      ORDER BY r.nombre_receta ASC
    `;
    detallesPorPrograma[prog.id_programa] = recetas.map(r => ({
      id_receta: r.id_receta,
      nombre_receta: r.nombre_receta,
      raciones_programadas: Number(r.raciones_programadas),
      raciones_producidas: r.raciones_producidas !== null ? Number(r.raciones_producidas) : null,
    }));
  }

  // Totales globales del día
  let totalRacionesDia = 0;
  let totalRecetasDia = 0;
  programasDelDia.forEach(p => {
    const det = detallesPorPrograma[p.id_programa] || [];
    totalRecetasDia += det.length;
    det.forEach(r => { totalRacionesDia += r.raciones_programadas; });
  });

  return (
    <div>
      {/* ── ENCABEZADO — no imprimible ── */}
      <div className="no-print" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <Link href="/programas" style={{ color: 'var(--accent)', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 500 }}>
            ← Volver a Programas
          </Link>
          <h1 style={{ marginTop: '0.5rem' }}>Resumen del <em>Día</em></h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', textTransform: 'capitalize' }}>{fechaDisplay}</p>
        </div>
          <PrintButton />
      </div>

      {/* ── CABECERA IMPRIMIBLE ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          borderBottom: '3px solid var(--text-primary)',
          paddingBottom: '0.75rem',
          marginBottom: '0.75rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}>
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.2rem' }}>
              MRP Cocina · Orden de Producción Diaria
            </p>
            <h2 style={{ fontSize: '1.6rem', fontFamily: 'var(--font-display)', textTransform: 'capitalize' }}>
              {fechaDisplay}
            </h2>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div><strong>{programasDelDia.length}</strong> turno{programasDelDia.length !== 1 ? 's' : ''}</div>
            <div><strong>{totalRecetasDia}</strong> platos</div>
            <div><strong>{totalRacionesDia}</strong> raciones totales</div>
          </div>
        </div>
      </div>

      {/* ── TURNOS ── */}
      {programasDelDia.map((prog, progIdx) => {
        const recetas = detallesPorPrograma[prog.id_programa] || [];
        const totalRacionesTurno = recetas.reduce((s, r) => s + r.raciones_programadas, 0);
        const isCena = prog.nombre_turno.toLowerCase().includes('cena');

        return (
          <div key={prog.id_programa} style={{ marginBottom: progIdx < programasDelDia.length - 1 ? '2rem' : 0 }}>
            {/* Cabecera de turno */}
            <div style={{
              background: isCena ? 'var(--text-primary)' : 'var(--bg-muted)',
              color: isCena ? '#fff' : 'var(--text-primary)',
              padding: '0.5rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderLeft: `4px solid ${isCena ? 'var(--accent)' : 'var(--border-medium)'}`,
              marginBottom: '0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7 }}>
                  Turno
                </span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.05rem' }}>
                  {prog.nombre_turno}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '9999px',
                  background: isCena ? 'rgba(255,255,255,0.15)' : 'var(--border-subtle)',
                  color: isCena ? '#fff' : 'var(--text-secondary)',
                }}>
                  ID: {prog.id_programa}
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, opacity: 0.9 }}>
                {totalRacionesTurno} raciones · {recetas.length} platos
              </div>
            </div>

            {/* Tabla de recetas del turno */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
              {recetas.length === 0 ? (
                <div style={{ padding: '1rem', color: 'var(--text-tertiary)', fontSize: '0.8rem', textAlign: 'center' }}>
                  Sin recetas registradas en este turno.
                </div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '50%' }}>Plato / Receta</th>
                      <th style={{ textAlign: 'center', width: '20%' }}>Raciones Programadas</th>
                      <th style={{ textAlign: 'center', width: '20%' }}>Raciones Producidas</th>
                      <th style={{ textAlign: 'center', width: '10%' }}>Cumplimiento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recetas.map((receta, idx) => {
                      const prod = receta.raciones_producidas;
                      const prog2 = receta.raciones_programadas;
                      const cumpl = prod !== null && prog2 > 0 ? (prod / prog2) * 100 : null;
                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{receta.nombre_receta}</td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }}>{prog2}</td>
                          <td style={{ textAlign: 'center', color: prod !== null ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                            {prod !== null ? prod : '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {cumpl !== null ? (
                              <span style={{
                                display: 'inline-block',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '9999px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                background: cumpl >= 95 ? 'var(--success-bg)' : 'var(--warning-bg)',
                                color: cumpl >= 95 ? 'var(--success)' : 'var(--warning)',
                              }}>
                                {cumpl.toFixed(0)}%
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--bg-muted)', fontWeight: 700 }}>
                      <td style={{ fontWeight: 700 }}>TOTAL TURNO</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{totalRacionesTurno}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            {/* Separador entre turnos (solo visible en pantalla) */}
            {progIdx < programasDelDia.length - 1 && (
              <div className="no-print" style={{ height: '1rem' }} />
            )}
          </div>
        );
      })}

      {/* ── FIRMA / PIE DE PÁGINA IMPRIMIBLE ── */}
      <div style={{
        marginTop: '2.5rem',
        borderTop: '1px solid var(--border-subtle)',
        paddingTop: '1rem',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: '2rem',
        fontSize: '0.72rem',
        color: 'var(--text-tertiary)',
      }}>
        <div>
          <div style={{ borderBottom: '1px solid var(--border-medium)', marginBottom: '0.3rem', height: '2rem' }} />
          <span>Jefe de Cocina</span>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid var(--border-medium)', marginBottom: '0.3rem', height: '2rem' }} />
          <span>Almacén / Despacho</span>
        </div>
        <div>
          <div style={{ borderBottom: '1px solid var(--border-medium)', marginBottom: '0.3rem', height: '2rem' }} />
          <span>Supervisión</span>
        </div>
      </div>
    </div>
  );
}
