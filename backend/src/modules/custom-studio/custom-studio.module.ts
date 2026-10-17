import { Module } from '@nestjs/common';
import { CustomStudioService } from './custom-studio.service';
import { CustomStudioController } from './custom-studio.controller';
import { OpenClipartController } from './openclipart.controller';
import { OpenClipartService } from './openclipart.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [CustomStudioController, OpenClipartController],
  providers: [CustomStudioService, OpenClipartService],
  exports: [CustomStudioService],
})
export class CustomStudioModule {}
