import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type GiftBoxConfigDocument = GiftBoxConfig & Document;

@Schema({ timestamps: true, collection: 'gift_box_configs' })
export class GiftBoxConfig {
  @Prop({ required: true, unique: true, default: 'default' })
  key: string;

  @Prop({ type: [Object], required: true })
  boxes: any[];
}

export const GiftBoxConfigSchema = SchemaFactory.createForClass(GiftBoxConfig);
