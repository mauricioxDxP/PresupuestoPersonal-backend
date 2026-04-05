"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TransaccionesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransaccionesService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
let TransaccionesService = TransaccionesService_1 = class TransaccionesService {
    constructor() {
        this.logger = new common_1.Logger(TransaccionesService_1.name);
        const connectionString = process.env.DATABASE_URL || '';
        this.prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg({ connectionString }) });
        this.logger.log('TransaccionesService created its own PrismaClient');
    }
    async create(createTransaccionDto) {
        try {
            return await this.prisma.transaccion.create({
                data: {
                    ...createTransaccionDto,
                    fecha: new Date(createTransaccionDto.fecha),
                },
                include: {
                    motivo: true,
                    categoria: true,
                    archivos: true,
                },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error creating transaccion: ' + message);
            throw new common_1.InternalServerErrorException('Error al crear transacción');
        }
    }
    async findAll(filtros, pagination) {
        const where = this.buildWhereClause(filtros);
        const page = Math.max(1, pagination?.page ?? 1);
        const limit = Math.min(100, Math.max(1, pagination?.limit ?? 20));
        const skip = (page - 1) * limit;
        const [data, total] = await this.prisma.$transaction([
            this.prisma.transaccion.findMany({
                where,
                include: {
                    motivo: { include: { categoria: true } },
                    categoria: true,
                    archivos: true,
                },
                orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
                skip,
                take: limit,
            }),
            this.prisma.transaccion.count({ where }),
        ]);
        return {
            data,
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const transaccion = await this.prisma.transaccion.findUnique({
            where: { id },
            include: {
                motivo: { include: { categoria: true } },
                categoria: true,
                archivos: true,
            },
        });
        if (!transaccion || transaccion.eliminado) {
            throw new common_1.NotFoundException(`Transacción ${id} no encontrada`);
        }
        return transaccion;
    }
    async update(id, updateTransaccionDto) {
        await this.findOne(id);
        const data = { ...updateTransaccionDto };
        if (updateTransaccionDto.fecha) {
            data.fecha = new Date(updateTransaccionDto.fecha);
        }
        try {
            return await this.prisma.transaccion.update({
                where: { id },
                data,
                include: {
                    motivo: { include: { categoria: true } },
                    categoria: true,
                    archivos: true,
                },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error updating transaccion: ' + message);
            throw new common_1.InternalServerErrorException('Error al actualizar transacción');
        }
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.transaccion.update({
            where: { id },
            data: { eliminado: true },
        });
    }
    async getReportes() {
        const transacciones = await this.prisma.transaccion.findMany({
            where: { eliminado: false },
            include: {
                categoria: true,
            },
        });
        let totalIngresos = 0;
        let totalGastos = 0;
        const porCategoria = {};
        for (const t of transacciones) {
            const monto = Number(t.monto);
            if (t.categoria.tipo === 'ingreso') {
                totalIngresos += monto;
            }
            else {
                totalGastos += monto;
            }
            const catId = t.categoriaId;
            if (!porCategoria[catId]) {
                porCategoria[catId] = {
                    nombre: t.categoria.nombre,
                    tipo: t.categoria.tipo,
                    total: 0,
                };
            }
            porCategoria[catId].total += monto;
        }
        return {
            totalIngresos,
            totalGastos,
            balance: totalIngresos - totalGastos,
            porCategoria: Object.values(porCategoria),
        };
    }
    buildWhereClause(filtros) {
        const where = { eliminado: false };
        if (!filtros)
            return where;
        if (filtros.fechaInicio || filtros.fechaFin) {
            where.fecha = {};
            if (filtros.fechaInicio) {
                where.fecha.gte = new Date(filtros.fechaInicio);
            }
            if (filtros.fechaFin) {
                where.fecha.lte = new Date(filtros.fechaFin);
            }
        }
        if (filtros.categoriaId) {
            where.categoriaId = filtros.categoriaId;
        }
        if (filtros.motivoId) {
            where.motivoId = filtros.motivoId;
        }
        return where;
    }
};
exports.TransaccionesService = TransaccionesService;
exports.TransaccionesService = TransaccionesService = TransaccionesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TransaccionesService);
//# sourceMappingURL=transacciones.service.js.map