const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../production.db');
const db = new Database(dbPath);

console.log("Iniciando migración...");

db.transaction(() => {
  // 1. Insertar Turnos
  const insertTurno = db.prepare('INSERT INTO Turno (nombre_turno) VALUES (?)');
  insertTurno.run("Desayuno - Almuerzo");
  insertTurno.run("Cena");
  console.log("Turnos insertados.");

  // 2. Recrear Despacho_Consolidado
  db.exec(`DROP TABLE IF EXISTS Despacho_Consolidado;`);
  
  db.exec(`
    CREATE TABLE Despacho_Consolidado (
        id_despacho INTEGER PRIMARY KEY AUTOINCREMENT,
        id_programa VARCHAR(50),
        id_insumo INTEGER,
        cantidad_teorica_calculada DECIMAL(14,7),
        cantidad_real_entregada DECIMAL(14,7),
        FOREIGN KEY (id_programa) REFERENCES Programa_Produccion(id_programa),
        FOREIGN KEY (id_insumo) REFERENCES Insumo(id_insumo)
    );
  `);
  console.log("Tabla Despacho_Consolidado actualizada con id_programa.");
})();

console.log("Migración completada.");
