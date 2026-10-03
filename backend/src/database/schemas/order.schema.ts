import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentMode,
  PaymentMethod
} from '../../common/enums/role.enum';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ default: '' })
  productImage: string;

  @Prop({ default: 'Tiêu chuẩn' })
  variantName: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ default: false })
  isCustom: boolean;

  @Prop({ type: Object, default: null })
  customDetails?: any;

  @Prop({ default: 0 })
  depositRequired: number;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema()
export class OrderTimelineEvent {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ default: true })
  completed: boolean;
}

export const OrderTimelineEventSchema = SchemaFactory.createForClass(OrderTimelineEvent);

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true, unique: true, uppercase: true })
  orderCode: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({
    type: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, default: '' },
      address: { type: String, required: true },
      note: { type: String, default: '' }
    },
    required: true
  })
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    note: string;
  };

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({
    type: {
      itemsTotal: { type: Number, required: true },
      voucherDiscount: { type: Number, default: 0 },
      shippingFee: { type: Number, default: 0 },
      giftWrapFee: { type: Number, default: 0 },
      totalAmount: { type: Number, required: true },
      depositAmount: { type: Number, default: 0 },
      remainingCodAmount: { type: Number, default: 0 }
    },
    required: true
  })
  pricing: {
    itemsTotal: number;
    voucherDiscount: number;
    shippingFee: number;
    giftWrapFee: number;
    totalAmount: number;
    depositAmount: number;
    remainingCodAmount: number;
  };

  @Prop({ type: String, enum: PaymentMode, default: PaymentMode.DEPOSIT_50 })
  paymentMode: PaymentMode;

  @Prop({ type: String, enum: PaymentMethod, default: PaymentMethod.COD })
  paymentMethod: PaymentMethod;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.UNPAID })
  paymentStatus: PaymentStatus;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  orderStatus: OrderStatus;

  @Prop({ type: String, enum: FulfillmentStatus, default: FulfillmentStatus.AWAITING_DEPOSIT })
  fulfillmentStatus: FulfillmentStatus;

  @Prop({ type: [OrderTimelineEventSchema], default: [] })
  timeline: OrderTimelineEvent[];

  @Prop({ default: '' })
  trackingCode: string; // Shipper tracking code e.g. GHTK-VN-882194

  @Prop({ default: 'Giao Hàng Nhanh Hỏa Tốc (2h - 48h)' })
  shippingCarrier: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ orderCode: 1 });
OrderSchema.index({ userId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ fulfillmentStatus: 1 });
