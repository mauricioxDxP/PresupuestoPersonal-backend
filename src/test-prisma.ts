import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL || '';
  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    // Insert test categories
    const ingreso = await prisma.categoria.create({
      data: { nombre: 'Salario', tipo: 'ingreso' }
    });
    console.log('✅ Created ingreso categoria:', ingreso.id);

    const gasto = await prisma.categoria.create({
      data: { nombre: 'Alimentación', tipo: 'gasto' }
    });
    console.log('✅ Created gasto categoria:', gasto.id);

    // Query back
    const categorias = await prisma.categoria.findMany({
      where: { eliminado: false }
    });
    console.log('📋 Total categorias:', categorias.length);
    console.log('📋 Categorias:', JSON.stringify(categorias, null, 2));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('💥 Error:', message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
