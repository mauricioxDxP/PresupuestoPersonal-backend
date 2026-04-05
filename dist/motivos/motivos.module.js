"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MotivosModule = void 0;
const common_1 = require("@nestjs/common");
const motivos_service_1 = require("./motivos.service");
const motivos_controller_1 = require("./motivos.controller");
let MotivosModule = class MotivosModule {
};
exports.MotivosModule = MotivosModule;
exports.MotivosModule = MotivosModule = __decorate([
    (0, common_1.Module)({
        providers: [motivos_service_1.MotivosService],
        controllers: [motivos_controller_1.MotivosController],
        exports: [motivos_service_1.MotivosService],
    })
], MotivosModule);
//# sourceMappingURL=motivos.module.js.map