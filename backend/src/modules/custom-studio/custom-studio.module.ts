import { Module } from '@nestjs/common';
import { CustomStudioService } from './custom-studio.service';
import { CustomStudioController } from './custom-studio.controller';

@Module({
  controllers: [CustomStudioController],
  providers: [CustomStudioService],
  exports: [CustomStudioService],
})
export class CustomStudioModule {}
