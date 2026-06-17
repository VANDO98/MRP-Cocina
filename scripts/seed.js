const Database = require('better-sqlite3');
const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');

const dbPath = path.resolve(__dirname, '../production.db');
const sqlPath = path.resolve(__dirname, '../init.sql');
const excelPath = path.resolve(__dirname, '../../Copia Bruno - Propuesta categorias antigravity.xlsx');

// Eliminar DB vieja si existe
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new Database(dbPath);

// Ejecutar init.sql
const initSql = fs.readFileSync(sqlPath, 'utf-8');
db.exec(initSql);

console.log("Base de datos inicializada.");

// Cargar Excel
const workbook = xlsx.readFile(excelPath);
const sheetLimpia = workbook.Sheets['BD_Limpia'];
const sheetInsumos = workbook.Sheets['Insumos'];

const dataLimpia = xlsx.utils.sheet_to_json(sheetLimpia);
const dataInsumos = xlsx.utils.sheet_to_json(sheetInsumos);

// Preparar diccionarios
const catInsumoMap = {};
const catRecetaMap = {};
const unidadMap = {};
const insumoMap = {};
const recetaMap = {};

// Insert statements
const insertCatInsumo = db.prepare('INSERT INTO Categoria_Insumo (nombre_categoria) VALUES (?)');
const insertCatReceta = db.prepare('INSERT INTO Categoria_Receta (nombre_categoria) VALUES (?)');
const insertUnidad = db.prepare('INSERT INTO Unidad_Medida (simbolo) VALUES (?)');
const insertInsumo = db.prepare('INSERT INTO Insumo (nombre_insumo, id_categoria_insumo, id_unidad) VALUES (?, ?, ?)');
const insertReceta = db.prepare('INSERT INTO Receta (nombre_receta, id_categoria_receta) VALUES (?, ?)');
const insertBOM = db.prepare('INSERT INTO Receta_Detalle (id_receta, id_insumo, cantidad_unitaria) VALUES (?, ?, ?)');

db.transaction(() => {
  // 1. Unidades de Medida y Categorías de Insumo (desde BD_Limpia e Insumos)
  dataLimpia.forEach(row => {
    // Unidades
    const unidad = (row['Unidad'] || 'UND').trim();
    if (!unidadMap[unidad]) {
      const res = insertUnidad.run(unidad);
      unidadMap[unidad] = res.lastInsertRowid;
    }
    
    // Categoria_Receta
    const catReceta = (row['Categoria'] || 'General').trim();
    if (!catRecetaMap[catReceta]) {
      const res = insertCatReceta.run(catReceta);
      catRecetaMap[catReceta] = res.lastInsertRowid;
    }
    
    // Categoria_Insumo desde BD_Limpia (Categoria_isnumos)
    const catInsumo = (row['Categoria_isnumos'] || row['Categoria_insumos'] || 'Sin Categoria').trim();
    if (!catInsumoMap[catInsumo]) {
      const res = insertCatInsumo.run(catInsumo);
      catInsumoMap[catInsumo] = res.lastInsertRowid;
    }
  });

  // 2. Insertar Insumos y Recetas únicas
  dataLimpia.forEach(row => {
    const recetaNombre = (row['Receta'] || '').trim();
    const catReceta = (row['Categoria'] || 'General').trim();
    
    if (recetaNombre && !recetaMap[recetaNombre]) {
      const res = insertReceta.run(recetaNombre, catRecetaMap[catReceta]);
      recetaMap[recetaNombre] = res.lastInsertRowid;
    }

    const insumoNombre = (row['Insumo'] || '').trim();
    const unidad = (row['Unidad'] || 'UND').trim();
    const catInsumo = (row['Categoria_isnumos'] || row['Categoria_insumos'] || 'Sin Categoria').trim();

    if (insumoNombre && !insumoMap[insumoNombre]) {
      const res = insertInsumo.run(insumoNombre, catInsumoMap[catInsumo], unidadMap[unidad]);
      insumoMap[insumoNombre] = res.lastInsertRowid;
    }
  });

  // 3. Insertar Receta_Detalle (BOM)
  dataLimpia.forEach(row => {
    const recetaNombre = (row['Receta'] || '').trim();
    const insumoNombre = (row['Insumo'] || '').trim();
    const cantidad = parseFloat(row['Cantidad'] || 0);

    if (recetaNombre && insumoNombre) {
      const idReceta = recetaMap[recetaNombre];
      const idInsumo = insumoMap[insumoNombre];
      
      try {
        insertBOM.run(idReceta, idInsumo, cantidad);
      } catch (err) {
        // Ignorar duplicados si la misma receta tiene el mismo insumo varias veces
      }
    }
  });
})();

console.log("Migración completada exitosamente.");
