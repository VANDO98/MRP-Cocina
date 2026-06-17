const Database = require('better-sqlite3');
const path = require('path');
const postgres = require('postgres');

const fs = require('fs');

// Cargar variables de entorno manualmente si existe .env.local
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^\s*DATABASE_URL\s*=\s*["']?(.*?)["']?\s*$/);
    if (match) {
      process.env.DATABASE_URL = match[1];
      break;
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("❌ ERROR: La variable de entorno DATABASE_URL no está configurada en .env.local.");
  process.exit(1);
}

const dbPath = path.resolve(__dirname, '../production.db');
const sqliteDb = new Database(dbPath);

const sql = postgres(connectionString, { ssl: 'require' });

async function runMigration() {
  console.log("🚀 Iniciando migración de SQLite a PostgreSQL en la nube...");

  try {
    // 1. Crear tablas en PostgreSQL
    console.log("Creating tables in PostgreSQL...");
    await sql`
      CREATE TABLE IF NOT EXISTS Categoria_Insumo (
          id_categoria_insumo SERIAL PRIMARY KEY,
          nombre_categoria VARCHAR(100) NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Categoria_Receta (
          id_categoria_receta SERIAL PRIMARY KEY,
          nombre_categoria VARCHAR(100) NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Unidad_Medida (
          id_unidad SERIAL PRIMARY KEY,
          simbolo VARCHAR(15) NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Turno (
          id_turno SERIAL PRIMARY KEY,
          nombre_turno VARCHAR(50) NOT NULL
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Insumo (
          id_insumo SERIAL PRIMARY KEY,
          nombre_insumo VARCHAR(150) NOT NULL,
          id_categoria_insumo INTEGER REFERENCES Categoria_Insumo(id_categoria_insumo),
          id_unidad INTEGER REFERENCES Unidad_Medida(id_unidad)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Receta (
          id_receta SERIAL PRIMARY KEY,
          nombre_receta VARCHAR(150) NOT NULL,
          id_categoria_receta INTEGER REFERENCES Categoria_Receta(id_categoria_receta)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Receta_Detalle (
          id_receta INTEGER REFERENCES Receta(id_receta) ON DELETE CASCADE,
          id_insumo INTEGER REFERENCES Insumo(id_insumo),
          cantidad_unitaria NUMERIC(14,7) NOT NULL,
          PRIMARY KEY (id_receta, id_insumo)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Programa_Produccion (
          id_programa VARCHAR(50) PRIMARY KEY,
          fecha DATE NOT NULL,
          id_turno INTEGER REFERENCES Turno(id_turno)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Programa_Detalle (
          id_programa VARCHAR(50) REFERENCES Programa_Produccion(id_programa) ON DELETE CASCADE,
          id_receta INTEGER REFERENCES Receta(id_receta),
          raciones_programadas INTEGER NOT NULL,
          raciones_producidas INTEGER,
          PRIMARY KEY (id_programa, id_receta)
      );
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS Despacho_Consolidado (
          id_despacho SERIAL PRIMARY KEY,
          id_programa VARCHAR(50) REFERENCES Programa_Produccion(id_programa) ON DELETE CASCADE,
          id_insumo INTEGER REFERENCES Insumo(id_insumo),
          cantidad_teorica_calculada NUMERIC(14,7),
          cantidad_real_entregada NUMERIC(14,7)
      );
    `;
    console.log("✅ Tablas creadas en PostgreSQL.");

    // 2. Migrar datos tabla por tabla
    const tables = [
      { name: 'Categoria_Insumo', idCol: 'id_categoria_insumo' },
      { name: 'Categoria_Receta', idCol: 'id_categoria_receta' },
      { name: 'Unidad_Medida', idCol: 'id_unidad' },
      { name: 'Turno', idCol: 'id_turno' },
      { name: 'Insumo', idCol: 'id_insumo' },
      { name: 'Receta', idCol: 'id_receta' },
      { name: 'Receta_Detalle' },
      { name: 'Programa_Produccion' },
      { name: 'Programa_Detalle' },
      { name: 'Despacho_Consolidado', idCol: 'id_despacho' }
    ];

    for (const table of tables) {
      console.log(`Migrando tabla ${table.name}...`);
      
      // Limpiar tabla existente en Postgres (para evitar conflictos si se vuelve a correr)
      if (table.name === 'Receta_Detalle' || table.name === 'Programa_Detalle') {
        await sql.unsafe(`DELETE FROM ${table.name}`);
      } else {
        await sql.unsafe(`TRUNCATE TABLE ${table.name} RESTART IDENTITY CASCADE`);
      }

      const rows = sqliteDb.prepare(`SELECT * FROM ${table.name}`).all();
      if (rows.length === 0) {
        console.log(`Tabla ${table.name} está vacía. Saltando.`);
        continue;
      }

      // Preparar filas
      for (const row of rows) {
        // En Postgres, los campos Date deben ser strings en formato ISO o YYYY-MM-DD
        if (row.fecha) {
          row.fecha = new Date(row.fecha).toISOString().split('T')[0];
        }
      }

      // Inserción masiva ultra rápida
      await sql`
        INSERT INTO ${sql(table.name.toLowerCase())} ${sql(rows)}
      `;

      // Ajustar las secuencias si la tabla tiene clave primaria SERIAL autoincrementable
      if (table.idCol) {
        const maxValQuery = await sql.unsafe(`SELECT MAX(${table.idCol}) as max FROM ${table.name}`);
        const maxVal = maxValQuery[0]?.max;
        if (maxVal) {
          const seqName = `${table.name.toLowerCase()}_${table.idCol}_seq`;
          await sql.unsafe(`SELECT setval('${seqName}', ${maxVal})`);
        }
      }
      console.log(`✅ Tabla ${table.name} migrada con éxito (${rows.length} registros).`);
    }

    console.log("🎉 ¡Migración finalizada con éxito! Todos los datos locales están ahora en la nube.");
  } catch (err) {
    console.error("❌ ERROR durante la migración:", err);
  } finally {
    // Cerrar conexiones
    sqliteDb.close();
    await sql.end();
  }
}

runMigration();
