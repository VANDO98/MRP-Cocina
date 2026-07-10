'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export type ParsedRecipeRow = {
  recipe_codigo: string;
  recipe_nombre: string;
  recipe_categoria: string;
  recipe_raciones: number;
  recipe_unidad: string;
  recipe_costo: number;
  insumo_nombre: string;
  insumo_cantidad: number;
  insumo_unidad: string;
};

export async function validarRecetasExistentes(nombresUnicos: string[]): Promise<string[]> {
  if (nombresUnicos.length === 0) return [];
  
  // Limpiar nombres para comparación
  const nombresClean = nombresUnicos.map(n => n.trim().toUpperCase());

  // Consultar cuáles existen ya en la base de datos
  const dbRecetas = await db`
    SELECT nombre_receta 
    FROM Receta 
    WHERE nombre_receta = ANY(${nombresClean})
  `;
  return dbRecetas.map(r => String(r.nombre_receta).toUpperCase().trim());
}

export async function importarRecetasBD(recetasPlanas: ParsedRecipeRow[], nombresRecetasAImportar: string[]) {
  if (recetasPlanas.length === 0 || nombresRecetasAImportar.length === 0) {
    return { success: false, message: "No hay recetas seleccionadas para importar." };
  }

  const setAImportar = new Set(nombresRecetasAImportar.map(n => n.toUpperCase().trim()));

  // Filtrar filas planas por las recetas seleccionadas
  const filasFiltradas = recetasPlanas.filter(row => setAImportar.has(row.recipe_nombre.toUpperCase().trim()));

  // Agrupar por receta
  const recetasAgrupadas: Record<string, {
    codigo: string;
    categoria: string;
    raciones: number;
    unidad: string;
    costo: number;
    ingredientes: { nombre: string; cantidad: number; unidad: string }[]
  }> = {};

  filasFiltradas.forEach(row => {
    const key = row.recipe_nombre.trim().toUpperCase();
    if (!recetasAgrupadas[key]) {
      recetasAgrupadas[key] = {
        codigo: row.recipe_codigo,
        categoria: row.recipe_categoria,
        raciones: row.recipe_raciones,
        unidad: row.recipe_unidad,
        costo: row.recipe_costo,
        ingredientes: []
      };
    }
    recetasAgrupadas[key].ingredientes.push({
      nombre: row.insumo_nombre,
      cantidad: row.insumo_cantidad,
      unidad: row.insumo_unidad
    });
  });

  await db.begin(async sql => {
    // 1. Obtener datos de referencia de la BD para mapeo inteligente
    const categoriasReceta = await sql`SELECT id_categoria_receta, nombre_categoria FROM Categoria_Receta`;
    const mapCatReceta: Record<string, number> = {};
    categoriasReceta.forEach(c => { mapCatReceta[String(c.nombre_categoria).toUpperCase()] = c.id_categoria_receta; });

    const units = await sql`SELECT id_unidad, simbolo FROM Unidad_Medida`;
    const mapUnidades: Record<string, number> = {};
    units.forEach(u => { mapUnidades[String(u.simbolo).toUpperCase()] = u.id_unidad; });

    const insumosExistentes = await sql`
      SELECT i.id_insumo, i.nombre_insumo, u.simbolo as unidad 
      FROM Insumo i
      LEFT JOIN Unidad_Medida u ON i.id_unidad = u.id_unidad
    `;
    const mapInsumos: Record<string, { id_insumo: number; unidad: string }> = {};
    insumosExistentes.forEach(i => {
      mapInsumos[String(i.nombre_insumo).toUpperCase()] = {
        id_insumo: i.id_insumo,
        unidad: String(i.unidad || '').toUpperCase()
      };
    });

    // 2. Procesar recetas
    for (const [nombreReceta, rData] of Object.entries(recetasAgrupadas)) {
      const catRecetaName = rData.categoria.trim().toUpperCase() || 'OTROS';
      let idCatReceta = mapCatReceta[catRecetaName];
      if (!idCatReceta) {
        const insertCat = await sql`
          INSERT INTO Categoria_Receta (nombre_categoria) 
          VALUES (${catRecetaName}) 
          RETURNING id_categoria_receta
        `;
        idCatReceta = insertCat[0].id_categoria_receta;
        mapCatReceta[catRecetaName] = idCatReceta;
      }

      // Crear o actualizar receta
      const recetaExistente = await sql`SELECT id_receta FROM Receta WHERE nombre_receta = ${nombreReceta}`;
      let idReceta: number;
      if (recetaExistente.length > 0) {
        idReceta = recetaExistente[0].id_receta;
        await sql`
          UPDATE Receta 
          SET id_categoria_receta = ${idCatReceta}
          WHERE id_receta = ${idReceta}
        `;
      } else {
        const insertReceta = await sql`
          INSERT INTO Receta (nombre_receta, id_categoria_receta) 
          VALUES (${nombreReceta.toUpperCase()}, ${idCatReceta}) 
          RETURNING id_receta
        `;
        idReceta = insertReceta[0].id_receta;
      }

      // Limpiar ingredientes existentes de la receta
      await sql`DELETE FROM Receta_Detalle WHERE id_receta = ${idReceta}`;

      // Insertar ingredientes con conversión de unidades inteligente
      for (const ing of rData.ingredientes) {
        const nameIng = ing.nombre.trim().toUpperCase();
        const rawUnit = ing.unidad.trim().toUpperCase();
        let qtyToInsert = ing.cantidad;
        let idInsumo: number;

        const dbInsumo = mapInsumos[nameIng];

        if (dbInsumo) {
          idInsumo = dbInsumo.id_insumo;
          const dbUnit = dbInsumo.unidad;

          if (dbUnit === 'KILOS' && (rawUnit === 'GRAMOS' || rawUnit === 'GR' || rawUnit === 'G')) {
            qtyToInsert = ing.cantidad / 1000;
          } else if (dbUnit === 'LITROS' && (rawUnit === 'MILILITRO' || rawUnit === 'ML' || rawUnit === 'CM3')) {
            qtyToInsert = ing.cantidad / 1000;
          }
        } else {
          let targetUnit = rawUnit;
          if (rawUnit === 'GRAMOS' || rawUnit === 'GR' || rawUnit === 'G') {
            targetUnit = 'KILOS';
            qtyToInsert = ing.cantidad / 1000;
          } else if (rawUnit === 'MILILITRO' || rawUnit === 'ML' || rawUnit === 'CM3') {
            targetUnit = 'LITROS';
            qtyToInsert = ing.cantidad / 1000;
          }

          let idUnidad = mapUnidades[targetUnit];
          if (!idUnidad) {
            const insertUnd = await sql`
              INSERT INTO Unidad_Medida (simbolo) 
              VALUES (${targetUnit}) 
              RETURNING id_unidad
            `;
            idUnidad = insertUnd[0].id_unidad;
            mapUnidades[targetUnit] = idUnidad;
          }

          const insertInsumo = await sql`
            INSERT INTO Insumo (nombre_insumo, id_categoria_insumo, id_unidad, precio_defecto)
            VALUES (${nameIng}, 1, ${idUnidad}, 0)
            RETURNING id_insumo
          `;
          idInsumo = insertInsumo[0].id_insumo;
          
          mapInsumos[nameIng] = { id_insumo: idInsumo, unidad: targetUnit };
        }

        // Insertar detalle
        await sql`
          INSERT INTO Receta_Detalle (id_receta, id_insumo, cantidad_unitaria)
          VALUES (${idReceta}, ${idInsumo}, ${qtyToInsert})
        `;
      }
    }
  });

  revalidatePath('/recetas');
  revalidatePath('/programas/nuevo');

  return { success: true, message: `Se importaron/actualizaron ${Object.keys(recetasAgrupadas).length} recetas correctamente.` };
}
