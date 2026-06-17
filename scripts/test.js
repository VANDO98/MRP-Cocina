const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'Unidad_Medida'`.then(res => { console.log(res); process.exit(0); });
