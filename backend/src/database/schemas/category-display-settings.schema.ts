import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDisplaySettingsDocument = CategoryDisplaySettings & Document;

@Schema({ timestamps: true })
export class CategoryDisplaySettings {
  @Prop({ required: true, unique: true, default: 'storefront' })
  key: string;

  @Prop({ required: true, default: '🎁', trim: true })
  allCategoriesIcon: string;
}

export const CategoryDisplaySettingsSchema = SchemaFactory.createForClass(CategoryDisplaySettings);
