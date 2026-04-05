"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const categorias_module_1 = require("./categorias/categorias.module");
const motivos_module_1 = require("./motivos/motivos.module");
const transacciones_module_1 = require("./transacciones/transacciones.module");
const archivos_module_1 = require("./archivos/archivos.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            categorias_module_1.CategoriasModule,
            motivos_module_1.MotivosModule,
            transacciones_module_1.TransaccionesModule,
            archivos_module_1.ArchivosModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map