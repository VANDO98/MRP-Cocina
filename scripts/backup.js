/**
 * SCRIPT DE BACKUP — MRP Cocina
 * Genera un volcado SQL de la base de datos PostgreSQL (Neon)
 * y lo guarda como archivo .sql en la carpeta /backups/
 *
 * USO:
 *   node scripts/backup.js
 *
 * El archivo resultante puedes copiarlo a tu Google Drive, USB o donde quieras.
 */

const fs   = require('fs');
const path = require('path');

// ── Cargar .env.local manualmente (sin dotenv) ──────────────────────────────
const envPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ ERROR: DATABASE_URL no encontrado en .env.local');
  process.exit(1);
}

const { Client } = require('pg');

async function backup() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Conectado a la base de datos.');

  const tablas = [
    'Categoria_Insumo',
    'Categoria_Receta',
    'Unidad_Medida',
    'Turno',
    'Insumo',
    'Receta',
    'Receta_Detalle',
    'Programa_Produccion',
    'Programa_Detalle',
    'Despacho_Consolidado',
  ];

  const fecha   = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 16);
  const outDir  = path.resolve(__dirname, '../backups');
  const outFile = path.join(outDir, `backup_${fecha}.sql`);

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  const lineas = [];
  lineas.push(`-- ================================================`);
  lineas.push(`-- BACKUP MRP COCINA — ${new Date().toLocaleString('es-PE')}`);
  lineas.push(`-- ================================================`);
  lineas.push('');
  lineas.push('BEGIN;');
  lineas.push('');

  for (const tabla of tablas) {
    console.log(`  → Exportando ${tabla}...`);
    const res = await client.query(`SELECT * FROM ${tabla} ORDER BY 1`);

    if (res.rows.length === 0) {
      lineas.push(`-- Tabla ${tabla}: sin registros`);
      lineas.push('');
      continue;
    }

    const columnas = res.fields.map(f => `"${f.name}"`).join(', ');
    lineas.push(`-- Tabla: ${tabla} (${res.rows.length} filas)`);
    lineas.push(`DELETE FROM ${tabla};`);

    for (const row of res.rows) {
      const valores = res.fields.map(f => {
        const v = row[f.name];
        if (v === null || v === undefined) return 'NULL';
        if (typeof v === 'number' || typeof v === 'boolean') return String(v);
        // Escapar comillas simples
        return `'${String(v).replace(/'/g, "''")}'`;
      }).join(', ');
      lineas.push(`INSERT INTO ${tabla} (${columnas}) VALUES (${valores});`);
    }
    lineas.push('');
  }

  lineas.push('COMMIT;');
  lineas.push('');
  lineas.push(`-- FIN DEL BACKUP — ${res?.rows?.length ?? ''} tablas exportadas`);

  fs.writeFileSync(outFile, lineas.join('\n'), 'utf-8');
  await client.end();

  console.log('');
  console.log(`✅ BACKUP COMPLETADO`);
  console.log(`📁 Archivo: ${outFile}`);
  console.log(`   Cópialo a tu Google Drive, USB o donde prefieras.`);
  console.log('');
}

backup().catch(err => {
  console.error('❌ Error durante el backup:', err.message);
  process.exit(1);
});
