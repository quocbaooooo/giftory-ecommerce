import { normalizeGift, giftPhone, giftNotice, giftRecipientView, validateGiftToken, requireGiftPrepaid } from './gift.rules';
import { GiftBoxConfig, GiftBoxConfigDocument } from '../../database/schemas/gift-box-config.schema';
import { normalizeBoxes, quotePackaging, legacyPackaging } from '../cart/packaging.rules';
import { VouchersService } from '../vouchers/vouchers.service';
import { shippingPrice } from '../vouchers/voucher.rules';
import { CareService } from '../care/care.service';
import { normalizeAddress } from '../recipients/address.rules';
import { normalizeGreetingCard } from './greeting-card.rules';
import { studioUnitPrice } from '../../common/utils/studio-pricing';
import { Injectable, BadRequestException, NotFoundException, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'crypto';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../database/schemas/order.schema';
import { Cart, CartDocument } from '../../database/schemas/cart.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { LoyaltyTransaction, LoyaltyTransactionDocument } from '../../database/schemas/loyalty-transaction.schema';
import { GuestCodOtpChallenge, GuestCodOtpChallengeDocument } from '../../database/schemas/guest-cod-otp-challenge.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { GuestCodOtpRequestDto, GuestCodOtpResendDto, GuestCodOtpVerifyDto } from './dto/guest-cod-otp.dto';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentMode,
  PaymentMethod,
  OrderItemStatus
} from '../../common/enums/role.enum';

@Injectable()
export class OrdersService {
  constructor(
    private readonly care: CareService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(LoyaltyTransaction.name) private readonly loyaltyModel: Model<LoyaltyTransactionDocument>,
    @InjectModel(GuestCodOtpChallenge.name) private readonly guestCodOtpModel: Model<GuestCodOtpChallengeDocument>,
    private readonly vouchers?: VouchersService,
    private readonly configService?: ConfigService,
    @InjectModel(GiftBoxConfig.name) private readonly giftBoxConfigModel?: Model<GiftBoxConfigDocument>,
  ) {}

  async sendGuestCodOtp(dto: GuestCodOtpRequestDto, userId?: string) {
    if (userId) throw new BadRequestException('Thành viên không cần xác minh OTP khi đặt COD.');
    const phone = normalizeVietnamPhone(dto.phone);
    if (!/^0[35789]\d{8}$/.test(phone)) throw new BadRequestException('Số điện thoại không hợp lệ.');
    const existing = await this.guestCodOtpModel.findOne({ phone, sessionId: dto.sessionId, status: { $in: ['PENDING', 'VERIFIED', 'LOCKED'] } }).sort({ createdAt: -1 });
    if (existing?.status === 'LOCKED' || (existing && existing.attemptsUsed >= 5)) {
      throw new BadRequestException('Bạn đã hết 5 lượt xác minh OTP cho đơn hàng này.');
    }
    if (existing?.status === 'VERIFIED' && existing.expiresAt.getTime() > Date.now()) {
      return { challengeId: existing.challengeId, expiresInSeconds: Math.ceil((existing.expiresAt.getTime() - Date.now()) / 1000), attemptsRemaining: 5 - existing.attemptsUsed, resendsRemaining: Math.max(0, 5 - existing.sendCount), verified: true };
    }
    if (existing?.status === 'VERIFIED') {
      const attemptsUsed = existing.attemptsUsed + 1;
      await this.guestCodOtpModel.updateOne(
        { _id: existing._id, status: 'VERIFIED' },
        { $set: { status: attemptsUsed >= 5 ? 'LOCKED' : 'PENDING' }, $inc: { attemptsUsed: 1 }, $unset: { verifiedAt: 1 } },
      );
      if (attemptsUsed >= 5) throw new BadRequestException('Mã xác minh đã hết hạn và bạn đã hết 5 lượt thử.');
      return this.resendGuestCodOtp({ challengeId: existing.challengeId, phone, sessionId: dto.sessionId }, userId);
    }
    if (existing?.status === 'PENDING') {
      return this.resendGuestCodOtp({ challengeId: existing.challengeId, phone, sessionId: dto.sessionId }, userId);
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const demoMode = process.env.NODE_ENV !== 'production';
    if (!demoMode) await this.deliverGuestCodOtp(phone, code);
    const challenge = await this.guestCodOtpModel.create({
      challengeId: randomUUID(), phone, sessionId: dto.sessionId,
      codeHash: this.guestCodOtpHash(code), attemptsUsed: 0, sendCount: 1,
      status: 'PENDING', expiresAt: new Date(Date.now() + 60_000),
    });
    return { challengeId: challenge.challengeId, expiresInSeconds: 60, attemptsRemaining: 5, resendsRemaining: 4, verified: false, ...(demoMode ? { demoCode: code } : {}) };
  }

  async resendGuestCodOtp(dto: GuestCodOtpResendDto, userId?: string) {
    if (userId) throw new BadRequestException('Thành viên không cần xác minh OTP khi đặt COD.');
    const phone = normalizeVietnamPhone(dto.phone);
    const challenge = await this.guestCodOtpModel.findOne({ challengeId: dto.challengeId, phone, sessionId: dto.sessionId, status: 'PENDING' });
    if (!challenge || challenge.attemptsUsed >= 5 || challenge.sendCount >= 5) {
      throw new BadRequestException('Không thể gửi thêm mã OTP. Vui lòng bắt đầu lại quy trình đặt hàng.');
    }
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const demoMode = process.env.NODE_ENV !== 'production';
    if (!demoMode) await this.deliverGuestCodOtp(phone, code);
    await this.guestCodOtpModel.updateOne(
      { _id: challenge._id, status: 'PENDING', attemptsUsed: challenge.attemptsUsed, sendCount: challenge.sendCount },
      { $set: { codeHash: this.guestCodOtpHash(code), expiresAt: new Date(Date.now() + 60_000) }, $inc: { sendCount: 1 } },
    );
    return { challengeId: challenge.challengeId, expiresInSeconds: 60, attemptsRemaining: Math.max(0, 5 - challenge.attemptsUsed), resendsRemaining: Math.max(0, 5 - challenge.sendCount - 1), verified: false, ...(demoMode ? { demoCode: code } : {}) };
  }

  async verifyGuestCodOtp(dto: GuestCodOtpVerifyDto, userId?: string) {
    if (userId) throw new BadRequestException('Thành viên không cần xác minh OTP khi đặt COD.');
    const phone = normalizeVietnamPhone(dto.phone);
    const challenge = await this.guestCodOtpModel.findOne({ challengeId: dto.challengeId, phone, sessionId: dto.sessionId, status: 'PENDING' }).select('+codeHash');
    if (!challenge) throw new BadRequestException('Phiên xác minh OTP không hợp lệ hoặc đã kết thúc.');
    if (challenge.attemptsUsed >= 5) return { verified: false, attemptsRemaining: 0, canResend: false, message: 'Bạn đã hết 5 lượt xác minh OTP.' };

    const expired = challenge.expiresAt.getTime() <= Date.now();
    const submittedHash = this.guestCodOtpHash(dto.code);
    const expected = Buffer.from(challenge.codeHash, 'hex');
    const submitted = Buffer.from(submittedHash, 'hex');
    const isCorrect = !expired && expected.length === submitted.length && timingSafeEqual(expected, submitted);
    if (isCorrect) {
      const verified = await this.guestCodOtpModel.findOneAndUpdate(
        { _id: challenge._id, status: 'PENDING', attemptsUsed: challenge.attemptsUsed, expiresAt: { $gt: new Date() } },
        { $set: { status: 'VERIFIED', verifiedAt: new Date() } },
        { new: true },
      );
      if (verified) return { verified: true, attemptsRemaining: 5 - verified.attemptsUsed, canResend: false, message: 'Xác minh số điện thoại thành công.' };
    }

    const attemptsUsed = challenge.attemptsUsed + 1;
    const locked = attemptsUsed >= 5;
    const updated = await this.guestCodOtpModel.findOneAndUpdate(
      { _id: challenge._id, status: 'PENDING', attemptsUsed: challenge.attemptsUsed },
      { $inc: { attemptsUsed: 1 }, ...(locked ? { $set: { status: 'LOCKED' } } : {}) },
      { new: true },
    );
    const remaining = updated ? Math.max(0, 5 - updated.attemptsUsed) : 0;
    return {
      verified: false,
      attemptsRemaining: remaining,
      canResend: remaining > 0 && !locked,
      message: expired ? 'Mã OTP đã hết hạn.' : 'Mã OTP không chính xác.',
    };
  }

  private guestCodOtpHash(code: string): string {
    const secret = this.configService?.get<string>('ORDER_OTP_HASH_SECRET')
      || this.configService?.get<string>('JWT_ACCESS_SECRET')
      || 'giftory-cod-otp-development-secret';
    return createHmac('sha256', secret).update(code).digest('hex');
  }

  private async deliverGuestCodOtp(phone: string, code: string): Promise<void> {
    const endpoint = this.configService?.get<string>('ORDER_OTP_SMS_URL');
    const token = this.configService?.get<string>('ORDER_OTP_SMS_TOKEN');
    if (!endpoint?.startsWith('https://') || !token) {
      throw new ServiceUnavailableException('Dịch vụ gửi OTP chưa sẵn sàng. Đơn hàng chưa được tạo.');
    }
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message: `Ma xac minh Giftory: ${code}. Ma co hieu luc trong 1 phut.` }),
        signal: AbortSignal.timeout(10_000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('SMS provider rejected delivery');
    } catch {
      throw new ServiceUnavailableException('Không gửi được OTP đến số điện thoại này. Đơn hàng chưa được tạo.');
    }
  }

  async createOrder(dto: CreateOrderDto, userId?: string) {
    const greetingCard = normalizeGreetingCard(dto.greetingCard);
    const gift = normalizeGift(dto.gift, dto.customerInfo, greetingCard, dto.paymentMethod);
    const requiresGuestCodOtp = !userId && dto.paymentMethod === PaymentMethod.COD;
    if (requiresGuestCodOtp && !dto.guestCodOtpChallengeId) {
      throw new BadRequestException('Khách đặt COD cần xác minh OTP trước khi tạo đơn hàng.');
    }
    const info = dto.customerInfo;
    if (info?.provinceCode !== undefined || info?.wardCode !== undefined || info?.street !== undefined) {
      dto.customerInfo = { ...info, ...normalizeAddress({ provinceCode: info.provinceCode, wardCode: info.wardCode, street: info.street }) };
    }
    if (dto.customerInfo.districtName?.trim()) {
      dto.customerInfo.districtName = dto.customerInfo.districtName.trim();
      dto.customerInfo.address = dto.customerInfo.address.replace(/, ([^,]+)$/, `, ${dto.customerInfo.districtName}, $1`);
    }
    if (gift) dto.customerInfo.email = '';
    let orderItems: any[] = [];
    let itemsTotal = 0;
    let customDeposit = 0;
    let hasCustomProduct = false;
    let voucherDiscount = 0;
    let cart: any = null;

    if (dto.buyNowItem) {
      // Flow Mua Ngay (Buy Now): Thanh toán trực tiếp món hàng, KHÔNG gộp và KHÔNG xóa giỏ hàng cũ
      const product = await this.productModel.findById(dto.buyNowItem.productId);
      if (!product) {
        throw new NotFoundException('Sản phẩm Mua Ngay không tồn tại hoặc đã ngừng kinh doanh');
      }

      const qty = Math.max(1, Number(dto.buyNowItem.quantity || 1));
      const isStudioItem = product.isCustomizable && (!!dto.buyNowItem.customDesignId || hasDesignContent(dto.buyNowItem.customDetails)) && !dto.buyNowItem.variantSku;
      const matches = (isStudioItem ? [] : product.variants || []).filter(v => dto.buyNowItem.variantSku ? v.sku === dto.buyNowItem.variantSku : v.name === dto.buyNowItem.variantName);
      const variant = matches.length === 1 ? matches[0] : undefined;
      if (!isStudioItem && product.variants?.length && (!variant || variant.status === 'HIDDEN' || variant.status === 'OUT_OF_STOCK')) throw new BadRequestException('Vui lòng chọn biến thể còn hàng');
      if (!Number.isInteger(qty) || qty > (variant ? variant.stock : product.stock)) throw new BadRequestException('Số lượng vượt quá tồn kho');
      const unitPrice = isStudioItem ? studioUnitPrice(product, dto.buyNowItem.customDetails)
        : variant?.price ?? (product.salePrice || product.price);

      const subtotal = unitPrice * qty;
      itemsTotal = subtotal;

      const isCustom = isStudioItem;
      if (isCustom) hasCustomProduct = true;

      const depositRequired = isCustom ? Math.round(subtotal * 0.5) : 0;
      customDeposit = depositRequired;

      orderItems = [{
        productId: product._id,
        productName: product.name,
        loyaltyEligible: product.loyaltyEligible !== false,
        packagingSize: product.packagingSize || 'MEDIUM',
        productImage: variant?.image || variant?.images?.[0] || product.images?.[0] || '',
        variantName: variant?.name || 'Tiêu chuẩn',
        variantSku: variant?.sku,
        quantity: qty,
        unitPrice,
        isCustom,
        itemType: isCustom ? 'CUSTOM' : 'READY_MADE',
        status: OrderItemStatus.PENDING,
        customDesignId: dto.buyNowItem.customDesignId ? new Types.ObjectId(dto.buyNowItem.customDesignId) : undefined,
        customDetails: dto.buyNowItem.customDetails || null,
        depositRequired
      }];
    } else {
      // Flow Giỏ Hàng thông thường
      const query: any = {};
      if (userId) {
        query.userId = new Types.ObjectId(userId);
      } else if (dto.sessionId) {
        query.sessionId = dto.sessionId;
      } else {
        throw new BadRequestException('Không tìm thấy thông tin giỏ hàng');
      }

      cart = await this.cartModel.findOne(query).populate('items.productId');
      if (!cart || !cart.items || cart.items.length === 0) {
        throw new BadRequestException('Giỏ hàng không hợp lệ hoặc đang trống, không thể tạo đơn hàng');
      }



      orderItems = cart.items.map(item => {
        const product: any = item.productId;
        const isStudioItem = item.isCustom && product?.isCustomizable && (!!item.customDesignId || hasDesignContent(item.customDetails)) && !item.variantSku;
        const unitPrice = isStudioItem ? studioUnitPrice(product, item.customDetails) : item.price;
        const subtotal = unitPrice * item.quantity;
        itemsTotal += subtotal;

        const isCustom = !!item.customDesignId || !!isStudioItem;
        if (isCustom) hasCustomProduct = true;

        const depositRequired = isCustom ? Math.round(subtotal * 0.5) : 0;
        customDeposit += depositRequired;

        return {
          cartItemId: String(item._id),
          productId: product._id,
          productName: product.name,
        loyaltyEligible: product.loyaltyEligible !== false,
        packagingSize: product.packagingSize || 'MEDIUM',
          productImage: item.image || product.images?.[0] || '',
          variantName: item.variantName || 'Tiêu chuẩn',
          variantSku: item.variantSku,
          quantity: item.quantity,
          unitPrice,
          isCustom,
          itemType: isCustom ? 'CUSTOM' : 'READY_MADE',
          status: OrderItemStatus.PENDING,
          customDesignId: item.customDesignId,
          customDetails: item.customDetails || null,
          depositRequired,
          giftBoxStyle: item.giftBoxStyle || 'NONE',
          giftBoxFee: item.giftBoxFee || 0,
        };
      });
    }

    // BP-03 Rule: Free shipping for orders >= 250,000 VND (Standard)
    const shippingMethod = dto.shippingMethod || 'STANDARD';
    const baseShippingFee = shippingPrice(itemsTotal, shippingMethod);
    let voucher: any = null;
    if (cart?.voucherCode) {
      voucher = await this.vouchers.quote(cart.voucherCode, itemsTotal, baseShippingFee, userId);
      if (!voucher.eligible) throw new BadRequestException(voucher.reason + '. Vui lòng quay lại giỏ hàng để chọn mã khác.');
    }
    voucherDiscount = voucher?.itemDiscount || 0;
    const shippingDiscount = voucher?.shippingDiscount || 0;
    const shippingFee = baseShippingFee - shippingDiscount;

    const boxConfig = cart ? await this.giftBoxConfigModel?.findOne({ key: 'default' }).lean().exec() : null;
    const packaging = cart ? quotePackaging(cart.items, cart.packaging || legacyPackaging(cart.items), normalizeBoxes(boxConfig?.boxes)) : null;
    const giftWrapFee = packaging?.totalFee || 0;
    const totalAmount = Math.max(0, itemsTotal - voucherDiscount + shippingFee + giftWrapFee);

    // COD prepays only half of custom line totals; standard goods and shipping remain payable on delivery.
    const depositAmount = !gift && dto.paymentMethod === PaymentMethod.COD
      ? Math.min(totalAmount, customDeposit)
      : totalAmount;

    const remainingCodAmount = Math.max(0, totalAmount - depositAmount);
    const orderCode = `GF-${Math.floor(100000 + Math.random() * 900000)}`;

    const isStandardCod = !hasCustomProduct && dto.paymentMethod === PaymentMethod.COD;

    // History contains only events that have actually happened.
    const initialTimeline = [{
      title: 'Đơn hàng khởi tạo thành công',
      description: `Đơn hàng ${orderCode} đã được ghi nhận và đang chờ admin xác nhận.`,
      timestamp: new Date(),
      completed: true,
    }];
    if (isStandardCod) initialTimeline.push({
      title: 'Ghi nhận thanh toán khi nhận hàng',
      description: 'Đơn hàng COD không cần thanh toán trước và đang chờ admin xác nhận.',
      timestamp: new Date(),
      completed: true,
    });

    const initialPaymentStatus = isStandardCod 
      ? PaymentStatus.UNPAID // COD Pending
      : PaymentStatus.UNPAID;

    if (voucher) {
      const reserved = await this.vouchers.reserve(voucher.code, itemsTotal, baseShippingFee, userId, orderCode);
      if (reserved.itemDiscount !== voucher.itemDiscount || reserved.shippingDiscount !== voucher.shippingDiscount || reserved.discountType !== voucher.discountType) {
        await this.vouchers.release(voucher.code, orderCode);
        throw new BadRequestException('Ưu đãi vừa thay đổi. Vui lòng kiểm tra lại giỏ hàng.');
      }
    }
    let order;
    let claimedOtpChallengeId: string | undefined;
    try {
      if (requiresGuestCodOtp) {
        const verifiedOtp = await this.guestCodOtpModel.findOneAndUpdate(
          {
            challengeId: dto.guestCodOtpChallengeId,
            phone: normalizeVietnamPhone(dto.customerInfo.phone),
            sessionId: dto.sessionId,
            status: 'VERIFIED',
            expiresAt: { $gt: new Date() },
            consumedAt: { $exists: false },
          },
          { $set: { status: 'CONSUMED', consumedAt: new Date() } },
          { new: true },
        );
        if (!verifiedOtp) throw new BadRequestException('Xác minh OTP chưa hoàn tất hoặc đã hết hạn. Vui lòng xác minh lại.');
        claimedOtpChallengeId = verifiedOtp.challengeId;
      }
      order = await this.orderModel.create({
        voucherCode: voucher?.code || '',
        voucherType: voucher?.discountType || '',
        orderCode,
        userId: userId ? new Types.ObjectId(userId) : undefined,
        customerInfo: dto.customerInfo,
        greetingCard,
        gift,
        items: orderItems,
      packaging,
        pricing: {
          itemsTotal,
          voucherDiscount,
          shippingFee, baseShippingFee, shippingDiscount,
          giftWrapFee,
          totalAmount,
          depositAmount,
          remainingCodAmount
        },
        paymentMode: depositAmount < totalAmount ? PaymentMode.DEPOSIT_50 : PaymentMode.FULL_PAYMENT,
        paymentMethod: dto.paymentMethod,
        paymentStatus: initialPaymentStatus,
        orderStatus: OrderStatus.AWAITING_CONFIRMATION,
        fulfillmentStatus: FulfillmentStatus.AWAITING_CONFIRMATION,
        timeline: initialTimeline,
        trackingCode: '',
        shippingCarrier: shippingMethod === 'EXPRESS' ? 'Giao Hàng Hỏa Tốc (2h - 48h)' : 'Giao Hàng Tiêu Chuẩn',
        confirmationWait: {
          minWaitHours: 12,
          maxWaitHours: 48,
          eligibleAt: new Date(Date.now() + 12 * 3600000),
          deadlineAt: new Date(Date.now() + 48 * 3600000),
          confirmedAt: null,
          confirmedBy: ''
        },
        isPackaged: false,
        deliveryInfo: {
          carrier: shippingMethod === 'EXPRESS' ? 'Giao Hàng Hỏa Tốc (2h - 48h)' : 'Giao Hàng Tiêu Chuẩn',
          trackingCode: '',
          deliveryAttempts: [],
          deliveryResult: 'PENDING',
          failureReason: '',
          allowRetry: true
        }
      });

    } catch (error) {
      if (voucher) await this.vouchers.release(voucher.code, orderCode);
      if (claimedOtpChallengeId) {
        await this.guestCodOtpModel.updateOne(
          { challengeId: claimedOtpChallengeId, status: 'CONSUMED' },
          { $set: { status: 'VERIFIED' }, $unset: { consumedAt: 1 } },
        );
      }
      throw error;
    }

    if (gift) {
      giftNotice(order, 'ORDER_CREATED', `Đã nhận đơn quà ${orderCode}. Hóa đơn và thông báo thanh toán chỉ dành cho người đặt ${gift.sender.name}.`);
      await order.save();
    }
    // Clear cart items ONLY for regular cart orders (preserve cart for Buy Now)
    if (!dto.buyNowItem && cart) {
      cart.items = [];
      cart.packaging = null;
      cart.voucherCode = '';
      cart.voucherDiscount = 0;
      await cart.save();
    }

    return order;
  }

  async processDemoPayment(orderCode: string, userId?: string, phone?: string) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_PAYMENT_SIMULATION === 'false') {
      throw new BadRequestException('Thanh toán mô phỏng không khả dụng trong môi trường này');
    }
    const order = await this.getOrderByCode(orderCode, userId, phone);
    if (order.refundPending || [OrderStatus.CANCELLED, OrderStatus.DELIVERED, OrderStatus.RETURNED_BP06].includes(order.orderStatus) || order.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Đơn không thể tiếp nhận thanh toán');
    }
    if (order.pricing.depositAmount <= 0) throw new BadRequestException('Đơn COD không yêu cầu thanh toán trước');
    if (order.paymentStatus !== PaymentStatus.UNPAID) return order;

    const isFull = order.pricing.depositAmount >= order.pricing.totalAmount;
    const paymentEvent = {
      title: isFull ? 'Đã thanh toán 100% (mô phỏng)' : 'Đã cọc 50% (mô phỏng)',
      description: `Đã ghi nhận ${order.pricing.depositAmount.toLocaleString('vi-VN')}đ trong chế độ đồ án. Không có giao dịch ngân hàng thực. Tiến độ xử lý đơn hàng được cập nhật bởi admin.`,
      timestamp: new Date(),
      completed: true,
    };
    // Conditional update makes retries safe, including simultaneous requests.
    const updated = await this.orderModel.findOneAndUpdate(
      { _id: order._id, paymentStatus: PaymentStatus.UNPAID, orderStatus: order.orderStatus, refundPending: { $ne: true } },
      {
        $set: {
          paymentStatus: isFull ? PaymentStatus.PAID_FULL : PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
        },
        $push: { timeline: paymentEvent, ...(order.gift?.enabled ? { 'gift.notifications': { id: randomUUID(), kind: 'PAYMENT_CONFIRMED', audience: 'BUYER', destination: order.gift.sender.email, status: 'SIMULATED', timestamp: new Date(), text: `Đã nhận thanh toán ${order.pricing.depositAmount.toLocaleString('vi-VN')}đ cho đơn quà ${order.orderCode}. Hóa đơn gửi riêng người đặt.` } } : {}) },
      },
      { new: true },
    ).exec();
    return updated || this.getOrderByCode(orderCode, userId, phone);
  }

  async giftRecipientOrder(orderCode: string, token: string) {
    const order = await this.orderModel.findOne({ orderCode: orderCode.trim().toUpperCase() }).exec();
    validateGiftToken(order, token);
    return order;
  }
  async recipientGift(orderCode: string, token: string) {
    const order = await this.giftRecipientOrder(orderCode, token);
    return { ...giftRecipientView(order), cases: await this.care.recipientGiftCases(order._id) };
  }
  async giftSlip(id: string) {
    const order = await this.findOrderById(id);
    if (!order.gift?.enabled) throw new BadRequestException('Đơn này không gửi quà trực tiếp');
    const base = (this.configService?.get<string>('FRONTEND_URL') || 'http://localhost:4200').replace(/\/$/, '');
    const recipientUrl = `${base}/gift/${order.orderCode}#${order.gift.recipientAccessToken}`;
    const QRCode = require('qrcode');
    const qrImage = await QRCode.toDataURL(recipientUrl, { errorCorrectionLevel: 'M', margin: 4, width: 240 });
    return { ...giftRecipientView(order), recipientUrl, qrImage };
  }
  async simulateGiftLink(id: string) {
    const order = await this.findOrderById(id);
    if (!order.gift?.enabled || !['AWAITING_BUYER', 'AWAITING_RECIPIENT'].includes(order.gift.exception?.status)) throw new BadRequestException('Chỉ gửi link hẹn lại khi có ngoại lệ giao quà');
    order.gift.exception.status = 'AWAITING_RECIPIENT';
    giftNotice(order, 'REDELIVERY_LINK', 'Giftory mời bạn xác nhận thời gian nhận quà thuận tiện qua link riêng.', 'RECIPIENT');
    await order.save();
    return { status: 'SIMULATED', ...(await this.giftSlip(id)) };
  }
  private validateGiftWindow(window: string) {
    const value = typeof window === 'string' ? new Date(window) : null;
    if (!value || !Number.isFinite(value.getTime()) || value.getTime() < Date.now() || value.getTime() > Date.now() + 30 * 86400000) throw new BadRequestException('Chọn giờ giao lại trong 30 ngày tới');
    return value.toISOString();
  }
  async scheduleGift(order: any, window: string, actor: string) {
    if (!order.gift?.enabled || !['AWAITING_BUYER', 'AWAITING_RECIPIENT'].includes(order.gift.exception?.status) || !['IN_TRANSIT', 'SHIPPING'].includes(order.orderStatus)) throw new BadRequestException('Đơn không chờ hẹn giao lại');
    order.gift.exception = { ...order.gift.exception, status: 'READY_TO_RETRY', requestedWindow: this.validateGiftWindow(window), confirmedBy: actor, confirmedAt: new Date() };
    giftNotice(order, 'REDELIVERY_CONFIRMED', `Đã hẹn giao lại cho ${order.customerInfo.name}: ${order.gift.exception.requestedWindow}.`);
    order.timeline.push({ title: 'Đã xác nhận thời gian giao lại', description: `${actor} đã chọn thời gian nhận quà.`, timestamp: new Date(), completed: true });
    await order.save();
    return { status: 'CONFIRMED', requestedWindow: order.gift.exception.requestedWindow };
  }
  async recipientSchedule(orderCode: string, token: string, window: string) {
    const order = await this.giftRecipientOrder(orderCode, token);
    if (order.gift.exception?.status !== 'AWAITING_RECIPIENT') throw new BadRequestException('Chưa có lời mời xác nhận giao lại');
    return this.scheduleGift(order, window, 'Người nhận');
  }
  async buyerSchedule(orderCode: string, userId: string, phone: string, window: string) {
    const order = await this.getOrderByCode(orderCode, userId, phone);
    return this.scheduleGift(order, window, 'Người đặt');
  }
  async recipientWarranty(orderCode: string, token: string, body: any) {
    const order = await this.giftRecipientOrder(orderCode, token);
    return this.care.createRecipientGiftCase(order, body);
  }
  async settleGiftBalance(orderCode: string, userId?: string, phone?: string) {
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_PAYMENT_SIMULATION === 'false') throw new BadRequestException('Thanh toán mô phỏng không khả dụng');
    const order = await this.getOrderByCode(orderCode, userId, phone);
    if (!order.gift?.enabled || order.paymentStatus !== PaymentStatus.PARTIALLY_PAID_DEPOSIT_50 || order.refundPending || [OrderStatus.CANCELLED, OrderStatus.DELIVERED, OrderStatus.RETURNED_BP06].includes(order.orderStatus)) throw new BadRequestException('Đơn không cần hoặc không thể thanh toán bổ sung');
    const updated = await this.orderModel.findOneAndUpdate({ _id: order._id, paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50, orderStatus: order.orderStatus, refundPending: { $ne: true } }, {
      $set: { paymentStatus: PaymentStatus.PAID_FULL, 'pricing.depositAmount': order.pricing.totalAmount, 'pricing.remainingCodAmount': 0 },
      $push: { timeline: { title: 'Người đặt đã thanh toán đủ tiền quà (mô phỏng)', description: 'Không thu COD từ người nhận.', completed: true, timestamp: new Date() },
        'gift.notifications': { kind: 'PAYMENT_SETTLED', text: 'Người đặt đã thanh toán đủ 100% tiền quà. Không thu tiền từ người nhận.', audience: 'BUYER', destination: order.gift.sender.email, status: 'SIMULATED', timestamp: new Date() } },
    }, { new: true }).exec();
    return updated || this.getOrderByCode(orderCode, userId, phone);
  }

  async getMyOrders(userId?: string) {
    if (!userId) {
      return [];
    }
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async getOrderByCode(orderCode: string, userId?: string, phone?: string) {
    const order = await this.orderModel.findOne({ orderCode: orderCode.trim().toUpperCase() }).exec();
    const normalizePhone = (value: string) => value.replace(/[\s().-]/g, '').replace(/^\+?84/, '0');
    const owned = order && userId && order.userId?.toString() === userId;
    const verifiedPhone = order && typeof phone === 'string' && /^0\d{8,10}$/.test(normalizePhone(phone)) && normalizePhone(phone) === normalizePhone(order.gift?.enabled ? order.gift.sender.phone : order.customerInfo.phone);
    if (!order || (!owned && !verifiedPhone)) {
      throw new NotFoundException('Không tìm thấy đơn hàng phù hợp với thông tin tra cứu');
    }
    return order;
  }

  async cancelOrder(orderId: string, userId?: string) {
    return this.care.cancel(orderId, userId);
  }

  // Admin methods
  async findAllOrders(query: any) {
    const filter: any = {};
    if (query.status) {
      filter.orderStatus = query.status;
    }
    if (query.fulfillmentStatus) {
      filter.fulfillmentStatus = query.fulfillmentStatus;
    }
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { orderCode: regex },
        { 'customerInfo.name': regex },
        { 'customerInfo.phone': regex }
      ];
    }

    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(query.limit || 15)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.orderModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async updateOrderStatus(id: string, body: { orderStatus?: OrderStatus; fulfillmentStatus?: FulfillmentStatus; paymentStatus?: PaymentStatus }) {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if ([OrderStatus.CANCELLED, OrderStatus.DELIVERED, OrderStatus.RETURNED_BP06].includes(order.orderStatus)) throw new BadRequestException('Đơn đã kết thúc; vui lòng xử lý qua hồ sơ hỗ trợ');
    if (order.refundPending || body.orderStatus === OrderStatus.CANCELLED || body.orderStatus === OrderStatus.DELIVERED || body.fulfillmentStatus === FulfillmentStatus.DELIVERED || body.paymentStatus === PaymentStatus.REFUNDED) {
      throw new BadRequestException('Vui lòng dùng quy trình hủy / giao hàng / hoàn tiền tương ứng');
    }
    if (body.orderStatus && [OrderStatus.PENDING, OrderStatus.AWAITING_CONFIRMATION].includes(body.orderStatus) && ![OrderStatus.PENDING, OrderStatus.AWAITING_CONFIRMATION].includes(order.orderStatus)) throw new BadRequestException('Không thể đưa đơn đã xác nhận về trạng thái chưa xác nhận');
    if (body.orderStatus && !Object.values(OrderStatus).includes(body.orderStatus)) throw new BadRequestException('Trạng thái đơn không hợp lệ');
    if (order.gift?.enabled && ([OrderStatus.IN_TRANSIT, OrderStatus.SHIPPING].includes(body.orderStatus) || body.fulfillmentStatus === FulfillmentStatus.SHIPPED)) {
      throw new BadRequestException('Vui lòng dùng thao tác bàn giao vận chuyển để kiểm tra thanh toán và phương án giao quà');
    }
    if (body.orderStatus) order.orderStatus = body.orderStatus;
    if (body.fulfillmentStatus) order.fulfillmentStatus = body.fulfillmentStatus;
    if (body.paymentStatus) order.paymentStatus = body.paymentStatus;

    // Add event to timeline if fulfillment changed
    if (body.fulfillmentStatus) {
      order.timeline.push({
        title: `Cập nhật lộ trình: ${body.fulfillmentStatus}`,
        description: `Trạng thái xử lý xưởng chuyển sang: ${body.fulfillmentStatus}`,
        timestamp: new Date(),
        completed: true
      });
    }

    await order.save();
    return order;
  }

  // ==========================================
  // BP-04: THỰC THI ĐƠN HÀNG VÀ GIAO HÀNG
  // ==========================================

  async findOrderById(id: string) {
    let order: any = null;
    if (Types.ObjectId.isValid(id)) {
      order = await this.orderModel.findById(id).exec();
    }
    if (!order) {
      order = await this.orderModel.findOne({ orderCode: id.toUpperCase() }).exec();
    }
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng: ${id}`);
    }
    return order;
  }

  // US-04.01 – Xác nhận đơn hàng (BR-01, BR-02, BR-03, BR-04)
  async confirmOrder(id: string, user: any, bypassWaitTime: boolean = false) {
    const order = await this.findOrderById(id);

    if (
      order.orderStatus !== OrderStatus.AWAITING_CONFIRMATION &&
      order.orderStatus !== OrderStatus.PENDING
    ) {
      throw new BadRequestException(
        `Đơn hàng hiện ở trạng thái "${order.orderStatus}", không thể thực hiện xác nhận (chỉ áp dụng cho đơn "Chờ xác nhận đơn hàng" theo BR-04)`
      );
    }

    if (order.refundPending) throw new BadRequestException('Đơn đang chờ hoàn tiền, không thể xác nhận');

    // BR-02: Thời gian đơn hàng chờ xác nhận ít nhất sau 12 giờ và tối đa sau 48 giờ
    const now = Date.now();
    const eligibleTime = order.confirmationWait?.eligibleAt
      ? new Date(order.confirmationWait.eligibleAt).getTime()
      : new Date(order.createdAt).getTime() + 12 * 3600000;

    if (!bypassWaitTime && now < eligibleTime) {
      const remainingHours = ((eligibleTime - now) / 3600000).toFixed(1);
      throw new BadRequestException(
        `Đơn hàng đang trong thời gian chờ xác nhận (còn khoảng ${remainingHours}h nữa mới đạt tối thiểu 12h theo BR-02). Bạn có thể bật tùy chọn "Bỏ qua thời gian chờ (Bypass 12h)" để xác nhận ngay phục vụ kiểm thử và xử lý nhanh.`
      );
    }

    // BR-04: Cập nhật trạng thái thành "Đơn hàng đã được xác nhận" và trích xuất Order Items
    order.orderStatus = OrderStatus.CONFIRMED;
    order.fulfillmentStatus = FulfillmentStatus.CONFIRMED;
    if (!order.confirmationWait) {
      order.confirmationWait = {
        minWaitHours: 12,
        maxWaitHours: 48,
        eligibleAt: new Date(new Date(order.createdAt).getTime() + 12 * 3600000),
        deadlineAt: new Date(new Date(order.createdAt).getTime() + 48 * 3600000),
        confirmedAt: new Date(),
        confirmedBy: user?.name || 'Admin Quản lý đơn hàng'
      };
    } else {
      order.confirmationWait.confirmedAt = new Date();
      order.confirmationWait.confirmedBy = user?.name || 'Admin Quản lý đơn hàng';
    }

    giftNotice(order, 'ORDER_CONFIRMED', `Đơn quà ${order.orderCode} đã được xác nhận để chuẩn bị cho ${order.customerInfo.name}.`);
    // BR-05: Trích xuất thông tin Order Items và phân loại sản phẩm
    if (order.items && order.items.length > 0) {
      order.items = order.items.map((item: any) => {
        const itemObj = item.toObject ? item.toObject() : item;
        return {
          ...itemObj,
          itemType: itemObj.isCustom ? 'CUSTOM' : 'READY_MADE',
          status: itemObj.status || OrderItemStatus.PENDING
        };
      });
    }

    order.timeline.push({
      title: 'Đơn hàng đã được xác nhận (US-04.01, BR-04)',
      description: `Admin ${order.confirmationWait.confirmedBy} đã xác nhận đơn hàng. Hệ thống đã trích xuất Order Items để phân luồng xử lý: Ready-made Gift cho Admin lấy hàng, Custom Gift chuyển sang Xưởng sản xuất.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
  }

  // US-04.02 – Lấy Ready-made Gift (BR-05, BR-06)
  async pickReadyMadeItem(orderId: string, itemId: string, user: any) {
    const order = await this.findOrderById(orderId);

    if (order.orderStatus !== OrderStatus.CONFIRMED && order.orderStatus !== OrderStatus.PROCESSING) {
      throw new BadRequestException('Đơn hàng phải ở trạng thái "Đơn hàng đã được xác nhận" trước khi chuẩn bị sản phẩm (BR-04)!');
    }

    const itemIndex = order.items.findIndex((i: any) => (i._id && i._id.toString() === itemId) || (i.productId && i.productId.toString() === itemId));
    if (itemIndex === -1) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong đơn hàng');
    }

    const item = order.items[itemIndex];
    if (item.isCustom || item.itemType === 'CUSTOM') {
      throw new BadRequestException('Sản phẩm này là Custom Gift, cần được sản xuất và kiểm định tại Xưởng (US-04.03)!');
    }

    item.status = OrderItemStatus.PREPARED;
    item.preparedAt = new Date();
    item.preparedBy = user?.name || 'Admin Quản lý đơn hàng';

    order.timeline.push({
      title: `Đã lấy Ready-made Gift: ${item.productName} (US-04.02, BR-06)`,
      description: `Admin ${item.preparedBy} đã lấy sản phẩm có sẵn theo thông tin đơn hàng, sẵn sàng cho công đoạn đóng gói.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
  }

  // US-04.03 – Bắt đầu sản xuất Custom Gift (BR-05, BR-07)
  async startCustomItemProduction(orderId: string, itemId: string, user: any) {
    const order = await this.findOrderById(orderId);

    if (order.orderStatus !== OrderStatus.CONFIRMED && order.orderStatus !== OrderStatus.PROCESSING) {
      throw new BadRequestException('Đơn hàng phải ở trạng thái "Đơn hàng đã được xác nhận" trước khi sản xuất (BR-04)!');
    }

    const itemIndex = order.items.findIndex((i: any) => (i._id && i._id.toString() === itemId) || (i.productId && i.productId.toString() === itemId));
    if (itemIndex === -1) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong đơn hàng');
    }

    const item = order.items[itemIndex];
    if (!item.isCustom && item.itemType !== 'CUSTOM') {
      throw new BadRequestException('Sản phẩm này là Ready-made Gift, không qua bước sản xuất của Xưởng (BR-06)!');
    }

    item.status = OrderItemStatus.IN_PRODUCTION;
    giftNotice(order, 'PRODUCTION', `Món quà ${item.productName} đang được gia công theo thiết kế đã đặt.`);
    order.fulfillmentStatus = FulfillmentStatus.AT_WORKSHOP;

    order.timeline.push({
      title: `Bắt đầu sản xuất Custom Gift: ${item.productName} (US-04.03, BR-07)`,
      description: `Nhân viên sản xuất (${user?.name || 'Nghệ nhân xưởng'}) đã truy xuất cấu hình sản phẩm và tiến hành sản xuất/gia công theo yêu cầu đơn hàng.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
  }

  // US-04.03 & EF1 – Kiểm tra chất lượng và làm lại Custom Gift (BR-08)
  async inspectCustomItemQuality(
    orderId: string,
    itemId: string,
    body: { passed: boolean; note?: string; inspector?: string },
    user: any
  ) {
    const order = await this.findOrderById(orderId);

    const itemIndex = order.items.findIndex((i: any) => (i._id && i._id.toString() === itemId) || (i.productId && i.productId.toString() === itemId));
    if (itemIndex === -1) {
      throw new NotFoundException('Không tìm thấy sản phẩm trong đơn hàng');
    }

    const item = order.items[itemIndex];
    if (!item.isCustom && item.itemType !== 'CUSTOM') {
      throw new BadRequestException('Chỉ kiểm tra chất lượng đối với Custom Gift (BR-06, BR-08)!');
    }

    const inspector = body.inspector || user?.name || 'KCS Xưởng Giftory';
    item.qcHistory = item.qcHistory || [];

    if (body.passed) {
      item.status = OrderItemStatus.QC_PASSED;
      item.qcNote = body.note || 'Đạt tiêu chuẩn chất lượng xuất xưởng';
      item.qcHistory.push({
        result: 'PASSED',
        note: item.qcNote,
        timestamp: new Date(),
        inspector
      });

      order.timeline.push({
        title: `Kiểm tra chất lượng ĐẠT: ${item.productName} (US-04.03, BR-08)`,
        description: `Custom Gift đã được kiểm tra chất lượng và ĐẠT yêu cầu bởi ${inspector}. Sản phẩm sẵn sàng chuyển sang đóng gói.`,
        timestamp: new Date(),
        completed: true
      });
    } else {
      // EF1: Custom Gift không đạt kiểm tra chất lượng -> Làm lại
      item.status = OrderItemStatus.QC_FAILED;
      item.qcNote = body.note || 'Chưa đạt tiêu chuẩn hoàn thiện, chuyển gia công lại';
      item.qcHistory.push({
        result: 'FAILED',
        note: item.qcNote,
        timestamp: new Date(),
        inspector
      });

      order.timeline.push({
        title: `Kiểm tra chất lượng KHÔNG ĐẠT: ${item.productName} (EF1, BR-08)`,
        description: `Lý do: "${item.qcNote}". Nhân viên sản xuất thực hiện sản xuất/gia công lại và kiểm tra lại cho đến khi đáp ứng yêu cầu.`,
        timestamp: new Date(),
        completed: true
      });
    }

    await order.save();
    return order;
  }

  // US-04.04 – Đóng gói đơn hàng (BR-09)
  async packageOrder(orderId: string, user: any) {
    const order = await this.findOrderById(orderId);

    if (order.orderStatus !== OrderStatus.CONFIRMED && order.orderStatus !== OrderStatus.PROCESSING) {
      throw new BadRequestException('Chỉ thực hiện đóng gói khi đơn hàng đã được xác nhận (BR-04)!');
    }

    // BR-09: Admin chỉ đóng gói khi TẤT CẢ sản phẩm đã chuẩn bị đầy đủ và đạt yêu cầu
    const unreadyItems: string[] = [];
    for (const item of order.items) {
      if (item.isCustom || item.itemType === 'CUSTOM') {
        if (item.status !== OrderItemStatus.QC_PASSED) {
          unreadyItems.push(`Custom Gift: "${item.productName}" (Trạng thái: ${item.status || 'Chờ sản xuất'} - Chưa đạt QC)`);
        }
      } else {
        if (item.status !== OrderItemStatus.PREPARED) {
          unreadyItems.push(`Ready-made Gift: "${item.productName}" (Chưa lấy sản phẩm)`);
        }
      }
    }

    if (unreadyItems.length > 0) {
      throw new BadRequestException(
        `Không thể đóng gói theo quy tắc BR-09! Tất cả sản phẩm trong đơn hàng phải được chuẩn bị đầy đủ và đạt yêu cầu. Các sản phẩm chưa hoàn tất: \n- ${unreadyItems.join('\n- ')}`
      );
    }

    giftNotice(order, 'PACKAGED', `Món quà cho ${order.customerInfo.name} đã được gói, kèm ruy băng và thiệp chúc mừng.`);
    order.isPackaged = true;
    order.packagedAt = new Date();
    order.packagedBy = user?.name || 'Admin Quản lý đơn hàng';
    order.fulfillmentStatus = FulfillmentStatus.PACKAGED;

    order.timeline.push({
      title: 'Đã hoàn tất đóng gói đơn hàng (US-04.04, BR-09)',
      description: `Admin ${order.packagedBy} đã kiểm tra toàn bộ sản phẩm đạt yêu cầu và đóng hộp quà cẩn thận${order.greetingCard ? ` kèm thiệp ${order.greetingCard.templateName}` : ''}. Sẵn sàng bàn giao cho Shipper.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
  }

  // US-04.04 – Bàn giao cho Shipper (BR-10)
  async dispatchToShipper(
    orderId: string,
    body: { carrier?: string; trackingCode?: string; note?: string },
    user: any
  ) {
    const order = await this.findOrderById(orderId);

    requireGiftPrepaid(order);
    if (order.gift?.exception?.status === 'AWAITING_BUYER' || order.gift?.exception?.status === 'AWAITING_RECIPIENT') throw new BadRequestException('Đang chờ xác nhận thời gian giao lại từ người đặt/người nhận');
    // BR-10: Đơn chưa đóng gói thì không được bàn giao
    if (order.refundPending || [OrderStatus.CANCELLED, OrderStatus.DELIVERED, OrderStatus.RETURNED_BP06].includes(order.orderStatus)) throw new BadRequestException('Đơn không thể bàn giao vận chuyển');
    if (!order.isPackaged) {
      throw new BadRequestException('Đơn hàng chưa được đóng gói hoàn tất! Theo quy tắc BR-10, đơn hàng chỉ được bàn giao cho Shipper sau khi đã đóng gói xong.');
    }

    const carrier = body.carrier || order.shippingCarrier || 'Giao Hàng Tiết Kiệm (GHTK)';
    const trackingCode = body.trackingCode || order.trackingCode || `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`;

    giftNotice(order, 'IN_TRANSIT', `Món quà của bạn đang trên đường tới ${order.customerInfo.name}.`);
    order.orderStatus = OrderStatus.IN_TRANSIT;
    order.fulfillmentStatus = FulfillmentStatus.SHIPPED;
    order.shippingCarrier = carrier;
    order.trackingCode = trackingCode;

    order.deliveryInfo = {
      ...(order.deliveryInfo || {}),
      carrier,
      trackingCode,
      dispatchedAt: new Date(),
      deliveryAttempts: order.deliveryInfo?.deliveryAttempts || [],
      deliveryResult: 'PENDING',
      failureReason: '',
      allowRetry: true
    };

    order.timeline.push({
      title: 'Bàn giao cho Shipper - Trạng thái "In transit" (US-04.04, BR-10)',
      description: `Admin đã bàn giao kiện hàng cho Shipper (${carrier}). Mã vận đơn: ${trackingCode}. Thông tin giao hàng đã được chuyển sang Delivery Service.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
  }

  // US-04.05 & US-04.06 – Delivery Service giao hàng & xác định kết quả (BR-11, BR-12, BR-13, BR-14, BR-15)
  async reportDeliveryResult(
    orderId: string,
    body: {
      success: boolean;
      failureReason?: string;
      allowRetry?: boolean;
      note?: string;
      proofOfDelivery?: string;
    },
    user: any
  ) {
    const order = await this.findOrderById(orderId);

    if (typeof body.success !== 'boolean') throw new BadRequestException('Kết quả giao hàng phải là true hoặc false');
    if (order.orderStatus !== OrderStatus.IN_TRANSIT && order.orderStatus !== OrderStatus.SHIPPING) {
      throw new BadRequestException('Chỉ cập nhật kết quả giao hàng cho đơn hàng đang ở trạng thái "In transit" (BR-11)!');
    }

    if (!order.deliveryInfo) {
      order.deliveryInfo = {
        carrier: order.shippingCarrier || 'GHTK',
        trackingCode: order.trackingCode || '',
        dispatchedAt: new Date(),
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      };
    }

    if (body.success) {
      if (order.gift?.enabled) {
        if (typeof body.proofOfDelivery !== 'string' || !/^https:\/\//.test(body.proofOfDelivery) || body.proofOfDelivery.length > 2000) throw new BadRequestException('Đơn quà cần ảnh bằng chứng giao hàng (URL HTTPS)');
        order.gift.proofOfDelivery = body.proofOfDelivery;
        order.gift.exception = null;
        giftNotice(order, 'DELIVERED', `Món quà đã được giao thành công tới ${order.customerInfo.name}. Ảnh giao hàng: ${body.proofOfDelivery}`);
      }
      // US-04.05, BR-12: Giao hàng thành công
      order.deliveredAt = new Date();
      order.orderStatus = OrderStatus.DELIVERED;
      order.fulfillmentStatus = FulfillmentStatus.DELIVERED;
      order.deliveryInfo.deliveryResult = 'SUCCESS';

      order.timeline.push({
        title: 'Đã giao hàng thành công (US-04.05, BR-12)',
        description: 'Delivery Service xác nhận đã giao kiện hàng thành công đến tay người nhận. Đơn hàng hoàn tất quá trình giao hàng và kết thúc quy trình BP-04.',
        timestamp: new Date(),
        completed: true
      });
    } else {
      // US-04.06, BR-13: Giao hàng không thành công -> Bắt buộc ghi nhận lý do
      if (!body.failureReason || !body.failureReason.trim()) {
        throw new BadRequestException('Bắt buộc phải ghi nhận lý do giao hàng không thành công theo quy định BR-13!');
      }

      const attemptNum = (order.deliveryInfo.deliveryAttempts?.length || 0) + 1;
      order.deliveryInfo.deliveryAttempts.push({
        attemptNumber: attemptNum,
        timestamp: new Date(),
        success: false,
        failureReason: body.failureReason.trim(),
        allowRetry: !!body.allowRetry,
        note: body.note || ''
      });

      if (order.gift?.enabled) {
        order.deliveryInfo.allowRetry = true;
        order.gift.exception = { status: 'AWAITING_BUYER', reason: body.failureReason.trim(), raisedAt: new Date() };
        giftNotice(order, 'DELIVERY_EXCEPTION', `Chúng tôi không liên lạc được với người nhận ${order.customerInfo.name} hoặc người nhận từ chối nhận quà. Bạn vui lòng hỗ trợ liên hệ hoặc xác nhận khung giờ giao lại. Lý do: ${body.failureReason.trim()}`);
        order.timeline.push({ title: 'Chờ người đặt hỗ trợ giao quà', description: 'Giữ kiện quà tại đơn vị vận chuyển; không tự ý hủy hoặc trả hàng. Đang liên hệ người đặt để xác nhận giao lại.', timestamp: new Date(), completed: true });
      } else if (body.allowRetry) {
        // BR-14: Được phép giao lại -> Trạng thái vẫn là "In transit"
        order.orderStatus = OrderStatus.IN_TRANSIT;
        order.timeline.push({
          title: `Giao hàng không thành công lần ${attemptNum} - Hẹn giao lại (US-04.06, BR-14)`,
          description: `Lý do: "${body.failureReason.trim()}". Đơn hàng được phép giao lại, Delivery Service tiến hành giao lại cho khách hàng.`,
          timestamp: new Date(),
          completed: true
        });
      } else {
        // BR-15: Không được phép giao lại -> Trả hàng về Giftory
        order.fulfillmentStatus = FulfillmentStatus.RETURNING;
        order.deliveryInfo.deliveryResult = 'FAILED';
        order.deliveryInfo.failureReason = body.failureReason.trim();
        order.deliveryInfo.allowRetry = false;
        order.deliveryInfo.returnedAt = new Date();

        order.timeline.push({
          title: 'Giao hàng không thành công - Đang trả hàng về Giftory (US-04.06, BR-15, EF2)',
          description: `Lý do: "${body.failureReason.trim()}". Đơn hàng không được phép giao lại. Delivery Service thực hiện trả hàng về Giftory cho Admin tiếp nhận.`,
          timestamp: new Date(),
          completed: true
        });
      }
    }

    await order.save();
    if (body.success) {
      try { await this.care.delivered(order._id); }
      catch (error) { new Logger(OrdersService.name).error('Hậu mãi đang chờ tác vụ tự động thử lại', error.stack); }
    }
    return order;
  }

  // US-04.07 – Tiếp nhận hàng trả về từ Delivery Service (BR-15)
  async receiveReturnedOrder(orderId: string, user: any) {
    const order = await this.findOrderById(orderId);

    if (order.gift?.enabled && ['AWAITING_BUYER', 'AWAITING_RECIPIENT'].includes(order.gift.exception?.status)) throw new BadRequestException('Không được tự trả quà khi chưa xử lý ngoại lệ với người đặt');
    if (order.fulfillmentStatus !== FulfillmentStatus.RETURNING && !order.deliveryInfo?.returnedAt) {
      throw new BadRequestException('Chỉ tiếp nhận hàng trả về đối với đơn hàng Delivery Service đã xác nhận trả hàng (US-04.07)!');
    }

    order.fulfillmentStatus = FulfillmentStatus.RETURNED_RECEIVED;
    order.deliveryInfo.receivedReturnAt = new Date();

    order.timeline.push({
      title: 'Admin tiếp nhận hàng trả về tại kho Giftory (US-04.07, BR-15)',
      description: `Admin ${user?.name || 'Quản lý đơn hàng'} đã tiếp nhận hàng hoàn trả từ Shipper/Delivery Service tại kho Giftory. Sẵn sàng chuyển tiếp xử lý sang BP-06.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
  }

  // US-04.07 – Chuyển thông tin đơn hàng sang BP-06 (BR-16)
  async transferToBp06(orderId: string, body: { bp06Note?: string }, user: any) {
    const order = await this.findOrderById(orderId);

    if (
      order.fulfillmentStatus !== FulfillmentStatus.RETURNED_RECEIVED &&
      order.fulfillmentStatus !== FulfillmentStatus.RETURNING
    ) {
      throw new BadRequestException('Hàng phải được tiếp nhận tại kho trước khi chuyển sang BP-06 (US-04.07)!');
    }

    order.orderStatus = OrderStatus.RETURNED_BP06;
    order.fulfillmentStatus = FulfillmentStatus.TRANSFERRED_BP06;
    order.deliveryInfo.transferredToBp06At = new Date();
    order.deliveryInfo.bp06Note = body?.bp06Note || 'Chuyển thông tin xử lý đơn hàng hoàn trả và hoàn tiền/nhập kho';

    order.timeline.push({
      title: 'Chuyển thông tin đơn hàng sang BP-06 (US-04.07, BR-16)',
      description: `Admin đã chuyển thông tin đơn hàng sang BP-06 để tiếp tục xử lý theo quy trình tương ứng (Ghi chú: "${order.deliveryInfo.bp06Note}"). Quy trình BP-04 kết thúc.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    await this.care.transfer(order);
    return order;
  }
}

function normalizeVietnamPhone(value: string): string {
  return String(value || '').replace(/[\s().-]/g, '').replace(/^\+?84/, '0');
}

function hasDesignContent(details: any): boolean {
  if (!details || typeof details !== 'object') return false;
  const text = [details.frontMessage, details.backMessage, details.customText, details.message]
    .some(value => typeof value === 'string' && value.trim().length > 0);
  return text || !!details.uploadedImage || (Array.isArray(details.stickers) && details.stickers.length > 0)
    || (Array.isArray(details.textBlocks) && details.textBlocks.some((block: any) => typeof block?.text === 'string' && block.text.trim().length > 0))
    || (!!details.pattern && details.pattern !== 'none');
}

