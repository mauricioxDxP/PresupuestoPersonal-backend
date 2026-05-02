/**
 * Script para crear el enum Rol en PostgreSQL
 * Uso: node scripts/create-enum.js
 */

require('dotenv').config({ path: './.env' });
const { Client } = require('pg');

async function main() {
  console.log('\n🔧 Creando enum Rol en PostgreSQL...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();

  try {
    // Crear el tipo enum si no existe
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Rol') THEN
          CREATE TYPE "Rol" AS ENUM ('ADMIN', 'MAESTRO_CASA', 'USUARIO');
          RAISE NOTICE 'Enum Rol creado exitosamente';
        ELSE
          RAISE NOTICE 'Enum Rol ya existe';
        END IF;
      END $$;
    `);
    console.log('✓ Enum Rol creado o ya existente');
  } catch (err) {
    console.error('✗ Error:', err.message);
  }

  await client.end();
  console.log('\n✅ Listo\n');
}

main();