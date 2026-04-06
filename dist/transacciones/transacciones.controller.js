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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransaccionesController = void 0;
const common_1 = require("@nestjs/common");
const transacciones_service_1 = require("./transacciones.service");
const create_transaccion_dto_1 = require("./dto/create-transaccion.dto");
const update_transaccion_dto_1 = require("./dto/update-transaccion.dto");
let TransaccionesController = class TransaccionesController {
    constructor(transaccionesService) {
        this.transaccionesService = transaccionesService;
    }
    create(createTransaccionDto) {
        return this.transaccionesService.create(createTransaccionDto);
    }
    findAll(fechaInicio, fechaFin, categoriaId, motivoId, page, limit) {
        return this.transaccionesService.findAll({ fechaInicio, fechaFin, categoriaId, motivoId }, { page: page ? parseInt(page, 10) : undefined, limit: limit ? parseInt(limit, 10) : undefined });
    }
    getReportes() {
        return this.transaccionesService.getReportes();
    }
    getReporteMensual(anio, mes) {
        return this.transaccionesService.getReporteMensual(parseInt(anio), parseInt(mes));
    }
    findOne(id) {
        return this.transaccionesService.findOne(id);
    }
    update(id, updateTransaccionDto) {
        return this.transaccionesService.update(id, updateTransaccionDto);
    }
    remove(id) {
        return this.transaccionesService.remove(id);
    }
};
exports.TransaccionesController = TransaccionesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_transaccion_dto_1.CreateTransaccionDto]),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('fechaInicio')),
    __param(1, (0, common_1.Query)('fechaFin')),
    __param(2, (0, common_1.Query)('categoriaId')),
    __param(3, (0, common_1.Query)('motivoId')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('reportes'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "getReportes", null);
__decorate([
    (0, common_1.Get)('reporte-mensual'),
    __param(0, (0, common_1.Query)('anio')),
    __param(1, (0, common_1.Query)('mes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "getReporteMensual", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_transaccion_dto_1.UpdateTransaccionDto]),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TransaccionesController.prototype, "remove", null);
exports.TransaccionesController = TransaccionesController = __decorate([
    (0, common_1.Controller)('api/transacciones'),
    __metadata("design:paramtypes", [transacciones_service_1.TransaccionesService])
], TransaccionesController);
//# sourceMappingURL=transacciones.controller.js.map