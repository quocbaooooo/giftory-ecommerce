import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../database/schemas/order.schema';
import { Cart, CartDocument } from '../../database/schemas/cart.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { LoyaltyTransaction, LoyaltyTransactionDocument } from '../../database/schemas/loyalty-transaction.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderStatus,
  PaymentStatus,
  FulfillmentStatus,
  PaymentMode,
  PaymentMethod
} from '../../common/enums/role.enum';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(LoyaltyTransaction.name) private readonly loyaltyModel: Model<LoyaltyTransactionDocument>,
  ) {}

  async createOrder(dto: CreateOrderDto, userId?: string) {
    const query: any = {};
    if (userId) {
      query.userId = new Types.ObjectId(userId);
    } else if (dto.sessionId) {
      query.sessionId = dto.sessionId;
    } else {
      throw new BadRequestException('Không tìm thấy thông tin giỏ hàng');
    }

    const cart = await this.cartModel.findOne(query).populate('items.productId');
    if (!cart || !cart.items || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng không hợp lệ hoặc đang trống, không thể tạo đơn hàng');
    }

    let itemsTotal = 0;
    let customDeposit = 0;
    let hasCustomProduct = false;

    const orderItems = cart.items.map(item => {
      const product: any = item.productId;
      const unitPrice = item.price;
      const subtotal = unitPrice * item.quantity;
      itemsTotal += subtotal;

      const isCustom = item.isCustom || (product && product.isCustomizable);
      if (isCustom) hasCustomProduct = true;

      const depositRequired = isCustom ? Math.round(subtotal * 0.5) : 0;
      customDeposit += depositRequired;

      return {
        productId: product._id,
        productName: product.name,
        productImage: (product.images && product.images[0]) || '',
        variantName: item.variantName || 'Tiêu chuẩn',
        quantity: item.quantity,
        unitPrice,
        isCustom,
        customDetails: item.customDetails || null,
        depositRequired
      };
    });

    // BP-03 Rule: Free shipping for orders >= 250,000 VND (Standard)
    const shippingMethod = dto.shippingMethod || 'STANDARD';
    let shippingFee = 0;
    if (shippingMethod === 'EXPRESS') {
      shippingFee = 50000;
    } else {
      shippingFee = itemsTotal >= 250000 ? 0 : 30000;
    }

    const giftWrapFee = 0;
    const voucherDiscount = cart.voucherDiscount || 0;
    const totalAmount = Math.max(0, itemsTotal - voucherDiscount + shippingFee + giftWrapFee);

    // Calculate deposit requirement based on BP-03
    let depositAmount = 0;
    if (hasCustomProduct) {
      if (dto.paymentMethod === PaymentMethod.COD) {
        // Custom product + COD => 50% deposit required via QR (BR-03, AF2)
        depositAmount = Math.round(totalAmount * 0.5);
      } else {
        // Custom product + QR/Online => 100% payment (BR-03, AF2)
        depositAmount = totalAmount;
      }
    } else {
      if (dto.paymentMethod === PaymentMethod.COD) {
        // Standard product + COD => No online deposit required (BR-04, AF3)
        depositAmount = 0;
      } else {
        // Standard product + QR/Online => 100% payment (BR-04, AF4)
        depositAmount = totalAmount;
      }
    }

    const remainingCodAmount = Math.max(0, totalAmount - depositAmount);
    const orderCode = `GF-${Math.floor(100000 + Math.random() * 900000)}`;

    const isStandardCod = !hasCustomProduct && dto.paymentMethod === PaymentMethod.COD;

    const initialTimeline = [
      {
        title: 'Đơn hàng khởi tạo thành công',
        description: `Đơn hàng ${orderCode} đã được ghi nhận trên hệ thống Giftory.`,
        timestamp: new Date(),
        completed: true
      },
      {
        title: isStandardCod ? 'Ghi nhận đơn hàng COD Pending' : (hasCustomProduct ? 'Đặt cọc 50% & Chờ duyệt xưởng' : 'Thanh toán trực tuyến QR 100%'),
        description: isStandardCod
          ? 'Đơn hàng sản phẩm có sẵn sử dụng COD (COD Pending). Chuẩn bị chuyển đóng gói.'
          : (depositAmount > 0 
              ? `Cần thanh toán ${depositAmount.toLocaleString('vi-VN')}đ qua mã QR để chuyển thông tin xưởng chế tác.`
              : 'Đơn hàng sẵn sàng đóng gói.'),
        timestamp: new Date(),
        completed: isStandardCod
      },
      {
        title: hasCustomProduct ? 'Gia công & Chế tác tại Xưởng Giftory' : 'Đóng gói sản phẩm quà tặng',
        description: hasCustomProduct 
          ? 'Đội ngũ nghệ nhân tiến hành xử lý nhiệt, khắc laser vi điểm hoặc in UV chuyên dụng.'
          : 'Xịt tinh dầu hoa khô, niêm phong tem seal và đóng hộp quà.',
        timestamp: new Date(Date.now() + 6 * 60 * 60 * 1000),
        completed: false
      },
      {
        title: 'Bàn giao Shipper vận chuyển',
        description: `Đơn hàng giao qua ${shippingMethod === 'EXPRESS' ? 'Hỏa Tốc 2h - 48h' : 'Giao Hàng Tiêu Chuẩn'}.`,
        timestamp: new Date(Date.now() + 24 * 60 * 60 * 1000),
        completed: false
      }
    ];

    const initialPaymentStatus = isStandardCod 
      ? PaymentStatus.UNPAID // COD Pending
      : PaymentStatus.UNPAID;

    const order = await this.orderModel.create({
      orderCode,
      userId: userId ? new Types.ObjectId(userId) : undefined,
      customerInfo: dto.customerInfo,
      items: orderItems,
      pricing: {
        itemsTotal,
        voucherDiscount,
        shippingFee,
        giftWrapFee,
        totalAmount,
        depositAmount,
        remainingCodAmount
      },
      paymentMode: depositAmount < totalAmount ? PaymentMode.DEPOSIT_50 : PaymentMode.FULL_PAYMENT,
      paymentMethod: dto.paymentMethod,
      paymentStatus: initialPaymentStatus,
      orderStatus: isStandardCod ? OrderStatus.PENDING : OrderStatus.CONFIRMED,
      fulfillmentStatus: isStandardCod ? FulfillmentStatus.PACKAGED : (hasCustomProduct ? FulfillmentStatus.AWAITING_DEPOSIT : FulfillmentStatus.AT_WORKSHOP),
      timeline: initialTimeline,
      trackingCode: `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      shippingCarrier: shippingMethod === 'EXPRESS' ? 'Giao Hàng Hỏa Tốc (2h - 48h)' : 'Giao Hàng Tiêu Chuẩn'
    });

    // Reward Loyalty Points if registered user (1 point per 10k VND)
    if (userId) {
      const earnedPoints = Math.floor(totalAmount / 10000);
      const user = await this.userModel.findById(userId);
      if (user) {
        user.loyaltyPoints += earnedPoints;
        await user.save();

        await this.loyaltyModel.create({
          userId: user._id,
          type: 'EARN',
          points: earnedPoints,
          balanceAfter: user.loyaltyPoints,
          description: `Tích điểm từ đơn hàng ${orderCode}`,
          referenceId: orderCode
        });
      }
    }

    // Clear cart items
    cart.items = [];
    cart.voucherCode = '';
    cart.voucherDiscount = 0;
    await cart.save();

    return order;
  }

  async processPaymentSimulation(orderCode: string, body: { success: boolean; paymentType?: 'DEPOSIT_50' | 'FULL_100' }) {
    const order = await this.orderModel.findOne({ orderCode: orderCode.toUpperCase() });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng mã ${orderCode}`);
    }

    if (!body.success) {
      order.timeline.push({
        title: 'Thanh toán qua Payment Gateway thất bại',
        description: 'Giao dịch thanh toán trực tuyến không thành công. Vui lòng thực hiện lại.',
        timestamp: new Date(),
        completed: false
      });
      await order.save();
      throw new BadRequestException('Giao dịch thanh toán trực tuyến không thành công. Vui lòng thực hiện lại giao dịch (EF1).');
    }

    // Payment Success
    const isFull = body.paymentType === 'FULL_100' || order.pricing.depositAmount === order.pricing.totalAmount;
    order.paymentStatus = isFull ? PaymentStatus.PAID_FULL : PaymentStatus.PARTIALLY_PAID_DEPOSIT_50;
    order.fulfillmentStatus = FulfillmentStatus.AT_WORKSHOP;

    if (order.timeline && order.timeline.length > 1) {
      order.timeline[1].completed = true;
      order.timeline[1].title = isFull ? 'Đã thanh toán 100%' : 'Đã cọc 50% thành công';
      order.timeline[1].description = `Đã nhận ${order.pricing.depositAmount.toLocaleString('vi-VN')}đ qua Payment Gateway VietQR/MoMo/VNPAY.`;
    }

    order.timeline.push({
      title: 'Payment Gateway xác nhận giao dịch',
      description: `Giao dịch ${order.paymentStatus === PaymentStatus.PAID_FULL ? 'Thanh toán 100%' : 'Đặt cọc 50%'} hoàn tất thành công.`,
      timestamp: new Date(),
      completed: true
    });

    await order.save();
    return order;
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

  async getOrderByCode(orderCode: string) {
    const order = await this.orderModel.findOne({ orderCode: orderCode.toUpperCase() }).exec();
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng mã: ${orderCode}`);
    }
    return order;
  }

  async cancelOrder(orderId: string, userId?: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    if (userId && order.userId && order.userId.toString() !== userId) {
      throw new BadRequestException('Bạn không có quyền hủy đơn hàng này');
    }

    if (order.fulfillmentStatus === FulfillmentStatus.AT_WORKSHOP && order.pricing.depositAmount > 0) {
      throw new BadRequestException('Đơn hàng có sản phẩm custom đã đưa vào xưởng chế tác, không thể tự hủy');
    }

    order.orderStatus = OrderStatus.CANCELLED;
    await order.save();
    return order;
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
}

