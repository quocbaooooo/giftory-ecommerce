import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudioAssetDocument = StudioAsset & Document;

@Schema({ timestamps: true })
export class StudioAsset {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  icon: string; // Emoji, SVG icon name, or image URL

  @Prop({ required: true, enum: ['STICKER', 'PATTERN'], default: 'STICKER' })
  type: string;

  @Prop({ default: 'Phổ biến' })
  category: string;

  @Prop({ default: 0 })
  surcharge: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: 0 })
  order: number;
}

export const StudioAssetSchema = SchemaFactory.createForClass(StudioAsset);
StudioAssetSchema.index({ type: 1, isActive: 1 });
