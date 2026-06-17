import ExcelPasteForm from '@/components/ExcelPasteForm';
import { db } from '@/lib/db';

export default function NuevoProgramaPage() {
  const turnos = db.prepare('SELECT id_turno, nombre_turno FROM Turno').all() as any[];
  const recetas = db.prepare('SELECT id_receta, nombre_receta FROM Receta').all() as any[];

  return (
    <div>
      <h1>Nuevo Programa de Producción</h1>
      <p style={{ marginBottom: '2rem' }}>Selecciona la fecha, el turno y pega desde Excel las recetas y sus raciones.</p>
      
      <div className="card">
        <ExcelPasteForm turnos={turnos} recetas={recetas} />
      </div>
    </div>
  );
}
