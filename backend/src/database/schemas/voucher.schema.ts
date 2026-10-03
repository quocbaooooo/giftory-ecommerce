import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type VoucherDocument = Voucher & Document;

@Schema({ timestamps: true })
export class Voucher {
  @Prop({ required: true, unique: true, uppercase: true, trim: true })
  code: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ required: true, enum: ['FIXED', 'PERCENT'], default: 'FIXED' })
  discountType: string;

  @Prop({ required: true, min: 0 })
  discountValue: number;

  @Prop({ default: 0 })
  minOrderValue: number;

  @Prop({ default: 0 })
  maxDiscount: number;

  @Prop({ default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) })
  expiresAt: Date;

  @Prop({ default: 1000 })
  usageLimit: number;

  @Prop({ default: 0 })
  usedCount: number;

  @Prop({ default: 0 })
  requiredPoints: number; // Point cost to redeem via Loyalty Center

  @Prop({ default: true })
  isActive: boolean;
}

export const VoucherSchema = SchemaFactory.createForClass(Voucher);
VoucherSchema.index({ code: 1 });
