export interface User {
  _id: string;
  name: string;
  fullName?: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'CUSTOMER' | 'ADMIN';
  loyaltyPoints: number;
  loyaltyTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  isActive?: boolean;
  createdAt?: string;
  address?: {
    street?: string;
    ward?: string;
    district?: string;
    city?: string;
    detailAddress?: string;
  };
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  emoji?: string;
  icon?: string;
  description?: string;
  imageUrl?: string;
}

export interface ProductVariant {
  name: string;
  price: number;
  stock: number;
  sku?: string;
  image?: string;
}

export interface ProductSpec {
  key: string;
  value: string;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  salePrice?: number;
  category?: any;
  images: string[];
  variants?: ProductVariant[];
  specs?: ProductSpec[];
  stock: number;
  sku?: string;
  tags?: string[];
  isCustomizable?: boolean;
  isFlashSale?: boolean;
  flashSaleDiscountPercent?: number;
  rating?: number;
  soldCount?: number;
  customBaseFee?: number;
  status?: string;
  relatedProducts?: Product[];
  createdAt?: string;
}

export interface CustomDesign {
  _id?: string;
  productId?: string | Product;
  baseProductId?: string;
  title?: string;
  designName?: string;
  frontMessage?: string;
  backMessage?: string;
  customText?: string;
  fontFamily?: string;
  engraveColor?: string;
  colorHex?: string;
  selectedColor?: string;
  stickers?: any[];
  previewImage?: string;
  customFee?: number;
  price?: number;
  designData?: any;
}

export interface CartItem {
  productId: any;
  name?: string;
  variantName?: string;
  quantity: number;
  image?: string;
  customDesignId?: string;
  customDetails?: {
    frontMessage?: string;
    backMessage?: string;
    customText?: string;
    fontFamily?: string;
    engraveColor?: string;
    colorHex?: string;
    selectedColor?: string;
    previewImage?: string;
    customFee?: number;
    designData?: any;
  };
  price: number;
  isCustom: boolean;
  depositRequired: number;
}

export interface Cart {
  _id: string;
  items: CartItem[];
  paymentMode: 'DEPOSIT_50' | 'FULL_PAYMENT';
  voucherCode?: string;
  voucherDiscount: number;
  includeGiftWrap: boolean;
  pricing: {
    itemsTotal: number;
    voucherDiscount: number;
    shippingFee: number;
    giftWrapFee: number;
    totalAmount: number;
    depositAmount: number;
    remainingCodAmount: number;
    totalCustomItems: number;
  };
}

export interface OrderTimeline {
  title: string;
  description: string;
  timestamp: string | Date;
  completed: boolean;
}

export interface Order {
  _id: string;
  orderCode: string;
  customerInfo?: {
    name: string;
    phone: string;
    email?: string;
    address: string;
    note?: string;
  };
  shippingAddress: {
    fullName: string;
    phone: string;
    city: string;
    district: string;
    ward: string;
    detailAddress: string;
  };
  shippingNote?: string;
  items: Array<{
    productId: string;
    name?: string;
    productName?: string;
    image?: string;
    productImage?: string;
    variantName?: string;
    quantity: number;
    price: number;
    unitPrice?: number;
    isCustom: boolean;
    customDetails?: any;
    depositRequired: number;
  }>;
  pricing?: {
    itemsTotal: number;
    voucherDiscount: number;
    shippingFee: number;
    giftWrapFee: number;
    totalAmount: number;
    depositAmount: number;
    remainingCodAmount: number;
  };
  totalAmount: number;
  depositAmount?: number;
  remainingAmount?: number;
  paymentMode: 'DEPOSIT_50' | 'FULL_PAYMENT';
  paymentMethod: 'VIETQR' | 'VNPAY' | 'MOMO' | 'COD';
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID_DEPOSIT_50' | 'PAID_FULL' | 'REFUNDED';
  orderStatus: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED';
  fulfillmentStatus: 'AWAITING_DEPOSIT' | 'AT_WORKSHOP' | 'QUALITY_INSPECTION' | 'PACKAGED' | 'SHIPPED' | 'DELIVERED';
  timeline?: OrderTimeline[];
  trackingCode?: string;
  shippingCarrier?: string;
  createdAt: string;
}

export interface Voucher {
  _id: string;
  code: string;
  title: string;
  description: string;
  discountType: 'FIXED' | 'PERCENT';
  discountValue: number;
  minOrderValue: number;
  pointsCost: number;
  requiredPoints?: number;
  validUntil: string;
  expiresAt?: string;
}
