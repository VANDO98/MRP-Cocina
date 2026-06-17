import { db } from '@/lib/db';
import RecetaForm from '@/components/RecetaForm';

export default async function NuevaRecetaPage() {
  const categorias = db.prepare('SELECT id_categoria_receta, nombre_categoria FROM Categoria_Receta ORDER BY nombre_categoria ASC').all() as any[];
  
  const insumosList = db.prepare(`
    SELECT i.id_insumo, i.nombre_insumo, u.simbolo
    FROM Insumo i
    LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    ORDER BY i.nombre_insumo ASC
  `).all() as any[];

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Crear Nueva Receta</h1>
      <RecetaForm categorias={categorias} insumosList={insumosList} />
    </div>
  );
}
