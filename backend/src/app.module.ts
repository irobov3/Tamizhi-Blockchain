import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { LiteratureModule } from './literature/literature.module';
import { MessagingModule } from './messaging/messaging.module';
import { TransactionModule } from './transaction/transaction.module';
import { StorageModule } from './storage/storage.module';
import { PrismaModule } from './config/prisma.module';
import { RedisModule } from './config/redis.module';

@Module({
  imports: [
    // Configuration - global so all modules can access env vars
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('RATE_LIMIT_TTL') || 60,
          limit: configService.get<number>('RATE_LIMIT_MAX') || 100,
        },
      ],
    }),

    // Infrastructure - global modules
    PrismaModule,
    RedisModule,

    // Feature modules
    AuthModule,
    WalletModule,
    LiteratureModule,
    MessagingModule,
    TransactionModule,
    StorageModule,
  ],
})
export class AppModule {}
