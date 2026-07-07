'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPrograma(fecha: string, id_turno: number, recetas: { id_receta: number, raciones: number }[]) {
  const turnos = await db`SELECT nombre_turno FROM Turno WHERE id_turno = ${id_turno}`;
  if (!turnos[0]) throw new Error("Turno no encontrado");

  // Formato: 2026-06-16-1
  const id_programa = `${fecha}-${id_turno}`;

  await db.begin(async sql => {
    await sql`DELETE FROM Programa_Detalle WHERE id_programa = ${id_programa}`;
    await sql`DELETE FROM Despacho_Consolidado WHERE id_programa = ${id_programa}`;
    await sql`DELETE FROM Programa_Produccion WHERE id_programa = ${id_programa}`;

    await sql`INSERT INTO Programa_Produccion (id_programa, fecha, id_turno) VALUES (${id_programa}, ${fecha}, ${id_turno})`;

    // Agrupar raciones de recetas repetidas
    const recetasAgrupadas: Record<number, number> = {};
    for (const r of recetas) {
      if (r.raciones > 0) {
        recetasAgrupadas[r.id_receta] = (recetasAgrupadas[r.id_receta] || 0) + r.raciones;
      }
    }

    for (const [id_receta_str, raciones] of Object.entries(recetasAgrupadas)) {
      const id_receta = Number(id_receta_str);
      await sql`INSERT INTO Programa_Detalle (id_programa, id_receta, raciones_programadas, raciones_producidas) VALUES (${id_programa}, ${id_receta}, ${raciones}, 0)`;
    }
    
    // Calculamos el consolidado teórico
    const consolidado = await sql`
      SELECT rd.id_insumo, SUM(rd.cantidad_unitaria * pd.raciones_programadas) as cantidad_teorica
      FROM Programa_Detalle pd
      JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
      WHERE pd.id_programa = ${id_programa}
      GROUP BY rd.id_insumo
    `;

    for (const c of consolidado) {
      await sql`INSERT INTO Despacho_Consolidado (id_programa, id_insumo, cantidad_teorica_calculada, cantidad_real_entregada) VALUES (${id_programa}, ${c.id_insumo}, ${c.cantidad_teorica}, 0)`;
    }
  });

  revalidatePath('/programas');
  revalidatePath('/');
  return id_programa;
}

export async function updateDespachoManual(id_programa: string, id_insumo: number, cantidad: number | null) {
  const cantidadNum = cantidad ?? 0;
  
  const insumos = await db`SELECT id_categoria_insumo FROM Insumo WHERE id_insumo = ${id_insumo}`;
  const esProteinaVerdura = [2, 3, 4, 10].includes(insumos[0]?.id_categoria_insumo);

  if (esProteinaVerdura) {
    const programas = await db`SELECT fecha FROM Programa_Produccion WHERE id_programa = ${id_programa}`;
    if (!programas[0]) return;
    const fecha = programas[0].fecha;

    // Obtener todos los despachos del día para ese insumo
    const despachos = await db`
      SELECT dc.id_despacho, dc.cantidad_teorica_calculada, p.id_programa
      FROM Despacho_Consolidado dc
      JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
      WHERE p.fecha = ${fecha} AND dc.id_insumo = ${id_insumo}
    `;

    const totalTeoricoDia = despachos.reduce((sum, d) => sum + Number(d.cantidad_teorica_calculada), 0);

    await db.begin(async sql => {
      for (const d of despachos) {
        let parteProporcional = 0;
        if (totalTeoricoDia > 0) {
          parteProporcional = cantidadNum * (Number(d.cantidad_teorica_calculada) / totalTeoricoDia);
        }
        await sql`UPDATE Despacho_Consolidado SET cantidad_real_entregada = ${parteProporcional} WHERE id_despacho = ${d.id_despacho}`;
      }
    });

    for (const d of despachos) {
      revalidatePath(`/programas/${d.id_programa}`);
    }
  } else {
    await db`
      UPDATE Despacho_Consolidado 
      SET cantidad_real_entregada = ${cantidadNum}
      WHERE id_programa = ${id_programa} AND id_insumo = ${id_insumo}
    `;
    revalidatePath(`/programas/${id_programa}`);
  }
}

export async function saveReceta(id_receta: number | null, nombre: string, id_categoria: number, insumos: { id_insumo: number, cantidad: number }[]) {
  const resultId = await db.begin(async sql => {
    let finalId = id_receta;
    
    if (finalId) {
      await sql`UPDATE Receta SET nombre_receta = ${nombre}, id_categoria_receta = ${id_categoria} WHERE id_receta = ${finalId}`;
      await sql`DELETE FROM Receta_Detalle WHERE id_receta = ${finalId}`;
    } else {
      const res = await sql`INSERT INTO Receta (nombre_receta, id_categoria_receta) VALUES (${nombre}, ${id_categoria}) RETURNING id_receta`;
      finalId = res[0].id_receta;
    }

    for (const item of insumos) {
      await sql`INSERT INTO Receta_Detalle (id_receta, id_insumo, cantidad_unitaria) VALUES (${finalId}, ${item.id_insumo}, ${item.cantidad})`;
    }
    
    return finalId;
  });

  revalidatePath('/recetas');
  if (id_receta) revalidatePath(`/recetas/${id_receta}`);
  
  return resultId;
}

export async function updateRacionesProducidas(id_programa: string, id_receta: number, raciones: number | null) {
  const racionesNum = raciones ?? 0;
  await db`
    UPDATE Programa_Detalle
    SET raciones_producidas = ${racionesNum}
    WHERE id_programa = ${id_programa} AND id_receta = ${id_receta}
  `;

  revalidatePath(`/programas/${id_programa}`);
}

export async function cerrarProgramaConTeorico(id_programa: string) {
  await db.begin(async sql => {
    // 1. Obtener el teórico producido por insumo basado en las raciones reales (raciones_producidas)
    const teoricos = await sql`
      SELECT rd.id_insumo, SUM(rd.cantidad_unitaria * pd.raciones_producidas) as cantidad_teorica_producida
      FROM Programa_Detalle pd
      JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
      WHERE pd.id_programa = ${id_programa}
      GROUP BY rd.id_insumo
    `;

    // 2. Actualizar el despacho consolidado asignando la cantidad real entregada igual al teórico producido
    for (const t of teoricos) {
      await sql`
        UPDATE Despacho_Consolidado
        SET cantidad_real_entregada = ${t.cantidad_teorica_producida}
        WHERE id_programa = ${id_programa} AND id_insumo = ${t.id_insumo}
      `;
    }
  });

  revalidatePath(`/programas/${id_programa}`);
}

export async function deletePrograma(id_programa: string) {
  await db.begin(async sql => {
    await sql`DELETE FROM Programa_Detalle WHERE id_programa = ${id_programa}`;
    await sql`DELETE FROM Despacho_Consolidado WHERE id_programa = ${id_programa}`;
    await sql`DELETE FROM Programa_Produccion WHERE id_programa = ${id_programa}`;
  });

  revalidatePath('/programas');
  revalidatePath('/');
}

export async function saveProgramaEdicion(id_programa: string, recetas: { id_receta: number, raciones: number }[]) {
  const programas = await db`SELECT fecha FROM Programa_Produccion WHERE id_programa = ${id_programa}`;
  if (!programas[0]) throw new Error("Programa no encontrado");
  const fecha = programas[0].fecha;

  await db.begin(async sql => {
    // 1. Obtener las raciones reales (producidas) actuales
    const detallesActuales = await sql`SELECT id_receta, raciones_producidas FROM Programa_Detalle WHERE id_programa = ${id_programa}`;
    const mapReales: Record<number, number> = {};
    detallesActuales.forEach(d => {
      mapReales[d.id_receta] = d.raciones_producidas;
    });

    // 2. Limpiar detalle actual
    await sql`DELETE FROM Programa_Detalle WHERE id_programa = ${id_programa}`;

    // 3. Insertar nuevos registros
    const recetasAgrupadas: Record<number, number> = {};
    recetas.forEach(r => {
      if (r.raciones > 0) {
        recetasAgrupadas[r.id_receta] = (recetasAgrupadas[r.id_receta] || 0) + r.raciones;
      }
    });

    for (const [id_receta_str, raciones] of Object.entries(recetasAgrupadas)) {
      const id_receta = Number(id_receta_str);
      const realProducido = mapReales[id_receta] !== undefined ? mapReales[id_receta] : 0;
      await sql`INSERT INTO Programa_Detalle (id_programa, id_receta, raciones_programadas, raciones_producidas) VALUES (${id_programa}, ${id_receta}, ${raciones}, ${realProducido})`;
    }

    // 4. Calcular el nuevo consolidado teórico
    const nuevoConsolidadoTeorico = await sql`
      SELECT rd.id_insumo, SUM(rd.cantidad_unitaria * pd.raciones_programadas) as cantidad_teorica
      FROM Programa_Detalle pd
      JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
      WHERE pd.id_programa = ${id_programa}
      GROUP BY rd.id_insumo
    `;

    // 5. Conservar las entregas reales actuales antes de vaciar Despacho_Consolidado
    const despachosActuales = await sql`SELECT id_insumo, cantidad_real_entregada FROM Despacho_Consolidado WHERE id_programa = ${id_programa}`;
    const mapEntregasReales: Record<number, number> = {};
    despachosActuales.forEach(d => {
      mapEntregasReales[d.id_insumo] = Number(d.cantidad_real_entregada);
    });

    await sql`DELETE FROM Despacho_Consolidado WHERE id_programa = ${id_programa}`;

    // Re-insertar con los nuevos teóricos calculados
    for (const c of nuevoConsolidadoTeorico) {
      const realEntregado = mapEntregasReales[c.id_insumo] !== undefined ? mapEntregasReales[c.id_insumo] : 0;
      await sql`INSERT INTO Despacho_Consolidado (id_programa, id_insumo, cantidad_teorica_calculada, cantidad_real_entregada) VALUES (${id_programa}, ${c.id_insumo}, ${c.cantidad_teorica}, ${realEntregado})`;
    }

    // 6. Recalcular prorrateo de insumos de Proteínas y Verduras (día completo)
    const insumosDiarios = await sql`
      SELECT DISTINCT dc.id_insumo
      FROM Despacho_Consolidado dc
      JOIN Insumo i ON dc.id_insumo = i.id_insumo
      WHERE dc.id_programa = ${id_programa} AND i.id_categoria_insumo IN (2, 3, 4, 10)
    `;

    for (const item of insumosDiarios) {
      const totalRealDiaQuery = await sql`
        SELECT SUM(COALESCE(dc.cantidad_real_entregada, 0)) as total_real
        FROM Despacho_Consolidado dc
        JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
        WHERE p.fecha = ${fecha} AND dc.id_insumo = ${item.id_insumo}
      `;
      const totalRealDia = totalRealDiaQuery[0]?.total_real ? Number(totalRealDiaQuery[0].total_real) : 0;

      const despachos = await sql`
        SELECT dc.id_despacho, dc.cantidad_teorica_calculada
        FROM Despacho_Consolidado dc
        JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
        WHERE p.fecha = ${fecha} AND dc.id_insumo = ${item.id_insumo}
      `;
      const totalTeoricoDia = despachos.reduce((sum, d) => sum + Number(d.cantidad_teorica_calculada), 0);

      for (const d of despachos) {
        let parteProporcional = 0;
        if (totalTeoricoDia > 0) {
          parteProporcional = totalRealDia * (Number(d.cantidad_teorica_calculada) / totalTeoricoDia);
        }
        await sql`UPDATE Despacho_Consolidado SET cantidad_real_entregada = ${parteProporcional} WHERE id_despacho = ${d.id_despacho}`;
      }
    }
  });

  const programasFecha = await db`SELECT id_programa FROM Programa_Produccion WHERE fecha = ${fecha}`;
  for (const pf of programasFecha) {
    revalidatePath(`/programas/${pf.id_programa}`);
  }
  revalidatePath('/programas');
  revalidatePath('/');
}

export async function updateDespachoDiario(fecha: string, id_insumo: number, cantidadDia: number | null) {
  const cantidadRealDia = cantidadDia ?? 0;

  const despachos = await db`
    SELECT dc.id_despacho, dc.cantidad_teorica_calculada, p.id_programa
    FROM Despacho_Consolidado dc
    JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
    WHERE p.fecha = ${fecha} AND dc.id_insumo = ${id_insumo}
  `;

  const totalTeoricoDia = despachos.reduce((sum, d) => sum + Number(d.cantidad_teorica_calculada), 0);

  await db.begin(async sql => {
    for (const d of despachos) {
      let parteProporcional = 0;
      if (totalTeoricoDia > 0) {
        parteProporcional = cantidadRealDia * (Number(d.cantidad_teorica_calculada) / totalTeoricoDia);
      }
      await sql`UPDATE Despacho_Consolidado SET cantidad_real_entregada = ${parteProporcional} WHERE id_despacho = ${d.id_despacho}`;
    }
  });

  for (const d of despachos) {
    revalidatePath(`/programas/${d.id_programa}`);
  }
}

export async function createInsumo(nombre_insumo: string, id_categoria_insumo: number, id_unidad: number) {
  const result = await db`
    INSERT INTO Insumo (nombre_insumo, id_categoria_insumo, id_unidad)
    VALUES (${nombre_insumo.trim().toUpperCase()}, ${id_categoria_insumo}, ${id_unidad})
    RETURNING id_insumo
  `;
  revalidatePath('/insumos');
  return result[0].id_insumo;
}
