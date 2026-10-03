import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaymentMode } from '../../common/enums/role.enum';

export type CartDocument = Cart & Document;

@Schema()
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId: Types.ObjectId;

  @Prop({ default: 'Tiêu chuẩn' })
  variantName: string;

  @Prop({ required: true, min: 1, default: 1 })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: 'CustomDesign', required: false })
  customDesignId?: Types.ObjectId;

  @Prop({ type: Object, default: null })
  customDetails?: {
    message?: string;
    fontFamily?: string;
    engraveColor?: string;
    colorName?: string;
    previewImage?: string;
    customFee?: number;
  };

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: false })
  isCustom: boolean;

  @Prop({ default: 0 })
  depositRequired: number; // 50% for custom product
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  userId?: Types.ObjectId;

  @Prop({ default: '', index: true })
  sessionId: string;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[];

  @Prop({ type: String, enum: PaymentMode, default: PaymentMode.DEPOSIT_50 })
  paymentMode: PaymentMode;

  @Prop({ default: '' })
  voucherCode: string;

  @Prop({ default: 0 })
  voucherDiscount: number;

  @Prop({ default: true })
  includeGiftWrap: boolean; // Free satin luxury gift wrap
}

export const CartSchema = SchemaFactory.createForClass(Cart);
CartSchema.index({ userId: 1 });
CartSchema.index({ sessionId: 1 });
