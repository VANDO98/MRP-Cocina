import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import RecetaForm from '@/components/RecetaForm';

export default async function EditarRecetaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const recetas = await db`SELECT id_receta, nombre_receta, id_categoria_receta FROM Receta WHERE id_receta = ${id}`;
  const receta = recetas[0];
  if (!receta) notFound();

  const detalles = await db`SELECT id_insumo, cantidad_unitaria as cantidad FROM Receta_Detalle WHERE id_receta = ${id}`;
  
  // Mapear detalles iniciales para castear la cantidad a Number
  const detallesIniciales = detalles.map(d => ({
    id_insumo: d.id_insumo,
    cantidad: Number(d.cantidad)
  }));

  const categorias = await db`SELECT id_categoria_receta, nombre_categoria FROM Categoria_Receta ORDER BY nombre_categoria ASC`;
  
  const insumosList = await db`
    SELECT i.id_insumo, i.nombre_insumo, u.simbolo
    FROM Insumo i
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY i.nombre_insumo ASC
  `;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Editar Receta: {receta.nombre_receta}</h1>
      <RecetaForm 
        receta={receta as any} 
        detallesIniciales={detallesIniciales} 
        categorias={categorias as any} 
        insumosList={insumosList as any} 
      />
    </div>
  );
}
