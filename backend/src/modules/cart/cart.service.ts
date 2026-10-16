import { VouchersService } from '../vouchers/vouchers.service';
import { shippingPrice } from '../vouchers/voucher.rules';
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
    private readonly vouchers: VouchersService,
  ) {}

  async getCart(userId?: string, sessionId?: string) {
    let cart = await this.findOrCreateCart(userId, sessionId);
    await cart.populate({
      path: 'items.productId',
      select: 'name slug price salePrice images isCustomizable customBaseFee'
    });
    return this.calculateCartTotals(cart, userId);
  }

  async addItem(dto: AddToCartDto, userId?: string) {
    const product = await this.productModel.findById(dto.productId);
    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    const variants = product.variants || [];
    const matches = variants.filter(v => dto.variantSku ? v.sku === dto.variantSku : v.name === dto.variantName);
    const variant = matches.length === 1 ? matches[0] : undefined;
    if (variants.length && !variant) throw new BadRequestException('Vui lòng chọn đầy đủ màu sắc và kích thước');
    if (variant && (variant.status === 'HIDDEN' || variant.status === 'OUT_OF_STOCK')) throw new BadRequestException('Biến thể đã hết hàng');
    const stock = variant ? variant.stock : product.stock;
    const cart = await this.findOrCreateCart(userId, dto.sessionId);
    const inCart = cart.items.filter(item => item.productId.toString() === dto.productId &&
      (variant?.sku ? item.variantSku === variant.sku : item.variantName === (variant?.name || 'Tiêu chuẩn')))
      .reduce((sum, item) => sum + item.quantity, 0);
    if (!Number.isInteger(dto.quantity) || dto.quantity < 1 || dto.quantity + inCart > stock) throw new BadRequestException('Số lượng vượt quá tồn kho');


    const unitPrice = variant?.price ?? (product.salePrice && product.salePrice > 0 ? product.salePrice : product.price);
    const isCustom = product.isCustomizable || !!dto.customDetails;
    const customFee = (dto.customDetails && dto.customDetails.customFee) || (isCustom ? (product.customBaseFee || 0) : 0);
    const finalPrice = unitPrice + customFee;
    const depositAmount = isCustom ? Math.round(finalPrice * 0.5) : 0;

    // Check if duplicate standard item exists
    const existingIndex = cart.items.findIndex(item => 
      item.productId.toString() === dto.productId &&
      (variant?.sku ? item.variantSku === variant.sku : item.variantName === (variant?.name || 'Tiêu chuẩn')) &&
      !isCustom && !item.isCustom
    );

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity += dto.quantity;
      cart.items[existingIndex].depositRequired = cart.items[existingIndex].quantity * depositAmount;
    } else {
      cart.items.push({
        productId: new Types.ObjectId(dto.productId),
        variantName: variant?.name || 'Tiêu chuẩn',
        variantSku: variant?.sku,
        image: variant?.image || variant?.images?.[0] || product.images?.[0],
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
      const item = cart.items[itemIndex];
      const product = await this.productModel.findById(item.productId);
      if (!product) throw new NotFoundException('Sản phẩm không tồn tại');
      const variant = product.variants?.find(v => item.variantSku ? v.sku === item.variantSku : v.name === item.variantName);
      if (product.variants?.length && (!variant || variant.status === 'HIDDEN' || variant.status === 'OUT_OF_STOCK')) throw new BadRequestException('Biến thể không còn bán');
      const otherQuantity = cart.items.reduce((sum, other, index) => index !== itemIndex && other.productId.toString() === item.productId.toString() &&
        (item.variantSku ? other.variantSku === item.variantSku : other.variantName === item.variantName) ? sum + other.quantity : sum, 0);
      if (!Number.isInteger(quantity) || quantity + otherQuantity > (variant ? variant.stock : product.stock)) throw new BadRequestException('Số lượng vượt quá tồn kho');
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
    const cart = await this.findOrCreateCart(userId, sessionId);
    const normalized = this.vouchers.normalize(code);
    if (normalized) {
      const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const quote = await this.vouchers.quote(normalized, total, shippingPrice(total, cart.shippingMethod), userId);
      if (!quote.eligible) throw new BadRequestException(quote.reason);
    }
    cart.voucherCode = normalized;
    cart.voucherDiscount = 0;
    await cart.save();
    return this.getCart(userId, sessionId);
  }

  async setShippingMethod(method: string, userId?: string, sessionId?: string) {
    if (!['STANDARD', 'EXPRESS'].includes(method)) throw new BadRequestException('Phương thức giao hàng không hợp lệ');
    const cart = await this.findOrCreateCart(userId, sessionId);
    cart.shippingMethod = method;
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
    return this.calculateCartTotals(cart, userId);
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

  private async calculateCartTotals(cart: CartDocument, userId?: string) {
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

    const baseShippingFee = shippingPrice(itemsTotal, cart.shippingMethod);
    const vouchers = await this.vouchers.list(itemsTotal, baseShippingFee, userId);
    const selected = vouchers.find(v => v.code === cart.voucherCode);
    const appliedVoucher = selected?.eligible ? selected : null;
    const voucherNotice = cart.voucherCode && !appliedVoucher
      ? `Đã bỏ mã ${cart.voucherCode}: ${selected?.reason || 'Mã đã hết hạn hoặc không còn áp dụng'}.` : '';
    if (cart.voucherCode && !appliedVoucher) {
      cart.voucherCode = '';
      cart.voucherDiscount = 0;
      await cart.save();
    }
    const shippingDiscount = appliedVoucher?.shippingDiscount || 0;
    const shippingFee = baseShippingFee - shippingDiscount;
    const giftWrapFee = 0; // Free today from Stitch banner
    const voucherDiscount = appliedVoucher?.itemDiscount || 0;
    const totalAmount = Math.max(0, itemsTotal - voucherDiscount + shippingFee + giftWrapFee);

    let depositAmount = 0;
    if (cart.paymentMode === PaymentMode.FULL_PAYMENT) {
      depositAmount = totalAmount;
    } else {
      depositAmount = Math.min(totalAmount, customItemsDeposit);
    }

    const remainingCodAmount = Math.max(0, totalAmount - depositAmount);

    return {
      _id: cart._id,
      items: cart.items,
      paymentMode: cart.paymentMode,
      shippingMethod: cart.shippingMethod,
      voucherCode: cart.voucherCode,
      voucherDiscount,
      appliedVoucher, vouchers, voucherNotice,
      includeGiftWrap: cart.includeGiftWrap,
      pricing: {
        itemsTotal,
        voucherDiscount,
        shippingFee, baseShippingFee, shippingDiscount,
        giftWrapFee,
        totalAmount,
        depositAmount,
        remainingCodAmount,
        totalCustomItems
      }
    };
  }
}
