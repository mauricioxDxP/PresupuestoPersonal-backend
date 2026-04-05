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
var CategoriasService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoriasService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
let CategoriasService = CategoriasService_1 = class CategoriasService {
    constructor() {
        this.logger = new common_1.Logger(CategoriasService_1.name);
        const connectionString = process.env.DATABASE_URL || '';
        this.prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg({ connectionString }) });
        this.logger.log('CategoriasService created its own PrismaClient');
    }
    async create(createCategoriaDto) {
        try {
            return await this.prisma.categoria.create({
                data: createCategoriaDto,
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error creating categoria: ' + message);
            throw new common_1.InternalServerErrorException('Error al crear categoría');
        }
    }
    async findAll(tipo) {
        this.logger.log('findAll called');
        try {
            const where = { eliminado: false };
            if (tipo) {
                where.tipo = tipo;
            }
            this.logger.log('Query where: ' + JSON.stringify(where));
            const result = await this.prisma.categoria.findMany({
                where,
                orderBy: { nombre: 'asc' },
            });
            this.logger.log('Found ' + result.length + ' categorias');
            return result;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Error desconocido';
            this.logger.error('Error in findAll: ' + message);
            this.logger.error('Stack: ' + (error instanceof Error ? error.stack : ''));
            return [];
        }
    }
    async findOne(id) {
        const categoria = await this.prisma.categoria.findUnique({
            where: { id },
            include: { motivos: true },
        });
        if (!categoria || categoria.eliminado) {
            throw new common_1.NotFoundException(`Categoría ${id} no encontrada`);
        }
        return categoria;
    }
    async update(id, updateCategoriaDto) {
        await this.findOne(id);
        try {
            return await this.prisma.categoria.update({
                where: { id },
                data: updateCategoriaDto,
            });
        }
        catch (_error) {
            throw new common_1.InternalServerErrorException('Error al actualizar categoría');
        }
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.categoria.update({
            where: { id },
            data: { eliminado: true },
        });
    }
};
exports.CategoriasService = CategoriasService;
exports.CategoriasService = CategoriasService = CategoriasService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], CategoriasService);
//# sourceMappingURL=categorias.service.js.map