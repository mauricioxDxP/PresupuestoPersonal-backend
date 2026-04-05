"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    logger.log('🔍 DATABASE_URL: ' + process.env.DATABASE_URL);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
    }));
    app.enableCors();
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT') || 3001;
    await app.listen(port);
    logger.log(`✅ Backend running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map