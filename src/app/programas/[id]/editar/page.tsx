import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProgramaEditarForm from '@/components/ProgramaEditarForm';

export default async function EditarProgramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Consultar programa
  const programas = await db`
    SELECT p.id_programa, p.fecha, t.nombre_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.id_programa = ${id}
  `;
  const programa = programas[0];

  if (!programa) notFound();

  const fechaFormateada = new Date(programa.fecha).toISOString().split('T')[0];

  // Consultar recetas actuales del programa
  const recetasActuales = await db`
    SELECT pd.id_receta, r.nombre_receta, pd.raciones_programadas
    FROM Programa_Detalle pd
    JOIN Receta r ON pd.id_receta = r.id_receta
    WHERE pd.id_programa = ${id}
    ORDER BY r.nombre_receta ASC
  `;

  // Mapear recetas actuales
  const recetasMapped = recetasActuales.map(r => ({
    id_receta: r.id_receta,
    nombre_receta: r.nombre_receta,
    raciones_programadas: Number(r.raciones_programadas)
  }));

  // Consultar catálogo completo de recetas
  const catalogoRecetas = await db`
    SELECT id_receta, nombre_receta
    FROM Receta
    ORDER BY nombre_receta ASC
  `;

  const programaMod = {
    ...programa,
    fecha: fechaFormateada
  };

  return (
    <div>
      <Link href="/programas" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600 }}>
        &larr; Volver a Programas
      </Link>

      <h1 style={{ marginTop: '1.5rem', marginBottom: '0.2rem' }}>Editar Programa de Producción</h1>
      <p style={{ color: '#666' }}>Modifica los platos programados o ajusta las raciones para este turno.</p>

      <ProgramaEditarForm 
        programa={programaMod} 
        recetasActuales={recetasMapped} 
        catalogoRecetas={catalogoRecetas as any} 
      />
    </div>
  );
}
