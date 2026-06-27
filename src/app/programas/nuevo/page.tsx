import ExcelPasteForm from '@/components/ExcelPasteForm';
import { db } from '@/lib/db';

export default async function NuevoProgramaPage() {
  const turnos = await db`SELECT id_turno, nombre_turno FROM Turno WHERE activo = TRUE`;
  const recetas = await db`SELECT id_receta, nombre_receta FROM Receta`;

  return (
    <div>
      <h1>Nuevo Programa de Producción</h1>
      <p style={{ marginBottom: '2rem' }}>Selecciona la fecha, el turno y pega desde Excel las recetas y sus raciones.</p>
      
      <div className="card">
        <ExcelPasteForm turnos={turnos as any} recetas={recetas as any} />
      </div>
    </div>
  );
}
