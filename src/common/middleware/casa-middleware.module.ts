import { Module } from '@nestjs/common';
import { CasaIsolationService } from './casa-isolation.service';

@Module({
  providers: [CasaIsolationService],
  exports: [CasaIsolationService],
})
export class CasaMiddlewareModule {}

// Re-export for convenience
export { CasaIsolationService } from './casa-isolation.service';