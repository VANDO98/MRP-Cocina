import { db } from '@/lib/db';
import Link from 'next/link';
import ProgramasListClient from '@/components/ProgramasListClient';
import ExportarValorizacionBtn from '@/components/ExportarValorizacionBtn';

export default async function ProgramasPage() {
  const programas = await db`
    SELECT p.id_programa, p.fecha, t.nombre_turno, p.estado, COUNT(pd.id_receta) as cant_recetas
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    LEFT JOIN Programa_Detalle pd ON p.id_programa = pd.id_programa
    GROUP BY p.id_programa, p.fecha, t.nombre_turno, t.id_turno, p.estado
    ORDER BY p.fecha DESC, t.id_turno ASC
  `;

  // Mapear los programas a una estructura plana limpia
  const flatProgramas = programas.map(p => ({
    id_programa: p.id_programa as string,
    fecha: new Date(p.fecha).toISOString().split('T')[0],
    nombre_turno: p.nombre_turno as string,
    cant_recetas: Number(p.cant_recetas),
    estado: (p.estado || 'Abierto') as string
  }));

  // Obtener cantidad de días únicos registrados
  const diasUnicos = new Set(flatProgramas.map(p => p.fecha)).size;

  return (
    <div>
      {/* ── ENCABEZADO EDITORIAL ── */}
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <span className="overline">Producción Diaria</span>
            <h1>Programas de <em>Producción</em></h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginTop: '0.3rem' }}>
              {flatProgramas.length} programa{flatProgramas.length !== 1 ? 's' : ''} · {diasUnicos} día{diasUnicos !== 1 ? 's' : ''} registrados
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ExportarValorizacionBtn />
            <Link href="/programas/nuevo" className="btn">
              + Nuevo Programa
            </Link>
          </div>
        </div>
      </div>

      {/* ── LISTA DE PROGRAMAS (TABLA ERP) ── */}
      {flatProgramas.length === 0 ? (
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
        <ProgramasListClient programas={flatProgramas} />
      )}
    </div>
  );
}

