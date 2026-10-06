import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CustomDesignDocument = CustomDesign & Document;

@Schema({ timestamps: true })
export class CustomDesign {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ default: '' })
  sessionId: string;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ default: 'Bản thiết kế cá nhân hóa' })
  title: string;

  @Prop({ default: '' })
  frontMessage: string;

  @Prop({ default: '' })
  backMessage: string;

  @Prop({ default: 'Signature' })
  fontFamily: string; // Signature, Serif Elegant, Sans Minimal, Vintage Typewriter

  @Prop({ default: 'Gold' })
  engraveColor: string; // Gold, Silver, Dark Slate, Red

  @Prop({ default: 'Navy Blue' })
  selectedColor: string;

  @Prop({ default: 'none' })
  pattern: string;

  @Prop({ default: '' })
  uploadedImage: string;

  @Prop({ default: 1 })
  imageScale: number;

  @Prop({ type: Array, default: [] })
  stickers: Array<{
    id: string;
    icon: string;
    name: string;
    x: number;
    y: number;
    scale: number;
  }>;

  @Prop({ default: '' })
  previewImage: string;

  @Prop({ default: '' })
  frontPreviewImage: string;

  @Prop({ default: '' })
  backPreviewImage: string;

  @Prop({ default: 30000 })
  customFee: number;

  @Prop({ type: Object, default: {} })
  surcharges: Record<string, number>;

  @Prop({ default: false })
  isDraft: boolean;
}

export const CustomDesignSchema = SchemaFactory.createForClass(CustomDesign);
CustomDesignSchema.index({ userId: 1 });
CustomDesignSchema.index({ sessionId: 1 });
