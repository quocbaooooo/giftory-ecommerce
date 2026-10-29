import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MarketingCampaignDocument = MarketingCampaign & Document;

@Schema({ timestamps: true })
export class MarketingCampaign {
  @Prop({ required: true, trim: true, maxlength: 90 }) title: string;
  @Prop({ required: true, trim: true, maxlength: 60 }) eyebrow: string;
  @Prop({ required: true, trim: true, maxlength: 280 }) description: string;
  @Prop({ default: '' }) imageUrl: string;
  @Prop({ default: '' }) imageAlt: string;
  @Prop({ required: true, trim: true, maxlength: 45 }) primaryLabel: string;
  @Prop({ required: true, trim: true }) primaryLink: string;
  @Prop({ default: '' }) secondaryLabel: string;
  @Prop({ default: '' }) secondaryLink: string;
  @Prop({ default: 'card_giftcard' }) icon: string;
  @Prop({ default: 0 }) sortOrder: number;
  @Prop({ default: false }) isActive: boolean;
  @Prop({ default: null }) startsAt?: Date;
  @Prop({ default: null }) endsAt?: Date;
}

export const MarketingCampaignSchema = SchemaFactory.createForClass(MarketingCampaign);
MarketingCampaignSchema.index({ isActive: 1, sortOrder: 1, startsAt: 1, endsAt: 1 });
