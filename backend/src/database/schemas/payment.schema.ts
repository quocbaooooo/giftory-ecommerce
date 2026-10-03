import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../../common/enums/role.enum';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  orderId: Types.ObjectId;

  @Prop({ required: true, uppercase: true })
  orderCode: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, enum: ['DEPOSIT_50', 'FULL_PAYMENT', 'COD_SETTLEMENT'] })
  paymentType: string;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  paymentMethod: PaymentMethod;

  @Prop({ default: () => `TXN-${Date.now()}` })
  transactionCode: string;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
  status: PaymentStatus;

  @Prop({ type: Object, default: {} })
  gatewayResponse: any;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ orderId: 1 });
PaymentSchema.index({ orderCode: 1 });
