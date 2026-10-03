import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LoyaltyTransactionDocument = LoyaltyTransaction & Document;

@Schema({ timestamps: true })
export class LoyaltyTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, enum: ['EARN', 'REDEEM', 'CLAIM_CODE'] })
  type: string;

  @Prop({ required: true })
  points: number; // Positive for EARN/CLAIM, negative for REDEEM

  @Prop({ required: true })
  balanceAfter: number;

  @Prop({ required: true })
  description: string;

  @Prop({ default: '' })
  referenceId: string; // OrderCode or VoucherCode
}

export const LoyaltyTransactionSchema = SchemaFactory.createForClass(LoyaltyTransaction);
LoyaltyTransactionSchema.index({ userId: 1 });
