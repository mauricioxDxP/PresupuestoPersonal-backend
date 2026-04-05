"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
async function main() {
    const connectionString = process.env.DATABASE_URL || '';
    const adapter = new adapter_pg_1.PrismaPg({ connectionString });
    const prisma = new client_1.PrismaClient({ adapter });
    try {
        const ingreso = await prisma.categoria.create({
            data: { nombre: 'Salario', tipo: 'ingreso' }
        });
        console.log('✅ Created ingreso categoria:', ingreso.id);
        const gasto = await prisma.categoria.create({
            data: { nombre: 'Alimentación', tipo: 'gasto' }
        });
        console.log('✅ Created gasto categoria:', gasto.id);
        const categorias = await prisma.categoria.findMany({
            where: { eliminado: false }
        });
        console.log('📋 Total categorias:', categorias.length);
        console.log('📋 Categorias:', JSON.stringify(categorias, null, 2));
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        console.error('💥 Error:', message);
    }
    finally {
        await prisma.$disconnect();
    }
}
main();
//# sourceMappingURL=test-prisma.js.map