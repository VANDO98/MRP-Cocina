const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.resolve(__dirname, '../production.db'));

db.transaction(() => {
  console.log("Iniciando conversión de unidades...");

  // Identificar IDs de unidades
  const getUnidadId = (simbolo) => {
    const row = db.prepare('SELECT id_unidad FROM Unidad_Medida WHERE simbolo = ?').get(simbolo);
    return row ? row.id_unidad : null;
  };

  const idGramos = getUnidadId('GRAMOS');
  let idKilos = getUnidadId('KILOS');
  const idMililitro = getUnidadId('MILILITRO');
  const idMiligramos = getUnidadId('MILIGRAMOS');

  // Asegurar que exista KILOS
  if (!idKilos) {
    const res = db.prepare('INSERT INTO Unidad_Medida (simbolo) VALUES (?)').run('KILOS');
    idKilos = res.lastInsertRowid;
  }

  // 1. Convertir GRAMOS a KILOS
  if (idGramos) {
    db.prepare(`
      UPDATE Receta_Detalle 
      SET cantidad_unitaria = cantidad_unitaria / 1000.0
      WHERE id_insumo IN (SELECT id_insumo FROM Insumo WHERE id_unidad = ?)
    `).run(idGramos);

    db.prepare('UPDATE Insumo SET id_unidad = ? WHERE id_unidad = ?').run(idKilos, idGramos);
    db.prepare('DELETE FROM Unidad_Medida WHERE id_unidad = ?').run(idGramos);
    console.log("GRAMOS convertidos a KILOS.");
  }

  // 2. Convertir MILIGRAMOS a KILOS
  if (idMiligramos) {
    db.prepare(`
      UPDATE Receta_Detalle 
      SET cantidad_unitaria = cantidad_unitaria / 1000000.0
      WHERE id_insumo IN (SELECT id_insumo FROM Insumo WHERE id_unidad = ?)
    `).run(idMiligramos);

    db.prepare('UPDATE Insumo SET id_unidad = ? WHERE id_unidad = ?').run(idKilos, idMiligramos);
    db.prepare('DELETE FROM Unidad_Medida WHERE id_unidad = ?').run(idMiligramos);
    console.log("MILIGRAMOS convertidos a KILOS.");
  }

  // 3. Convertir MILILITRO a LITROS
  if (idMililitro) {
    db.prepare(`
      UPDATE Receta_Detalle 
      SET cantidad_unitaria = cantidad_unitaria / 1000.0
      WHERE id_insumo IN (SELECT id_insumo FROM Insumo WHERE id_unidad = ?)
    `).run(idMililitro);

    // En lugar de mapearlo a otra, simplemente renombramos MILILITRO a LITROS
    db.prepare('UPDATE Unidad_Medida SET simbolo = ? WHERE id_unidad = ?').run('LITROS', idMililitro);
    console.log("MILILITRO convertidos a LITROS.");
  }

  // Opcional: Recalcular los consolidados de los programas que ya existan
  // Dado que acabamos de reducir las proporciones, los despachos consolidados teóricos 
  // deben ser recalculados para reflejar KILOS y LITROS.
  const programas = db.prepare('SELECT id_programa FROM Programa_Produccion').all();
  for (const p of programas) {
    db.prepare('DELETE FROM Despacho_Consolidado WHERE id_programa = ?').run(p.id_programa);
    
    const consolidado = db.prepare(`
      SELECT rd.id_insumo, SUM(rd.cantidad_unitaria * pd.raciones_programadas) as cantidad_teorica
      FROM Programa_Detalle pd
      JOIN Receta_Detalle rd ON pd.id_receta = rd.id_receta
      WHERE pd.id_programa = ?
      GROUP BY rd.id_insumo
    `).all(p.id_programa);

    const insertDespacho = db.prepare('INSERT INTO Despacho_Consolidado (id_programa, id_insumo, cantidad_teorica_calculada, cantidad_real_entregada) VALUES (?, ?, ?, null)');
    for (const c of consolidado) {
      insertDespacho.run(p.id_programa, c.id_insumo, c.cantidad_teorica);
    }
  }

})();

console.log("Conversión finalizada con éxito.");
