import { db } from '@/lib/db';
import Link from 'next/link';
import DeleteProgramaButton from '@/components/DeleteProgramaButton';

export default async function ProgramasPage() {
  const programas = await db`
    SELECT p.id_programa, p.fecha, t.nombre_turno, COUNT(pd.id_receta) as cant_recetas
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    LEFT JOIN Programa_Detalle pd ON p.id_programa = pd.id_programa
    GROUP BY p.id_programa, p.fecha, t.nombre_turno, t.id_turno
    ORDER BY p.fecha DESC, t.id_turno ASC
  `;

  // Agrupar por fecha para poder ofrecer "Imprimir día"
  type ProgRow = (typeof programas)[number];
  const porFecha: Record<string, ProgRow[]> = {};
  programas.forEach(p => {
    const fecha = new Date(p.fecha).toISOString().split('T')[0];
    if (!porFecha[fecha]) porFecha[fecha] = [];
    porFecha[fecha].push(p);
  });
  const fechasOrdenadas = Object.keys(porFecha).sort((a, b) => b.localeCompare(a));

  return (
    <div>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <span className="overline">Producción Diaria</span>
            <h1>Programas de <em>Producción</em></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
              {programas.length} programa{programas.length !== 1 ? 's' : ''} · {fechasOrdenadas.length} día{fechasOrdenadas.length !== 1 ? 's' : ''} registrados
            </p>
          </div>
          <Link href="/programas/nuevo" className="btn">
            + Nuevo Programa
          </Link>
        </div>
      </div>

      {/* ── LISTA AGRUPADA POR FECHA ── */}
      {programas.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            No hay programas de producción registrados aún.
            <div style={{ marginTop: '1rem' }}>
              <Link href="/programas/nuevo" className="btn">Crear primer programa →</Link>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {fechasOrdenadas.map(fecha => {
            const programasDeFecha = porFecha[fecha];
            const fechaDisplay = new Date(fecha + 'T12:00:00').toLocaleDateString('es-PE', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            return (
              <div key={fecha} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {/* Cabecera del día */}
                <div style={{
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-muted)',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      color: 'var(--text-primary)',
                      textTransform: 'capitalize',
                    }}>
                      {fechaDisplay}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      padding: '0.15rem 0.6rem',
                      borderRadius: '9999px',
                      background: 'var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}>
                      {programasDeFecha.length} turno{programasDeFecha.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <Link
                    href={`/programas/dia/${fecha}`}
                    className="btn-outline"
                    style={{ fontSize: '0.72rem', padding: '0.3rem 0.85rem' }}
                  >
                    🖨️ Imprimir día
                  </Link>
                </div>

                {/* Filas de turnos del día */}
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '130px' }}>ID</th>
                      <th>Turno</th>
                      <th style={{ textAlign: 'center', width: '110px' }}>Recetas</th>
                      <th style={{ width: '300px' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {programasDeFecha.map(prog => {
                      const isCena = prog.nombre_turno.toLowerCase().includes('cena');
                      return (
                        <tr key={prog.id_programa}>
                          <td>
                            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                              #{prog.id_programa}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${isCena ? 'badge-accent' : ''}`}>
                              {prog.nombre_turno}
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: 600 }}>{prog.cant_recetas}</span>
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '0.7rem', marginLeft: '0.2rem' }}>recetas</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <Link href={`/programas/${prog.id_programa}`} className="btn-action">
                                📊 Consolidado
                              </Link>
                              <Link href={`/programas/${prog.id_programa}/editar`} className="btn-action btn-action-edit">
                                ✏️ Editar
                              </Link>
                              <DeleteProgramaButton id_programa={prog.id_programa} />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
