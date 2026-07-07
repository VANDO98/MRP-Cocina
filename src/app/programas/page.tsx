import { db } from '@/lib/db';
import Link from 'next/link';
import ProgramasListClient from '@/components/ProgramasListClient';
import ExportarValorizacionBtn from '@/components/ExportarValorizacionBtn';

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
  type ProgRow = {
    id_programa: string;
    fecha: string;
    nombre_turno: string;
    cant_recetas: number;
  };
  
  const porFecha: Record<string, ProgRow[]> = {};
  programas.forEach(p => {
    const fecha = new Date(p.fecha).toISOString().split('T')[0];
    if (!porFecha[fecha]) porFecha[fecha] = [];
    porFecha[fecha].push({
      id_programa: p.id_programa,
      fecha: p.fecha,
      nombre_turno: p.nombre_turno,
      cant_recetas: Number(p.cant_recetas)
    });
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <ExportarValorizacionBtn />
            <Link href="/programas/nuevo" className="btn">
              + Nuevo Programa
            </Link>
          </div>
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
        <ProgramasListClient fechasOrdenadas={fechasOrdenadas} porFecha={porFecha} />
      )}
    </div>
  );
}

