import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-ioredis-yet';
import { RedisService } from './redis.service';
import redisConfig from '../../config/redis.config';

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    CacheModule.registerAsync({
      useFactory: async () => ({
        store: await redisStore({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
          password: process.env.REDIS_PASSWORD || undefined,
          db: parseInt(process.env.REDIS_DB || '0', 10),
          ttl: 300, // Default TTL: 5 minutes (300 seconds)
        }),
      }),
    }),
  ],
  providers: [RedisService],
  exports: [RedisService, CacheModule],
})
export class RedisModule {}