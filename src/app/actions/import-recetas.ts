'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import * as cheerio from 'cheerio';

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

export type ValidationResult = {
  nombre: string;
  codigo: string;
  categoria: string;
  ingredientesCount: number;
  existe: boolean;
};

export async function procesarExcelRawRecetas(formData: FormData): Promise<ParsedRecipeRow[]> {
  const file = formData.get('file') as File;
  if (!file) throw new Error("Archivo no enviado");
  
  const bytes = await file.arrayBuffer();
  const html = new TextDecoder('utf-8').decode(bytes);
  
  const $ = cheerio.load(html);
  const h3s = $('h3');
  const result: ParsedRecipeRow[] = [];

  h3s.each((idx, el) => {
    const text = $(el).text().trim();
    if (text.startsWith('Receta:')) {
      const recipeName = text.replace('Receta:', '').replace(/\u00a0/g, ' ').trim();
      const trContainingH3 = $(el).closest('tr');
      const trPrev = trContainingH3.prev();
      
      let recipeMeta = {
        codigo: '',
        nombre: recipeName,
        raciones: 1,
        unidad: 'UNIDAD',
        categoria: 'Otros',
        costoUnitario: 0,
        costoTotal: 0
      };

      const tds = trPrev.find('td');
      if (tds.length >= 8) {
        recipeMeta.codigo = $(tds[0]).text().trim().replace(/&nbsp;/g, '').trim();
        if (recipeMeta.codigo === '-') recipeMeta.codigo = '';
        recipeMeta.raciones = Number($(tds[2]).text().trim().replace(/,/g, '')) || 1;
        recipeMeta.unidad = $(tds[3]).text().trim();
        recipeMeta.categoria = $(tds[4]).text().trim();
        
        recipeMeta.costoUnitario = Number($(tds[tds.length - 3]).text().trim()) || 0;
        recipeMeta.costoTotal = Number($(tds[tds.length - 2]).text().trim()) || 0;
      }

      const table = trContainingH3.find('table').first();
      if (table.length > 0) {
        table.find('tbody tr').each((rIdx, tr) => {
          const tdsIng = $(tr).find('td');
          if (tdsIng.length >= 3) {
            const qty = Number($(tdsIng[0]).text().trim()) || 0;
            const unit = $(tdsIng[1]).text().trim();
            const insumoRaw = $(tdsIng[2]).text().trim();
            const insumoClean = insumoRaw.split('>').pop()?.trim().replace(/\u00a0/g, ' ') || '';
            
            if (insumoClean) {
              result.push({
                recipe_codigo: recipeMeta.codigo,
                recipe_nombre: recipeMeta.nombre,
                recipe_categoria: recipeMeta.categoria,
                recipe_raciones: recipeMeta.raciones,
                recipe_unidad: recipeMeta.unidad,
                recipe_costo: recipeMeta.costoTotal,
                insumo_nombre: insumoClean,
                insumo_cantidad: qty,
                insumo_unidad: unit
              });
            }
          }
        });
      }
    }
  });

  return result;
}

export async function validarImportacionRecetas(recetasPlanas: ParsedRecipeRow[]): Promise<ValidationResult[]> {
  if (recetasPlanas.length === 0) return [];

  // Obtener nombres de recetas únicas en el archivo
  const nombresUnicos = Array.from(new Set(recetasPlanas.map(r => r.recipe_nombre.trim().toUpperCase())));

  // Consultar cuáles existen ya en la base de datos
  const dbRecetas = await db`
    SELECT nombre_receta 
    FROM Receta 
    WHERE nombre_receta = ANY(${nombresUnicos})
  `;
  const setExistentes = new Set(dbRecetas.map(r => String(r.nombre_receta).toUpperCase().trim()));

  // Contar ingredientes por receta
  const mapaRecetas: Record<string, { codigo: string; categoria: string; count: number }> = {};
  recetasPlanas.forEach(r => {
    const key = r.recipe_nombre.trim().toUpperCase();
    if (!mapaRecetas[key]) {
      mapaRecetas[key] = {
        codigo: r.recipe_codigo,
        categoria: r.recipe_categoria,
        count: 0
      };
    }
    mapaRecetas[key].count++;
  });

  return Object.entries(mapaRecetas).map(([nombre, meta]) => ({
    nombre,
    codigo: meta.codigo,
    categoria: meta.categoria,
    ingredientesCount: meta.count,
    existe: setExistentes.has(nombre)
  })).sort((a, b) => a.nombre.localeCompare(b.nombre));
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

    const unidades = await sql`SELECT id_unidad, simbolo FROM Unidad_Medida`;
    const mapUnidades: Record<string, number> = {};
    unidades.forEach(u => { mapUnidades[String(u.simbolo).toUpperCase()] = u.id_unidad; });

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
          // El insumo ya existe en la BD. Validar y convertir unidades si es necesario
          idInsumo = dbInsumo.id_insumo;
          const dbUnit = dbInsumo.unidad;

          if (dbUnit === 'KILOS' && (rawUnit === 'GRAMOS' || rawUnit === 'GR' || rawUnit === 'G')) {
            qtyToInsert = ing.cantidad / 1000;
          } else if (dbUnit === 'LITROS' && (rawUnit === 'MILILITRO' || rawUnit === 'ML' || rawUnit === 'CM3')) {
            qtyToInsert = ing.cantidad / 1000;
          }
        } else {
          // El insumo NO existe. Crear el insumo con conversión de unidades inteligente
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

          // Crear el nuevo insumo en la categoría por defecto (ej: 1 = ABARROTES)
          const insertInsumo = await sql`
            INSERT INTO Insumo (nombre_insumo, id_categoria_insumo, id_unidad, precio_defecto)
            VALUES (${nameIng}, 1, ${idUnidad}, 0)
            RETURNING id_insumo
          `;
          idInsumo = insertInsumo[0].id_insumo;
          
          // Actualizar mapa en memoria
          mapInsumos[nameIng] = { id_insumo: idInsumo, unidad: targetUnit };
        }

        // Insertar detalle de receta
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
