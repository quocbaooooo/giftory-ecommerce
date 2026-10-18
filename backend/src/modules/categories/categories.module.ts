import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoryDisplaySettings, CategoryDisplaySettingsSchema } from '../../database/schemas/category-display-settings.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: CategoryDisplaySettings.name, schema: CategoryDisplaySettingsSchema }])],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
