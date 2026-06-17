'use server'

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPrograma(fecha: string, id_turno: number, recetas: { id_receta: number, raciones: number }[]) {
  const turno = db.prepare('SELECT nombre_turno FROM Turno WHERE id_turno = ?').get(id_turno) as { nombre_turno: string };
  if (!turno) throw new Error("Turno no encontrado");

  // Formato: 2026-06-16-1
  const id_programa = `${fecha}-${id_turno}`;

  // Verificar si ya existe, si existe lo borramos para sobreescribir o lanzamos error.
  // En este caso lo sobreescribiremos para simplificar (o hacer "upsert").
  db.transaction(() => {
    db.prepare('DELETE FROM Programa_Detalle WHERE id_programa = ?').run(id_programa);
    db.prepare('DELETE FROM Despacho_Consolidado WHERE id_programa = ?').run(id_programa);
    db.prepare('DELETE FROM Programa_Produccion WHERE id_programa = ?').run(id_programa);

    db.prepare('INSERT INTO Programa_Produccion (id_programa, fecha, id_turno) VALUES (?, ?, ?)').run(id_programa, fecha, id_turno);

    // Agrupar raciones de recetas repetidas
    const recetasAgrupadas: Record<number, number> = {};
    for (const r of recetas) {
      if (r.raciones > 0) {
        recetasAgrupadas[r.id_receta] = (recetasAgrupadas[r.id_receta] || 0) + r.raciones;
      }
    }

    const insertDetalle = db.prepare('INSERT INTO Programa_Detalle (id_programa, id_receta, raciones_programadas, raciones_producidas) VALUES (?, ?, ?, 0)');
    for (const [id_receta_str, raciones] of Object.entries(recetasAgrupadas)) {
      const id_receta = Number(id_receta_str);
      insertDetalle.run(id_programa, id_receta, raciones);
    }
    
    // Inicializar Despacho_Consolidado con cantidad_real_entregada = 0
    // Calculamos el consolidado teórico
    const consolidado = db.prepare(`
      SELECT rd.id_insumo, SUM(rd.cantidad_unitaria * pd.raciones_programadas) as cantidad_teorica
      FROM Programa_Detalle pd
      JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
      WHERE pd.id_programa = ?
      GROUP BY rd.id_insumo
    `).all(id_programa) as any[];

    const insertDespacho = db.prepare('INSERT INTO Despacho_Consolidado (id_programa, id_insumo, cantidad_teorica_calculada, cantidad_real_entregada) VALUES (?, ?, ?, 0)');
    for (const c of consolidado) {
      insertDespacho.run(id_programa, c.id_insumo, c.cantidad_teorica);
    }
  })();

  revalidatePath('/programas');
  return id_programa;
}

export async function updateDespachoManual(id_programa: string, id_insumo: number, cantidad: number | null) {
  db.prepare(`
    UPDATE Despacho_Consolidado 
    SET cantidad_real_entregada = ?
    WHERE id_programa = ? AND id_insumo = ?
  `).run(cantidad, id_programa, id_insumo);
  
  revalidatePath(`/programas/${id_programa}`);
}

export async function saveReceta(id_receta: number | null, nombre: string, id_categoria: number, insumos: { id_insumo: number, cantidad: number }[]) {
  const resultId = db.transaction(() => {
    let finalId = id_receta;
    
    if (finalId) {
      db.prepare('UPDATE Receta SET nombre_receta = ?, id_categoria_receta = ? WHERE id_receta = ?').run(nombre, id_categoria, finalId);
      db.prepare('DELETE FROM Receta_Detalle WHERE id_receta = ?').run(finalId);
    } else {
      const res = db.prepare('INSERT INTO Receta (nombre_receta, id_categoria_receta) VALUES (?, ?)').run(nombre, id_categoria);
      finalId = res.lastInsertRowid as number;
    }

    const insertDetalle = db.prepare('INSERT INTO Receta_Detalle (id_receta, id_insumo, cantidad_unitaria) VALUES (?, ?, ?)');
    for (const item of insumos) {
      insertDetalle.run(finalId, item.id_insumo, item.cantidad);
    }
    
    return finalId;
  })();

  revalidatePath('/recetas');
  if (id_receta) revalidatePath(`/recetas/${id_receta}`);
  
  return resultId;
}

export async function updateRacionesProducidas(id_programa: string, id_receta: number, raciones: number | null) {
  db.prepare(`
    UPDATE Programa_Detalle
    SET raciones_producidas = ?
    WHERE id_programa = ? AND id_receta = ?
  `).run(raciones, id_programa, id_receta);

  revalidatePath(`/programas/${id_programa}`);
}

export async function updateDespachoDiario(fecha: string, id_insumo: number, cantidadDia: number | null) {
  const cantidadRealDia = cantidadDia ?? 0;

  // Obtener todos los despachos del día para ese insumo
  const despachos = db.prepare(`
    SELECT dc.id_despacho, dc.cantidad_teorica_calculada, p.id_programa
    FROM Despacho_Consolidado dc
    JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
    WHERE p.fecha = ? AND dc.id_insumo = ?
  `).all(fecha, id_insumo) as any[];

  const totalTeoricoDia = despachos.reduce((sum, d) => sum + d.cantidad_teorica_calculada, 0);

  // Prorratear la entrega del día
  db.transaction(() => {
    for (const d of despachos) {
      let parteProporcional = 0;
      if (totalTeoricoDia > 0) {
        parteProporcional = cantidadRealDia * (d.cantidad_teorica_calculada / totalTeoricoDia);
      }
      db.prepare('UPDATE Despacho_Consolidado SET cantidad_real_entregada = ? WHERE id_despacho = ?')
        .run(parteProporcional, d.id_despacho);
    }
  })();

  // Revalidar las rutas de todos los programas involucrados en esa fecha
  for (const d of despachos) {
    revalidatePath(`/programas/${d.id_programa}`);
  }
}

export async function deletePrograma(id_programa: string) {
  db.transaction(() => {
    db.prepare('DELETE FROM Programa_Detalle WHERE id_programa = ?').run(id_programa);
    db.prepare('DELETE FROM Despacho_Consolidado WHERE id_programa = ?').run(id_programa);
    db.prepare('DELETE FROM Programa_Produccion WHERE id_programa = ?').run(id_programa);
  })();

  revalidatePath('/programas');
  revalidatePath('/');
}

export async function saveProgramaEdicion(id_programa: string, recetas: { id_receta: number, raciones: number }[]) {
  // Obtener fecha del programa
  const programa = db.prepare('SELECT fecha FROM Programa_Produccion WHERE id_programa = ?').get(id_programa) as { fecha: string };
  if (!programa) throw new Error("Programa no encontrado");

  db.transaction(() => {
    // 1. Obtener las raciones reales (producidas) actuales para conservarlas si es posible
    const detallesActuales = db.prepare('SELECT id_receta, raciones_producidas FROM Programa_Detalle WHERE id_programa = ?').all(id_programa) as any[];
    const mapReales: Record<number, number> = {};
    detallesActuales.forEach(d => {
      mapReales[d.id_receta] = d.raciones_producidas;
    });

    // 2. Limpiar detalle actual
    db.prepare('DELETE FROM Programa_Detalle WHERE id_programa = ?').run(id_programa);

    // 3. Insertar nuevos registros de recetas agrupando por receta para evitar duplicados
    const recetasAgrupadas: Record<number, number> = {};
    recetas.forEach(r => {
      if (r.raciones > 0) {
        recetasAgrupadas[r.id_receta] = (recetasAgrupadas[r.id_receta] || 0) + r.raciones;
      }
    });

    const insertDetalle = db.prepare('INSERT INTO Programa_Detalle (id_programa, id_receta, raciones_programadas, raciones_producidas) VALUES (?, ?, ?, ?)');
    for (const [id_receta_str, raciones] of Object.entries(recetasAgrupadas)) {
      const id_receta = Number(id_receta_str);
      // Mantener la producción real si ya existía el plato, de lo contrario inicializar en 0
      const realProducido = mapReales[id_receta] !== undefined ? mapReales[id_receta] : 0;
      insertDetalle.run(id_programa, id_receta, raciones, realProducido);
    }

    // 4. Calcular el nuevo consolidado teórico del programa
    const nuevoConsolidadoTeorico = db.prepare(`
      SELECT rd.id_insumo, SUM(rd.cantidad_unitaria * pd.raciones_programadas) as cantidad_teorica
      FROM Programa_Detalle pd
      JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
      WHERE pd.id_programa = ?
      GROUP BY rd.id_insumo
    `).all(id_programa) as any[];

    // 5. Conservar las entregas reales actuales antes de vaciar Despacho_Consolidado
    const despachosActuales = db.prepare('SELECT id_insumo, cantidad_real_entregada FROM Despacho_Consolidado WHERE id_programa = ?').all(id_programa) as any[];
    const mapEntregasReales: Record<number, number> = {};
    despachosActuales.forEach(d => {
      mapEntregasReales[d.id_insumo] = d.cantidad_real_entregada;
    });

    // Limpiar despacho consolidado del programa
    db.prepare('DELETE FROM Despacho_Consolidado WHERE id_programa = ?').run(id_programa);

    // Re-insertar con los nuevos teóricos calculados
    const insertDespacho = db.prepare('INSERT INTO Despacho_Consolidado (id_programa, id_insumo, cantidad_teorica_calculada, cantidad_real_entregada) VALUES (?, ?, ?, ?)');
    for (const c of nuevoConsolidadoTeorico) {
      // Conservar el real entregado si ya existía para ese insumo, de lo contrario inicializar en 0
      const realEntregado = mapEntregasReales[c.id_insumo] !== undefined ? mapEntregasReales[c.id_insumo] : 0;
      insertDespacho.run(id_programa, c.id_insumo, c.cantidad_teorica, realEntregado);
    }

    // 6. Recalcular prorrateo de insumos de Proteínas y Verduras (día completo)
    // Al haber cambiado los teóricos de este turno, la participación teórica de cada turno en el día cambia.
    // Debemos consultar el acumulado real del día de cada insumo diario y volver a distribuirlo.
    const insumosDiarios = db.prepare(`
      SELECT DISTINCT dc.id_insumo
      FROM Despacho_Consolidado dc
      JOIN Insumo i ON dc.id_insumo = i.id_insumo
      WHERE dc.id_programa = ? AND i.id_categoria_insumo IN (2, 3, 4, 10)
    `).all(id_programa) as { id_insumo: number }[];

    for (const item of insumosDiarios) {
      // Consultar la entrega real sumada de todo el día para este insumo
      const totalRealDiaQuery = db.prepare(`
        SELECT SUM(COALESCE(dc.cantidad_real_entregada, 0)) as total_real
        FROM Despacho_Consolidado dc
        JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
        WHERE p.fecha = ? AND dc.id_insumo = ?
      `).get(programa.fecha, item.id_insumo) as { total_real: number };

      const totalRealDia = totalRealDiaQuery ? totalRealDiaQuery.total_real : 0;

      // Obtener todos los despachos de ese insumo en ese día (incluyendo el programa recién editado)
      const despachos = db.prepare(`
        SELECT dc.id_despacho, dc.cantidad_teorica_calculada
        FROM Despacho_Consolidado dc
        JOIN Programa_Produccion p ON dc.id_programa = p.id_programa
        WHERE p.fecha = ? AND dc.id_insumo = ?
      `).all(programa.fecha, item.id_insumo) as any[];

      const totalTeoricoDia = despachos.reduce((sum, d) => sum + d.cantidad_teorica_calculada, 0);

      // Re-distribuir proporcionalmente con la nueva proporción
      for (const d of despachos) {
        let parteProporcional = 0;
        if (totalTeoricoDia > 0) {
          parteProporcional = totalRealDia * (d.cantidad_teorica_calculada / totalTeoricoDia);
        }
        db.prepare('UPDATE Despacho_Consolidado SET cantidad_real_entregada = ? WHERE id_despacho = ?')
          .run(parteProporcional, d.id_despacho);
      }
    }
  })();

  // Revalidar paths de la fecha
  const programasFecha = db.prepare('SELECT id_programa FROM Programa_Produccion WHERE fecha = ?').all(programa.fecha) as { id_programa: string }[];
  for (const pf of programasFecha) {
    revalidatePath(`/programas/${pf.id_programa}`);
  }
  revalidatePath('/programas');
  revalidatePath('/');
}
