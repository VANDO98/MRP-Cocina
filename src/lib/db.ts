import Database from 'better-sqlite3';
import path from 'path';

// En Next.js App Router (servidor), __dirname no siempre está disponible igual que en node.
// process.cwd() apunta a la raíz del proyecto web-app.
const dbPath = path.resolve(process.cwd(), 'production.db');

export const db = new Database(dbPath);

// Asegurar que la columna raciones_producidas exista en Programa_Detalle
try {
  db.prepare('ALTER TABLE Programa_Detalle ADD COLUMN raciones_producidas INTEGER').run();
} catch (e) {
  // Silenciar si la columna ya existe
}

// Inicializar valores nulos existentes a 0
try {
  db.prepare('UPDATE Programa_Detalle SET raciones_producidas = 0 WHERE raciones_producidas IS NULL').run();
  db.prepare('UPDATE Despacho_Consolidado SET cantidad_real_entregada = 0 WHERE cantidad_real_entregada IS NULL').run();
} catch (e) {
  // Silenciar
}
