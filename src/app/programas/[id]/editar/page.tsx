import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ProgramaEditarForm from '@/components/ProgramaEditarForm';

export default async function EditarProgramaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Consultar programa
  const programa = db.prepare(`
    SELECT p.id_programa, p.fecha, t.nombre_turno
    FROM Programa_Produccion p
    JOIN Turno t ON p.id_turno = t.id_turno
    WHERE p.id_programa = ?
  `).get(id) as any;

  if (!programa) notFound();

  // Consultar recetas actuales del programa
  const recetasActuales = db.prepare(`
    SELECT pd.id_receta, r.nombre_receta, pd.raciones_programadas
    FROM Programa_Detalle pd
    JOIN Receta r ON pd.id_receta = r.id_receta
    WHERE pd.id_programa = ?
    ORDER BY r.nombre_receta ASC
  `).all(id) as any[];

  // Consultar catálogo completo de recetas
  const catalogoRecetas = db.prepare(`
    SELECT id_receta, nombre_receta
    FROM Receta
    ORDER BY nombre_receta ASC
  `).all() as any[];

  return (
    <div>
      <Link href="/programas" style={{ color: 'var(--secondary-color)', textDecoration: 'none', fontWeight: 600 }}>
        &larr; Volver a Programas
      </Link>

      <h1 style={{ marginTop: '1.5rem', marginBottom: '0.2rem' }}>Editar Programa de Producción</h1>
      <p style={{ color: '#666' }}>Modifica los platos programados o ajusta las raciones para este turno.</p>

      <ProgramaEditarForm 
        programa={programa} 
        recetasActuales={recetasActuales} 
        catalogoRecetas={catalogoRecetas} 
      />
    </div>
  );
}
