import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL || '';
    const adapter = new PrismaPg({ connectionString });
    super({ adapter });
    this.logger.log('🔌 PrismaService initialized with adapter');
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Prisma connected to database');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error('❌ Failed to connect to database: ' + message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
