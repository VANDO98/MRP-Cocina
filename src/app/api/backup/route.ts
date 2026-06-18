import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const turnos = await db`SELECT * FROM Turno`;
    const unidades = await db`SELECT * FROM Unidad_Medida`;
    const categorias_insumo = await db`SELECT * FROM Categoria_Insumo`;
    const insumos = await db`SELECT * FROM Insumo`;
    const categorias_receta = await db`SELECT * FROM Categoria_Receta`;
    const recetas = await db`SELECT * FROM Receta`;
    const recetas_detalle = await db`SELECT * FROM Receta_Detalle`;
    const programas = await db`SELECT * FROM Programa_Produccion`;
    const programas_detalle = await db`SELECT * FROM Programa_Detalle`;
    const despachos = await db`SELECT * FROM Despacho_Consolidado`;

    const data = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      tables: {
        Turno: turnos,
        Unidad_Medida: unidades,
        Categoria_Insumo: categorias_insumo,
        Insumo: insumos,
        Categoria_Receta: categorias_receta,
        Receta: recetas,
        Receta_Detalle: recetas_detalle,
        Programa_Produccion: programas,
        Programa_Detalle: programas_detalle,
        Despacho_Consolidado: despachos,
      }
    };

    const fileName = `mrp_cocina_backup_${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error al generar el backup:', error);
    return NextResponse.json({ error: 'Error al generar la copia de seguridad' }, { status: 500 });
  }
}
