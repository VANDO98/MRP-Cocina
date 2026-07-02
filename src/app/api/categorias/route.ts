import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const categorias = await db`
      SELECT id_categoria_insumo, nombre_categoria
      FROM Categoria_Insumo
      ORDER BY nombre_categoria ASC
    `;
    return NextResponse.json(categorias);
  } catch (error: any) {
    console.error('❌ Error al obtener categorías de PostgreSQL:', error);
    return NextResponse.json(
      { error: 'Error al cargar categorías: ' + error.message },
      { status: 500 }
    );
  }
}
