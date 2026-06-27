import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log('Prisma service initialized (schema will be defined in Sprint 2)');
    // Connection will be established once we add entities and generate Prisma Client
  }

  async onModuleDestroy() {
    this.logger.log('Prisma service destroyed');
    // Disconnect will be added once Prisma Client is generated
  }

  // This service will extend PrismaClient once we add entities in Sprint 2
  // For now, it's a placeholder that satisfies the module structure
}
