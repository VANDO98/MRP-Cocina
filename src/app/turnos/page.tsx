import { db } from '@/lib/db';
import TurnosClient from '@/components/TurnosClient';

export const dynamic = 'force-dynamic';

export default async function TurnosPage() {
  const turnos = await db`
    SELECT id_turno, nombre_turno, activo
    FROM Turno
    ORDER BY nombre_turno ASC
  `;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <span className="overline">Catálogo de Sistema</span>
          <h1 style={{ margin: 0 }}>Gestión de Turnos</h1>
          <p style={{ margin: '0.3rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Crea nuevos turnos de producción o activa/desactiva los existentes.
          </p>
        </div>
      </div>
      <TurnosClient initialTurnos={turnos as any} />
    </div>
  );
}
