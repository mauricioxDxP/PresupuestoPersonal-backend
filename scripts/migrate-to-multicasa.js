/**
 * Script de migración: Multi-Casa Support (Node.js)
 * Ejecutar con: node scripts/migrate-to-multicasa.js
 * 
 * Crea la tabla UsuarioCasa si no existe
 * y migra los datos de casaId existentes a la nueva estructura.
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL || '';

async function migrate() {
  console.log('🔄 Iniciando migración Multi-Casa...\n');
  
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    // 1. Crear tabla UsuarioCasa si no existe
    console.log('1. Creando tabla UsuarioCasa...');
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "UsuarioCasa" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "usuarioId" UUID NOT NULL,
        "casaId" UUID NOT NULL,
        "rol" "Rol" NOT NULL DEFAULT 'USUARIO',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UsuarioCasa_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
        CONSTRAINT "UsuarioCasa_casaId_fkey" FOREIGN KEY ("casaId") REFERENCES "Casa"("id") ON DELETE CASCADE,
        CONSTRAINT "UsuarioCasa_usuarioId_casaId_unique" UNIQUE ("usuarioId", "casaId")
      )
    `;
    console.log('   ✅ Tabla creada o ya existente\n');

    // 2. Crear índices si no existen
    console.log('2. Creando índices...');
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UsuarioCasa_usuarioId_idx" ON "UsuarioCasa"("usuarioId")
    `;
    await prisma.$executeRaw`
      CREATE INDEX IF NOT EXISTS "UsuarioCasa_casaId_idx" ON "UsuarioCasa"("casaId")
    `;
    console.log('   ✅ Índices creados\n');

    // 3. Contar usuarios existentes
    console.log('3. Contando usuarios...');
    const totalUsers = await prisma.usuario.count({
      where: { eliminado: false }
    });
    console.log(`   Total usuarios: ${totalUsers}\n`);

    // 4. Migrar usuarios con casaId
    console.log('4. Migrando usuarios a UsuarioCasa...');
    
    // Obtener todos los usuarios con casaId
    const usuariosACasa = await prisma.usuario.findMany({
      where: {
        eliminado: false,
        casaId: { not: null }
      },
      select: {
        id: true,
        email: true,
        rol: true,
        casaId: true,
        createdAt: true
      }
    });
    console.log(`   Usuarios con casaId: ${usuariosACasa.length}\n`);

    let migrated = 0;
    let skipped = 0;

    for (const usuario of usuariosACasa) {
      // Verificar si ya existe el registro
      const existing = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM "UsuarioCasa" 
          WHERE "usuarioId" = ${usuario.id} AND "casaId" = ${usuario.casaId}
        ) as exists
      `;

      if (existing[0].exists) {
        skipped++;
        continue;
      }

      // Crear el registro en UsuarioCasa
      await prisma.$executeRaw`
        INSERT INTO "UsuarioCasa" ("id", "usuarioId", "casaId", "rol", "createdAt")
        VALUES (gen_random_uuid(), ${usuario.id}, ${usuario.casaId}, ${usuario.rol}, ${usuario.createdAt})
      `;
      
      console.log(`   ✅ ${usuario.email} (${usuario.rol})`);
      migrated++;
    }

    console.log('\n5. Verificando resultado...');
    
    // Verificar totales
    const migratedCount = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "usuarioId") as count FROM "UsuarioCasa"
    `;
    console.log(`   Usuarios en UsuarioCasa: ${migratedCount[0].count}`);
    console.log(`   Migrados este run: ${migrated}`);
    console.log(`   Ya existían: ${skipped}\n`);

    // 6. Verificar usuarios pendientes
    const pendingUsers = await prisma.$queryRaw`
      SELECT u."id", u."email", u."casaId"
      FROM "Usuario" u
      WHERE NOT EXISTS (
        SELECT 1 FROM "UsuarioCasa" uc 
        WHERE uc."usuarioId" = u."id"
      )
      AND u."eliminado" = false
      AND u."casaId" IS NOT NULL
      LIMIT 10
    `;

    if (pendingUsers.length > 0) {
      console.log('⚠️  Usuarios sin migrar:');
      pendingUsers.forEach(u => {
        console.log(`   - ${u.email}`);
      });
    } else {
      console.log('✅ Migración completada!\n');
    }

    console.log('===========================================');
    console.log('Ahora podés reiniciar el backend.\n');

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate().catch(console.error);
