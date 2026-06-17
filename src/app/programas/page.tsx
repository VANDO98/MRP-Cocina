import { db } from '@/lib/db';
import Link from 'next/link';
import DeleteProgramaButton from '@/components/DeleteProgramaButton';

export default function ProgramasPage() {
  const programas = db.prepare(`
    SELECT p.id_programa, p.fecha, t.nombre_turno, COUNT(pd.id_receta) as cant_recetas
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    LEFT JOIN Programa_Detalle pd ON p.id_programa = pd.id_programa
    GROUP BY p.id_programa
    ORDER BY p.fecha DESC, t.id_turno ASC
  `).all() as any[];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <h1>Programas de Producción</h1>
        <Link href="/programas/nuevo" className="btn" style={{ padding: '0.35rem 1rem', borderRadius: '4px', textDecoration: 'none', border: 'none' }}>
          + Nuevo Programa
        </Link>
      </div>
      <p style={{ marginBottom: '1.5rem', color: '#666' }}>Listado de turnos de producción programados.</p>

      {programas.length === 0 ? (
        <p>No hay programas de producción registrados.</p>
      ) : (
        <table style={{ borderCollapse: 'collapse', border: '1px solid #e5e7eb' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6' }}>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>ID Programa</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Fecha</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151' }}>Turno</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151', textAlign: 'center' }}>Cant. Recetas</th>
              <th style={{ border: '1px solid #e5e7eb', padding: '0.5rem', fontSize: '0.8rem', color: '#374151', width: '260px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {programas.map(prog => {
              const isCena = prog.nombre_turno.toLowerCase().includes('cena');
              const rowBg = isCena ? '#f4ede6' : '#fbfaf7';
              return (
                <tr key={prog.id_programa} style={{ backgroundColor: rowBg }}>
                  <td style={{ fontWeight: 600, border: '1px solid #e5e7eb', padding: '0.5rem' }}>{prog.id_programa}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{prog.fecha}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem' }}>{prog.nombre_turno}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center', fontWeight: 'bold', color: '#4b5563' }}>{prog.cant_recetas}</td>
                  <td style={{ border: '1px solid #e5e7eb', padding: '0.4rem 0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
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
      )}
    </div>
  );
}
