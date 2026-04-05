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
var ArchivosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArchivosService = void 0;
const common_1 = require("@nestjs/common");
const supabase_js_1 = require("@supabase/supabase-js");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
let ArchivosService = ArchivosService_1 = class ArchivosService {
    constructor() {
        this.logger = new common_1.Logger(ArchivosService_1.name);
        const connectionString = process.env.DATABASE_URL || '';
        this.prisma = new client_1.PrismaClient({ adapter: new adapter_pg_1.PrismaPg({ connectionString }) });
        this.logger.log('ArchivosService created its own PrismaClient');
        this.initSupabase();
    }
    initSupabase() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;
        if (supabaseUrl && supabaseKey) {
            this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
            this.logger.log('✅ Supabase client initialized');
        }
        else {
            this.logger.warn('⚠️ Supabase no configurado - uploads deshabilitados');
        }
    }
    async upload(file, transaccionId) {
        if (!this.supabase) {
            throw new Error('Supabase no configurado');
        }
        const fileName = `${Date.now()}-${file.originalname}`;
        const bucket = 'archivos';
        const { data, error } = await this.supabase.storage.from(bucket).upload(fileName, file.buffer, {
            contentType: file.mimetype,
        });
        if (error) {
            throw new Error(`Error al subir archivo: ${error.message}`);
        }
        const { data: urlData } = await this.supabase.storage.from(bucket).getPublicUrl(fileName);
        let tipo = 'otro';
        if (file.mimetype.startsWith('image/')) {
            tipo = 'imagen';
        }
        else if (file.mimetype === 'application/pdf') {
            tipo = 'pdf';
        }
        return this.prisma.archivo.create({
            data: {
                tipo,
                nombre: file.originalname,
                url: urlData.publicUrl,
                transaccionId,
            },
        });
    }
    async findAll(transaccionId) {
        const where = { eliminado: false };
        if (transaccionId) {
            where.transaccionId = transaccionId;
        }
        return this.prisma.archivo.findMany({
            where,
            include: { transaccion: true },
        });
    }
    async findOne(id) {
        const archivo = await this.prisma.archivo.findUnique({
            where: { id },
            include: { transaccion: true },
        });
        if (!archivo || archivo.eliminado) {
            throw new common_1.NotFoundException(`Archivo ${id} no encontrado`);
        }
        return archivo;
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.archivo.update({
            where: { id },
            data: { eliminado: true },
        });
    }
};
exports.ArchivosService = ArchivosService;
exports.ArchivosService = ArchivosService = ArchivosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], ArchivosService);
//# sourceMappingURL=archivos.service.js.map