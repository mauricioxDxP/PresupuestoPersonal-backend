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
var MotivosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivosService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
let MotivosService = MotivosService_1 = class MotivosService {
    constructor() {
        this.logger = new common_1.Logger(MotivosService_1.name);
        const connectionString = process.env.DATABASE_URL || '';
        this.prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg({ connectionString }) });
        this.logger.log('MotivosService created its own PrismaClient');
    }
    async create(createMotivoDto) {
        try {
            return await this.prisma.motivo.create({
                data: createMotivoDto,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error creating motivo: ' + message);
            throw new common_1.InternalServerErrorException('Error al crear motivo');
        }
    }
    async findAll(categoriaId) {
        const where = { eliminado: false };
        if (categoriaId) {
            where.categoriaId = categoriaId;
        }
        return this.prisma.motivo.findMany({
            where,
            include: { categoria: true },
            orderBy: { orden: 'asc' },
        });
    }
    async findOne(id) {
        const motivo = await this.prisma.motivo.findUnique({
            where: { id },
            include: { categoria: true },
        });
        if (!motivo || motivo.eliminado) {
            throw new common_1.NotFoundException(`Motivo ${id} no encontrado`);
        }
        return motivo;
    }
    async update(id, updateMotivoDto) {
        await this.findOne(id);
        try {
            return await this.prisma.motivo.update({
                where: { id },
                data: updateMotivoDto,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error updating motivo: ' + message);
            throw new common_1.InternalServerErrorException('Error al actualizar motivo');
        }
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.motivo.update({
            where: { id },
            data: { eliminado: true },
        });
    }
    async reorder(motivos) {
        const updates = motivos.map((m) => this.prisma.motivo.update({
            where: { id: m.id },
            data: { orden: m.orden },
        }));
        try {
            return await this.prisma.$transaction(updates);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error reordering motivos: ' + message);
            throw new common_1.InternalServerErrorException('Error al reordenar motivos');
        }
    }
};
exports.MotivosService = MotivosService;
exports.MotivosService = MotivosService = MotivosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MotivosService);
//# sourceMappingURL=motivos.service.js.map