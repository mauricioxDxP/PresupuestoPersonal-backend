/**
 * Script de migración y seed para Multi-Casa
 * Uso: node scripts/migrate-and-seed.js
 */

require('dotenv').config({ path: './.env' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function runSQL(client, sql) {
  console.log('   Ejecutando SQL...');
  await client.query(sql);
  console.log('   ✓ OK');
}

async function migrate() {
  console.log('\n📦 FASE 1: Migración de schema\n');
  console.log('   Conectando a PostgreSQL...');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });
  await client.connect();
  console.log('   ✓ Conectado\n');

  const migrations = [
    {
      name: 'Crear tabla Casa',
      sql: `
        CREATE TABLE IF NOT EXISTS "Casa" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "nombre" TEXT UNIQUE NOT NULL,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
      `,
    },
    {
      name: 'Crear tabla Usuario',
      sql: `
        CREATE TABLE IF NOT EXISTS "Usuario" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "email" TEXT UNIQUE NOT NULL,
          "passwordHash" TEXT,
          "googleId" TEXT UNIQUE,
          "nombre" TEXT NOT NULL,
          "rol" TEXT DEFAULT 'USUARIO',
          "casaId" UUID,
          "eliminado" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
        );
      `,
    },
    {
      name: 'Crear tabla UsuarioCategoriaPermiso',
      sql: `
        CREATE TABLE IF NOT EXISTS "UsuarioCategoriaPermiso" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "usuarioId" UUID NOT NULL,
          "categoriaId" TEXT NOT NULL,
          "puedeCrear" BOOLEAN DEFAULT false,
          "puedeEditar" BOOLEAN DEFAULT false,
          "puedeEliminar" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("usuarioId", "categoriaId")
        );
      `,
    },
    {
      name: 'Crear tabla UsuarioMotivoPermiso',
      sql: `
        CREATE TABLE IF NOT EXISTS "UsuarioMotivoPermiso" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "usuarioId" UUID NOT NULL,
          "motivoId" TEXT NOT NULL,
          "puedeCrear" BOOLEAN DEFAULT false,
          "puedeEditar" BOOLEAN DEFAULT false,
          "puedeEliminar" BOOLEAN DEFAULT false,
          "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
          UNIQUE("usuarioId", "motivoId")
        );
      `,
    },
    {
      name: 'Agregar columna casaId a Categoria',
      sql: `ALTER TABLE "Categoria" ADD COLUMN IF NOT EXISTS "casaId" UUID;`,
    },
    {
      name: 'Agregar columna casaId a Motivo',
      sql: `ALTER TABLE "Motivo" ADD COLUMN IF NOT EXISTS "casaId" UUID;`,
    },
    {
      name: 'Agregar columna casaId a Transaccion',
      sql: `ALTER TABLE "Transaccion" ADD COLUMN IF NOT EXISTS "casaId" UUID;`,
    },
    {
      name: 'Agregar columna casaId a Archivo',
      sql: `ALTER TABLE "Archivo" ADD COLUMN IF NOT EXISTS "casaId" UUID;`,
    },
    {
      name: 'Crear índices',
      sql: `
        CREATE INDEX IF NOT EXISTS "Usuario_casaId_idx" ON "Usuario"("casaId");
        CREATE INDEX IF NOT EXISTS "Categoria_casaId_idx" ON "Categoria"("casaId");
        CREATE INDEX IF NOT EXISTS "Motivo_casaId_idx" ON "Motivo"("casaId");
        CREATE INDEX IF NOT EXISTS "Transaccion_casaId_idx" ON "Transaccion"("casaId");
        CREATE INDEX IF NOT EXISTS "Archivo_casaId_idx" ON "Archivo"("casaId");
      `,
    },
  ];

  for (const migration of migrations) {
    try {
      console.log(`   ${migration.name}...`);
      await client.query(migration.sql);
      console.log('   ✓ OK');
    } catch (err) {
      if (err.code === '42710' || err.code === '42P07') {
        // Index already exists or table already exists - not an error
        console.log('   ✓ Ya existe (saltado)');
      } else {
        console.error(`   ✗ Error: ${err.message}`);
      }
    }
  }

  await client.end();
  console.log('\n   ✅ Migración completada\n');
}

async function seed() {
  console.log('\n🌱 FASE 2: Seed de datos\n');
  console.log('   Conectando a PostgreSQL via Prisma...');

  const adminPassword = 'Admin123!';
  const maestroPassword = 'Maestro123!';

  try {
    // 1. Crear casa por defecto
    console.log('   Creando casa "Mi Casa"...');
    const casa = await prisma.casa.upsert({
      where: { nombre: 'Mi Casa' },
      update: {},
      create: { nombre: 'Mi Casa' },
    });
    console.log(`   ✓ Casa: ${casa.id}`);

    // 2. Generar hashes
    console.log('   Generando hashes de passwords...');
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const maestroHash = await bcrypt.hash(maestroPassword, 10);
    console.log('   ✓ Hashes generados');

    // 3. Crear ADMIN global
    console.log('   Creando ADMIN global...');
    const admin = await prisma.usuario.upsert({
      where: { email: 'admin@finance.local' },
      update: {},
      create: {
        email: 'admin@finance.local',
        passwordHash: adminHash,
        nombre: 'Administrador',
        rol: 'ADMIN',
        casaId: null,
      },
    });
    console.log(`   ✓ Admin: ${admin.email}`);

    // 4. Crear MAESTRO_CASA
    console.log('   Creando Maestro de Casa...');
    const maestro = await prisma.usuario.upsert({
      where: { email: 'maestro@finance.local' },
      update: {},
      create: {
        email: 'maestro@finance.local',
        passwordHash: maestroHash,
        nombre: 'Maestro de Casa',
        rol: 'MAESTRO_CASA',
        casaId: casa.id,
      },
    });
    console.log(`   ✓ Maestro: ${maestro.email}`);

    // 5. Crear permisos de ejemplo para maestro
    console.log('   Creando permisos de ejemplo...');
    const categorias = await prisma.categoria.findMany({ take: 3 });

    for (const cat of categorias) {
      await prisma.usuarioCategoriaPermiso.upsert({
        where: {
          usuarioId_categoriaId: {
            usuarioId: maestro.id,
            categoriaId: cat.id,
          },
        },
        update: {},
        create: {
          usuarioId: maestro.id,
          categoriaId: cat.id,
          puedeCrear: true,
          puedeEditar: true,
          puedeEliminar: false,
        },
      });
      console.log(`   ✓ Permiso en: ${cat.nombre}`);
    }

    console.log('\n   ✅ Seed completado\n');
    console.log('='.repeat(50));
    console.log('\n📝 CREDENCIALES:\n');
    console.log('   🔴 ADMIN GLOBAL:');
    console.log(`      Email:    admin@finance.local`);
    console.log(`      Password: ${adminPassword}`);
    console.log('\n   🟢 MAESTRO DE CASA:');
    console.log(`      Email:    maestro@finance.local`);
    console.log(`      Password: ${maestroPassword}`);
    console.log(`      Casa:     Mi Casa\n`);
    console.log('='.repeat(50));

  } catch (err) {
    console.error('\n   ✗ Error en seed:', err.message);
    throw err;
  }
}

async function main() {
  console.log('\n' + '='.repeat(50));
  console.log('🚀 Migración + Seed: Multi-Casa');
  console.log('='.repeat(50));

  try {
    await migrate();
    await seed();

    console.log('\n' + '='.repeat(50));
    console.log('✅ TODO COMPLETADO EXITOSAMENTE');
    console.log('='.repeat(50) + '\n');

  } catch (err) {
    console.error('\n❌ Error fatal:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();