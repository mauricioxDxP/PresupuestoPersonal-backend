/**
 * Script para poblar casaId en todos los registros existentes
 * Uso: node scripts/populate-casaid.js
 * 
 * Busca o crea una casa "default" y asigna todos los registros sin casaId a esa casa.
 */

require('dotenv/config');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

async function populate() {
  console.log('🔄 Poblando casaId en datos existentes...\n');
  
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    // 1. Obtener la primer casa o crear una default
    let casa = await prisma.casa.findFirst();
    
    if (!casa) {
      casa = await prisma.casa.create({
        data: { nombre: 'Casa Principal' }
      });
      console.log('✅ Casa creada:', casa.nombre);
    } else {
      console.log('📍 Usando casa existente:', casa.nombre);
    }

    const casaId = casa.id;
    console.log('   Casa ID:', casaId, '\n');

    // 2. Verificar estado actual antes de actualizar
    console.log('📊 Estado antes de actualizar:');
    
    const [catsCount, motsCount, transCount, archsCount] = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Categoria" WHERE "casaId" IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Motivo" WHERE "casaId" IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transaccion" WHERE "casaId" IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Archivo" WHERE "casaId" IS NULL`,
    ]);
    
    console.log(`   Categorías sin casaId: ${catsCount[0].count}`);
    console.log(`   Motivos sin casaId: ${motsCount[0].count}`);
    console.log(`   Transacciones sin casaId: ${transCount[0].count}`);
    console.log(`   Archivos sin casaId: ${archsCount[0].count}\n`);

    if (catsCount[0].count === 0 && motsCount[0].count === 0 && 
        transCount[0].count === 0 && archsCount[0].count === 0) {
      console.log('✅ Todos los datos ya tienen casaId!\n');
      return;
    }

    // 3. Actualizar Categorias
    if (catsCount[0].count > 0) {
      await prisma.$executeRaw`
        UPDATE "Categoria" SET "casaId" = ${casaId} WHERE "casaId" IS NULL
      `;
      console.log('✅ Categorías actualizadas');
    }

    // 4. Actualizar Motivos
    if (motsCount[0].count > 0) {
      await prisma.$executeRaw`
        UPDATE "Motivo" SET "casaId" = ${casaId} WHERE "casaId" IS NULL
      `;
      console.log('✅ Motivos actualizados');
    }

    // 5. Actualizar Transacciones
    if (transCount[0].count > 0) {
      await prisma.$executeRaw`
        UPDATE "Transaccion" SET "casaId" = ${casaId} WHERE "casaId" IS NULL
      `;
      console.log('✅ Transacciones actualizadas');
    }

    // 6. Actualizar Archivos
    if (archsCount[0].count > 0) {
      await prisma.$executeRaw`
        UPDATE "Archivo" SET "casaId" = ${casaId} WHERE "casaId" IS NULL
      `;
      console.log('✅ Archivos actualizados');
    }

    // 7. Verificar resultado
    console.log('\n📊 Estado después de actualizar:');
    
    const [catsAfter, motsAfter, transAfter, archsAfter] = await Promise.all([
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Categoria" WHERE "casaId" IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Motivo" WHERE "casaId" IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transaccion" WHERE "casaId" IS NULL`,
      prisma.$queryRaw`SELECT COUNT(*) as count FROM "Archivo" WHERE "casaId" IS NULL`,
    ]);
    
    console.log(`   Categorías sin casaId: ${catsAfter[0].count}`);
    console.log(`   Motivos sin casaId: ${motsAfter[0].count}`);
    console.log(`   Transacciones sin casaId: ${transAfter[0].count}`);
    console.log(`   Archivos sin casaId: ${archsAfter[0].count}\n`);

    console.log('===========================================');
    console.log('✅ Datos poblados. Ahora ejecutá:');
    console.log('   npx prisma db push --accept-data-loss');
    console.log('   para agregar las FK constraints.\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populate().catch(console.error);
