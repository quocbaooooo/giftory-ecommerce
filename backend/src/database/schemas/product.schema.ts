import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema()
export class ProductVariant {
  @Prop({ required: true })
  name: string;

  @Prop({ default: '#7C3AED' })
  colorHex: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 100 })
  stock: number;

  @Prop({ default: '' })
  sku: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'HIDDEN', 'OUT_OF_STOCK'] })
  status: string;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);

@Schema()
export class ProductSpec {
  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: string;
}

export const ProductSpecSchema = SchemaFactory.createForClass(ProductSpec);

@Schema()
export class CustomBlankConfig {
  @Prop({ default: '' })
  frontBlankImage: string;

  @Prop({ default: '' })
  backBlankImage: string;

  @Prop({ type: [String], default: ['Navy Blue', 'Deep Slate', 'Sand Beige', 'Terracotta', 'Pure White', 'Emerald Green'] })
  supportedColors: string[];

  @Prop({ default: 35 })
  maxTextLength: number;

  @Prop({ default: 20000 })
  backEngraveFee: number;

  @Prop({ default: 30000 })
  photoPrintFee: number;

  @Prop({ type: Object, default: { x: 20, y: 20, width: 60, height: 60 } })
  printArea: { x: number; y: number; width: number; height: number };

  @Prop({ type: Object, default: { x: 25, y: 25, width: 50, height: 50 } })
  safeArea: { x: number; y: number; width: number; height: number };
}

export const CustomBlankConfigSchema = SchemaFactory.createForClass(CustomBlankConfig);

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  slug: string;

  @Prop({ required: true })
  description: string;

  @Prop({ type: [ProductSpecSchema], default: [] })
  specs: ProductSpec[];

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ default: 0, min: 0 })
  salePrice: number;

  @Prop({ type: Types.ObjectId, ref: 'Category', required: true })
  category: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [ProductVariantSchema], default: [] })
  variants: ProductVariant[];

  @Prop({ default: 50, min: 0 })
  stock: number;

  @Prop({ default: '' })
  sku: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ default: false })
  isCustomizable: boolean; // Bespoke product (triggers 50% deposit)

  @Prop({ default: false })
  isFlashSale: boolean;

  @Prop({ default: 0 })
  flashSaleDiscountPercent: number;

  @Prop({ default: 4.9 })
  rating: number;

  @Prop({ default: 0 })
  reviewCount: number;

  @Prop({ default: 0 })
  soldCount: number;

  @Prop({ default: 'ACTIVE', enum: ['ACTIVE', 'INACTIVE', 'DRAFT'] })
  status: string;

  @Prop({ default: 0 })
  customBaseFee: number; // e.g., 30000 VND for laser engraving / UV printing

  @Prop({ type: CustomBlankConfigSchema, default: null })
  customConfig?: CustomBlankConfig;
}

export const ProductSchema = SchemaFactory.createForClass(Product);
ProductSchema.index({ slug: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ isCustomizable: 1 });
ProductSchema.index({ isFlashSale: 1 });
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' });
