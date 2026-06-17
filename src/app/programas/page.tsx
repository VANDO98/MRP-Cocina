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

  return (
    <div>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <span className="overline">Producción Diaria</span>
            <h1>Programas de <em>Producción</em></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
              Turnos registrados · {programas.length} programa{programas.length !== 1 ? 's' : ''} en total
            </p>
          </div>
          <Link href="/programas/nuevo" className="btn">
            + Nuevo Programa
          </Link>
        </div>
      </div>

      {/* ── TABLA DE PROGRAMAS ── */}
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
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Turno</th>
                <th style={{ textAlign: 'center' }}>Recetas</th>
                <th style={{ width: '280px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {programas.map(prog => {
                const isCena = prog.nombre_turno.toLowerCase().includes('cena');
                const fechaTexto = new Date(prog.fecha).toISOString().split('T')[0];
                return (
                  <tr key={prog.id_programa}>
                    <td>
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
                        #{prog.id_programa}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>{fechaTexto}</td>
                    <td>
                      <span className={`badge ${isCena ? 'badge-accent' : ''}`}>
                        {prog.nombre_turno}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {prog.cant_recetas}
                      </span>
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
      )}
    </div>
  );
}
