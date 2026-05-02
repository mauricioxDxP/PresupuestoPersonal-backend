/**
 * Script para generar hashes de password y crear usuarios seed
 * Usage: node scripts/seed-users.js
 */

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL || process.env.DATABASE_URL_LOCAL }),
});

async function main() {
  console.log('🔑 Generando hashes de passwords...\n');

  // Constraaseñas de ejemplo (CAMBIAR EN PRODUCCIÓN)
  const adminPassword = 'Admin123!';
  const maestroPassword = 'Maestro123!';

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const maestroHash = await bcrypt.hash(maestroPassword, 10);

  console.log('Hash para Admin:', adminHash);
  console.log('Hash para Maestro:', maestroHash);
  console.log('\n----------------------------------------\n');

  // 1. Crear casa por defecto
  console.log('🏠 Creando casa por defecto...');
  let casa = await prisma.casa.upsert({
    where: { nombre: 'Mi Casa' },
    update: {},
    create: { nombre: 'Mi Casa' },
  });
  console.log('   Casa creada:', casa.id, '-', casa.nombre);

  // 2. Crear ADMIN global
  console.log('\n👤 Creando usuario ADMIN...');
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@finance.local' },
    update: {},
    create: {
      email: 'admin@finance.local',
      passwordHash: adminHash,
      nombre: 'Administrador',
      rol: 'ADMIN',
      casaId: null, // ADMIN no pertenece a casa
    },
  });
  console.log('   Admin creado:', admin.id, '-', admin.email);
  console.log('   Password:', adminPassword);

  // 3. Crear MAESTRO_CASA
  console.log('\n👤 Creando usuario Maestro de Casa...');
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
  console.log('   Maestro creado:', maestro.id, '-', maestro.email);
  console.log('   Password:', maestroPassword);
  console.log('   Casa:', casa.nombre);

  // 4. Crear algunos permisos de ejemplo para el maestro
  console.log('\n🔐 Creando permisos de ejemplo...');
  const categorias = await prisma.categoria.findMany({ where: { casaId: casa.id } });
  
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
    console.log('   Permiso en categoría:', cat.nombre);
  }

  console.log('\n✅ Seed completado!');
  console.log('\n📝 Credenciales:');
  console.log('   ADMIN:    admin@finance.local /', adminPassword);
  console.log('   MAESTRO:  maestro@finance.local /', maestroPassword);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });