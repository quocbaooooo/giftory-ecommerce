import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type StudioAssetDocument = StudioAsset & Document;

@Schema({ timestamps: true })
export class StudioAsset {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  icon: string; // Clipart image URL

  @Prop({ required: true, enum: ['CLIPART'], default: 'CLIPART' })
  type: string;

  @Prop({ trim: true })
  imageUrl?: string;

  @Prop({ trim: true })
  thumbnailUrl?: string;

  @Prop({ type: [String], default: [] })
  tags?: string[];

  @Prop({ trim: true })
  sourceProvider?: string;

  @Prop({ trim: true })
  sourceId?: string;

  @Prop({ trim: true })
  sourceUrl?: string;

  @Prop({ trim: true })
  author?: string;

  @Prop({ trim: true })
  license?: string;

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
StudioAssetSchema.index({ sourceProvider: 1, sourceId: 1 }, {
  unique: true,
  partialFilterExpression: { sourceProvider: 'OPENCLIPART', sourceId: { $type: 'string' } },
});
