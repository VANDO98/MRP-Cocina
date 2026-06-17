import { db } from '@/lib/db';
import InsumoForm from '@/components/InsumoForm';

export default async function NuevoInsumoPage() {
  const categorias = await db`SELECT id_categoria_insumo, nombre_categoria FROM Categoria_Insumo ORDER BY nombre_categoria ASC`;
  const unidades = await db`SELECT id_unidad, nombre_unidad, simbolo FROM Unidad_Medida ORDER BY nombre_unidad ASC`;

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem' }}>Añadir Nuevo Insumo</h1>
      <InsumoForm categorias={categorias as any} unidades={unidades as any} />
    </div>
  );
}
