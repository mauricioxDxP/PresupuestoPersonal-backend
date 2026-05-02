/**
 * Script para poblar casaId Y crear las FK constraints usando pg directamente
 * Uso: node scripts/populate-casaid-and-fk.js
 */

require('dotenv/config');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function populate() {
  console.log('🔄 Poblando casaId y creando FK constraints...\n');
  
  await client.connect();

  try {
    // 1. Obtener o crear casa default
    let casa = await client.query('SELECT * FROM "Casa" LIMIT 1');
    
    if (casa.rows.length === 0) {
      await client.query('INSERT INTO "Casa" (id, nombre) VALUES (gen_random_uuid(), $1)', ['Casa Principal']);
      casa = await client.query('SELECT * FROM "Casa" LIMIT 1');
      console.log('✅ Casa creada:', casa.rows[0].nombre);
    } else {
      console.log('📍 Usando casa:', casa.rows[0].nombre);
    }
    const casaId = casa.rows[0].id;

    // 2. Poblar casaId en todas las tablas
    console.log('\n📊 Poblando casaId...');

    const tables = ['Categoria', 'Motivo', 'Transaccion', 'Archivo'];
    
    for (const table of tables) {
      const result = await client.query(
        `UPDATE "${table}" SET "casaId" = $1 WHERE "casaId" IS NULL`,
        [casaId]
      );
      console.log(`   ✅ ${table}: ${result.rowCount} registros actualizados`);
    }

    // 3. Crear FK constraints
    console.log('\n🔗 Creando FK constraints...');

    const fks = [
      { name: 'Categoria_casaId_fkey', table: 'Categoria' },
      { name: 'Motivo_casaId_fkey', table: 'Motivo' },
      { name: 'Transaccion_casaId_fkey', table: 'Transaccion' },
      { name: 'Archivo_casaId_fkey', table: 'Archivo' },
    ];

    for (const fk of fks) {
      try {
        // Dropear si existe
        await client.query(
          `ALTER TABLE "${fk.table}" DROP CONSTRAINT IF EXISTS "${fk.name}"`
        );
        
        // Crear FK
        await client.query(
          `ALTER TABLE "${fk.table}" ADD CONSTRAINT "${fk.name}" FOREIGN KEY ("casaId") REFERENCES "Casa"("id")`
        );
        console.log(`   ✅ ${fk.table}.casaId -> Casa.id`);
      } catch (error) {
        console.log(`   ⚠️  ${fk.table}: ${error.message}`);
      }
    }

    // 4. Verificar
    console.log('\n📊 Verificando FK...');
    const fksResult = await client.query(`
      SELECT conname, conrelid::regclass AS table_name, confrelid::regclass AS references
      FROM pg_constraint
      WHERE conrelid IN ('Categoria', 'Motivo', 'Transaccion', 'Archivo')
      AND contype = 'f'
    `);
    
    console.log(`   FK encontradas: ${fksResult.rows.length}`);
    fksResult.rows.forEach(f => {
      console.log(`   - ${f.table_name} -> ${f.references}`);
    });

    console.log('\n===========================================');
    console.log('✅ Listo!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

populate().catch(console.error);
