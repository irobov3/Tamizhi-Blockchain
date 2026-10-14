import { Module } from '@nestjs/common';
import { LiteratureController } from './literature.controller';
import { LiteratureService } from './literature.service';
import { StorageModule } from '../storage/storage.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [StorageModule, AuthModule],
  controllers: [LiteratureController],
  providers: [LiteratureService],
  exports: [LiteratureService],
})
export class LiteratureModule {}
