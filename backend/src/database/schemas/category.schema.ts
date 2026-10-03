import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ default: 'category' })
  icon: string;

  @Prop({ default: '🎁' })
  emoji: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  imageUrl: string;

  @Prop({ default: 0 })
  order: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
CategorySchema.index({ slug: 1 });
