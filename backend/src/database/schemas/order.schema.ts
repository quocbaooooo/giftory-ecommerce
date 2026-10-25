import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentMode,
  PaymentMethod,
  OrderItemStatus
} from '../../common/enums/role.enum';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class GreetingCard {
  @Prop({ required: true, enum: ['BIRTHDAY', 'LOVE', 'THANK_YOU'] }) templateId: string;
  @Prop({ required: true }) templateName: string;
  @Prop({ required: true, maxlength: 80 }) heading: string;
  @Prop({ required: true, maxlength: 300 }) message: string;
}
export const GreetingCardSchema = SchemaFactory.createForClass(GreetingCard);

@Schema({ timestamps: true })
export class OrderItem {
  @Prop({ default: true })
  loyaltyEligible: boolean;

  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ required: true })
  productName: string;

  @Prop({ default: '' })
  productImage: string;

  @Prop({ default: 'Tiêu chuẩn' })
  variantName: string;

  @Prop()
  variantSku?: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true })
  unitPrice: number;

  @Prop({ default: false })
  isCustom: boolean;

  @Prop({ default: 'READY_MADE' })
  itemType: string; // 'READY_MADE' | 'CUSTOM'

  @Prop({ type: String, enum: OrderItemStatus, default: OrderItemStatus.PENDING })
  status: OrderItemStatus;

  @Prop({ type: Types.ObjectId, ref: 'CustomDesign', required: false })
  customDesignId?: Types.ObjectId;

  @Prop({ type: Object, default: null })
  customDetails?: any;

  @Prop({ default: 0 })
  depositRequired: number;

  @Prop({ default: '' })
  qcNote?: string;

  @Prop({ type: Array, default: [] })
  qcHistory?: Array<{
    result: string;
    note?: string;
    timestamp: Date;
    inspector?: string;
  }>;

  @Prop()
  preparedAt?: Date;

  @Prop({ default: '' })
  preparedBy?: string;
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

@Schema({ timestamps: true, optimisticConcurrency: true })
export class Order {
  @Prop({ default: '' }) voucherCode: string;
  @Prop({ default: '' }) voucherType: string;

  @Prop({ type: Types.ObjectId })
  bp06CaseId?: Types.ObjectId;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  careProcessedAt?: Date;

  @Prop({ default: false })
  refundPending: boolean;

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
      provinceCode: { type: String },
      provinceName: { type: String },
      wardCode: { type: String },
      wardName: { type: String },
      street: { type: String },
      note: { type: String, default: '' }
    },
    required: true
  })
  customerInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
    provinceCode?: string;
    provinceName?: string;
    wardCode?: string;
    wardName?: string;
    street?: string;
    note: string;
  };

  @Prop({ type: GreetingCardSchema, default: null })
  greetingCard?: GreetingCard;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[];

  @Prop({
    type: {
      itemsTotal: { type: Number, required: true },
      voucherDiscount: { type: Number, default: 0 },
      baseShippingFee: { type: Number, default: 0 },
      shippingDiscount: { type: Number, default: 0 },
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
    baseShippingFee?: number;
    shippingDiscount?: number;
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

  // BP-04 Fields
  @Prop({
    type: {
      minWaitHours: { type: Number, default: 12 },
      maxWaitHours: { type: Number, default: 48 },
      eligibleAt: { type: Date },
      deadlineAt: { type: Date },
      confirmedAt: { type: Date },
      confirmedBy: { type: String, default: '' }
    },
    default: () => ({
      minWaitHours: 12,
      maxWaitHours: 48,
      eligibleAt: new Date(Date.now() + 12 * 3600000),
      deadlineAt: new Date(Date.now() + 48 * 3600000),
      confirmedAt: null,
      confirmedBy: ''
    })
  })
  confirmationWait: {
    minWaitHours: number;
    maxWaitHours: number;
    eligibleAt: Date;
    deadlineAt: Date;
    confirmedAt?: Date;
    confirmedBy?: string;
  };

  @Prop({ default: false })
  isPackaged: boolean;

  @Prop()
  packagedAt?: Date;

  @Prop({ default: '' })
  packagedBy?: string;

  @Prop({
    type: {
      carrier: { type: String, default: 'Giao Hàng Tiết Kiệm (GHTK)' },
      trackingCode: { type: String, default: '' },
      dispatchedAt: { type: Date },
      deliveryAttempts: { type: Array, default: [] },
      deliveryResult: { type: String, default: 'PENDING' },
      failureReason: { type: String, default: '' },
      allowRetry: { type: Boolean, default: true },
      returnedAt: { type: Date },
      receivedReturnAt: { type: Date },
      transferredToBp06At: { type: Date },
      bp06Note: { type: String, default: '' }
    },
    default: () => ({
      carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
      trackingCode: '',
      deliveryAttempts: [],
      deliveryResult: 'PENDING',
      failureReason: '',
      allowRetry: true
    })
  })
  deliveryInfo: {
    carrier: string;
    trackingCode: string;
    dispatchedAt?: Date;
    deliveryAttempts: Array<{
      attemptNumber: number;
      timestamp: Date;
      success: boolean;
      failureReason?: string;
      allowRetry?: boolean;
      note?: string;
    }>;
    deliveryResult?: string;
    failureReason?: string;
    allowRetry?: boolean;
    returnedAt?: Date;
    receivedReturnAt?: Date;
    transferredToBp06At?: Date;
    bp06Note?: string;
  };
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ userId: 1 });
OrderSchema.index({ orderStatus: 1 });
OrderSchema.index({ paymentStatus: 1 });
OrderSchema.index({ fulfillmentStatus: 1 });
