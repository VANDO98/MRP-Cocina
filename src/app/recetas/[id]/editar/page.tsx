import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import RecetaForm from '@/components/RecetaForm';

export default async function EditarRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const receta = db.prepare('SELECT id_receta, nombre_receta, id_categoria_receta FROM Receta WHERE id_receta = ?').get(id) as any;
  if (!receta) notFound();

  const detallesIniciales = db.prepare('SELECT id_insumo, cantidad_unitaria as cantidad FROM Receta_Detalle WHERE id_receta = ?').all(id) as any[];

  const categorias = db.prepare('SELECT id_categoria_receta, nombre_categoria FROM Categoria_Receta ORDER BY nombre_categoria ASC').all() as any[];
  
  const insumosList = db.prepare(`
    SELECT i.id_insumo, i.nombre_insumo, u.simbolo
    FROM Insumo i
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY i.nombre_insumo ASC
  `).all() as any[];

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Editar Receta: {receta.nombre_receta}</h1>
      <RecetaForm 
        receta={receta} 
        detallesIniciales={detallesIniciales} 
        categorias={categorias} 
        insumosList={insumosList} 
      />
    </div>
  );
}
