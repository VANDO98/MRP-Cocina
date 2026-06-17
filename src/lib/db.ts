import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("❌ ERROR: La variable de entorno DATABASE_URL no está configurada. Verifica tu archivo .env.local.");
}

export const db = postgres(connectionString, {
  ssl: 'require',
  max: 10 // Pool de conexiones máximo, ideal para Neon (plan gratuito) y Vercel
});
