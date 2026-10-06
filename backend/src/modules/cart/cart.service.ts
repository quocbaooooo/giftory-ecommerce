import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from '../../database/schemas/cart.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { Voucher, VoucherDocument } from '../../database/schemas/voucher.schema';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { PaymentMode } from '../../common/enums/role.enum';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Voucher.name) private readonly voucherModel: Model<VoucherDocument>,
  ) {}

  async getCart(userId?: string, sessionId?: string) {
    let cart = await this.findOrCreateCart(userId, sessionId);
    await cart.populate({
      path: 'items.productId',
      select: 'name slug price salePrice images isCustomizable customBaseFee'
    });
    return this.calculateCartTotals(cart);
  }

  async addItem(dto: AddToCartDto, userId?: string) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const cart = await this.findOrCreateCart(userId, dto.sessionId);

    const unitPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    const isCustom = product.isCustomizable || !!dto.customDetails;
    const customFee = (dto.customDetails && dto.customDetails.customFee) || (isCustom ? product.customBaseFee : 0);
    const finalPrice = unitPrice + customFee;
    const depositAmount = isCustom ? Math.round(finalPrice * 0.5) : 0;

    // Check if duplicate standard item exists
    const existingIndex = cart.items.findIndex(item => 
      item.productId.toString() === dto.productId &&
      item.variantName === (dto.variantName || 'Tiêu chuẩn') &&
      !isCustom && !item.isCustom
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += dto.quantity;
      cart.items[existingIndex].depositRequired = cart.items[existingIndex].quantity * depositAmount;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(dto.productId),
        variantName: dto.variantName || 'Tiêu chuẩn',
        quantity: dto.quantity,
        customDesignId: dto.customDesignId ? new Types.ObjectId(dto.customDesignId) : undefined,
        customDetails: dto.customDetails || null,
        price: finalPrice,
        isCustom,
        depositRequired: depositAmount * dto.quantity
      } as any);
    }

    await cart.save();
    return this.getCart(userId, dto.sessionId);
  }

  async updateItemQuantity(itemIndex: number, quantity: number, userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
      const unitDeposit = cart.items[itemIndex].isCustom ? Math.round(cart.items[itemIndex].price * 0.5) : 0;
      cart.items[itemIndex].depositRequired = unitDeposit * quantity;
    }

    await cart.save();
    return this.getCart(userId, sessionId);
  }

  async removeItem(itemIndex: number, userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    if (cart.items[itemIndex]) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
    }
    return this.getCart(userId, sessionId);
  }

  async applyVoucher(code: string, userId?: string, sessionId?: string) {
    const voucher = await this.voucherModel.findOne({
      code: code.toUpperCase(),
      isActive: true,
      expiresAt: { $gte: new Date() }
    });

    if (!voucher) {
      throw new BadRequestException('Mã ưu đãi không hợp lệ hoặc đã hết hạn');
    }

    const cart = await this.findOrCreateCart(userId, sessionId);
    const totals = this.calculateCartTotals(cart);

    if (voucher.minOrderValue > 0 && totals.pricing.itemsTotal < voucher.minOrderValue) {
      throw new BadRequestException(`Đơn hàng phải tối thiểu ${voucher.minOrderValue.toLocaleString('vi-VN')}đ để áp dụng voucher này`);
    }

    let discount = 0;
    if (voucher.discountType === 'PERCENT') {
      discount = Math.round((totals.pricing.itemsTotal * voucher.discountValue) / 100);
      if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) {
        discount = voucher.maxDiscount;
      }
    } else {
      discount = voucher.discountValue;
    }

    cart.voucherCode = voucher.code;
    cart.voucherDiscount = discount;
    await cart.save();

    return this.getCart(userId, sessionId);
  }

  async setPaymentMode(mode: PaymentMode, userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    cart.paymentMode = mode;
    await cart.save();
    return this.getCart(userId, sessionId);
  }

  async updateItemCustomDetails(itemIndex: number, customDetails: any, variantName?: string, userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    if (!cart.items[itemIndex]) {
      throw new NotFoundException('Sản phẩm không có trong giỏ hàng');
    }

    const item = cart.items[itemIndex];
    const product = await this.productModel.findById(item.productId);
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const unitPrice = product.salePrice && product.salePrice > 0 ? product.salePrice : product.price;
    const customFee = (customDetails && customDetails.customFee !== undefined) ? customDetails.customFee : (product.customBaseFee || 0);
    const finalPrice = unitPrice + customFee;
    const depositAmount = Math.round(finalPrice * 0.5);

    item.customDetails = customDetails;
    if (variantName) item.variantName = variantName;
    item.price = finalPrice;
    item.depositRequired = depositAmount * item.quantity;
    item.isCustom = true;

    await cart.save();
    return this.getCart(userId, sessionId);
  }

  async clearCart(userId?: string, sessionId?: string) {
    const cart = await this.findOrCreateCart(userId, sessionId);
    cart.items = [];
    cart.voucherCode = '';
    cart.voucherDiscount = 0;
    await cart.save();
    return this.calculateCartTotals(cart);
  }

  private async findOrCreateCart(userId?: string, sessionId?: string): Promise<CartDocument> {
    let cart: CartDocument | null = null;
    if (userId) {
      cart = await this.cartModel.findOne({ userId: new Types.ObjectId(userId) });
      if (sessionId) {
        // Link or merge guest cart to user
        const guestCart = await this.cartModel.findOne({ sessionId, userId: { $exists: false } });
        if (guestCart && guestCart.items.length > 0) {
          if (!cart) {
            guestCart.userId = new Types.ObjectId(userId);
            await guestCart.save();
            return guestCart;
          } else {
            for (const gItem of guestCart.items) {
              cart.items.push(gItem);
            }
            await guestCart.deleteOne();
            await cart.save();
          }
        }
      }
    } else if (sessionId) {
      cart = await this.cartModel.findOne({ sessionId });
    }

    if (!cart) {
      cart = await this.cartModel.create({
        userId: userId ? new Types.ObjectId(userId) : undefined,
        sessionId: sessionId || `guest-${Date.now()}`,
        items: [],
        paymentMode: PaymentMode.DEPOSIT_50,
        voucherCode: '',
        voucherDiscount: 0,
        includeGiftWrap: true
      });
    }

    return cart;
  }

  private calculateCartTotals(cart: CartDocument) {
    let itemsTotal = 0;
    let totalCustomItems = 0;
    let customItemsDeposit = 0;

    cart.items.forEach(item => {
      const itemSubtotal = item.price * item.quantity;
      itemsTotal += itemSubtotal;
      if (item.isCustom) {
        totalCustomItems += item.quantity;
        customItemsDeposit += Math.round(itemSubtotal * 0.5);
      }
    });

    const shippingFee = itemsTotal > 500000 || itemsTotal === 0 ? 0 : 30000;
    const giftWrapFee = 0; // Free today from Stitch banner
    const voucherDiscount = cart.voucherDiscount || 0;
    const totalAmount = Math.max(0, itemsTotal - voucherDiscount + shippingFee + giftWrapFee);

    let depositAmount = 0;
    if (cart.paymentMode === PaymentMode.FULL_PAYMENT) {
      depositAmount = totalAmount;
    } else {
      depositAmount = customItemsDeposit;
    }

    const remainingCodAmount = Math.max(0, totalAmount - depositAmount);

    return {
      _id: cart._id,
      items: cart.items,
      paymentMode: cart.paymentMode,
      voucherCode: cart.voucherCode,
      voucherDiscount,
      includeGiftWrap: cart.includeGiftWrap,
      pricing: {
        itemsTotal,
        voucherDiscount,
        shippingFee,
        giftWrapFee,
        totalAmount,
        depositAmount,
        remainingCodAmount,
        totalCustomItems
      }
    };
  }
}
