import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../../database/schemas/order.schema';
import { Cart, CartDocument } from '../../database/schemas/cart.schema';
import { User, UserDocument } from '../../database/schemas/user.schema';
import { Product, ProductDocument } from '../../database/schemas/product.schema';
import { LoyaltyTransaction, LoyaltyTransactionDocument } from '../../database/schemas/loyalty-transaction.schema';
import { CreateOrderDto } from './dto/create-order.dto';
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
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(LoyaltyTransaction.name) private readonly loyaltyModel: Model<LoyaltyTransactionDocument>,
  ) {}

  async createOrder(dto: CreateOrderDto, userId?: string) {
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
      let unitPrice = product.price;

      if (dto.buyNowItem.variantName && product.variants?.length) {
        const matchedVariant = product.variants.find(v => v.name === dto.buyNowItem.variantName);
        if (matchedVariant && matchedVariant.price) {
          unitPrice = matchedVariant.price;
        }
      }

      const subtotal = unitPrice * qty;
      itemsTotal = subtotal;

      const isCustom = product.isCustomizable || !!dto.buyNowItem.customDetails;
      if (isCustom) hasCustomProduct = true;

      const depositRequired = isCustom ? Math.round(subtotal * 0.5) : 0;
      customDeposit = depositRequired;

      orderItems = [{
        productId: product._id,
        productName: product.name,
        productImage: (product.images && product.images[0]) || '',
        variantName: dto.buyNowItem.variantName || 'Tiêu chuẩn',
        quantity: qty,
        unitPrice,
        isCustom,
        itemType: isCustom ? 'CUSTOM' : 'READY_MADE',
        status: OrderItemStatus.PENDING,
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

      voucherDiscount = cart.voucherDiscount || 0;

      orderItems = cart.items.map(item => {
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
          itemType: isCustom ? 'CUSTOM' : 'READY_MADE',
          status: OrderItemStatus.PENDING,
          customDetails: item.customDetails || null,
          depositRequired
        };
      });
    }

    // BP-03 Rule: Free shipping for orders >= 250,000 VND (Standard)
    const shippingMethod = dto.shippingMethod || 'STANDARD';
    let shippingFee = 0;
    if (shippingMethod === 'EXPRESS') {
      shippingFee = 50000;
    } else {
      shippingFee = itemsTotal >= 250000 ? 0 : 30000;
    }

    const giftWrapFee = 0;
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
      orderStatus: OrderStatus.AWAITING_CONFIRMATION,
      fulfillmentStatus: FulfillmentStatus.AWAITING_CONFIRMATION,
      timeline: initialTimeline,
      trackingCode: `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`,
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
        trackingCode: `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`,
        deliveryAttempts: [],
        deliveryResult: 'PENDING',
        failureReason: '',
        allowRetry: true
      }
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

    // Clear cart items ONLY for regular cart orders (preserve cart for Buy Now)
    if (!dto.buyNowItem && cart) {
      cart.items = [];
      cart.voucherCode = '';
      cart.voucherDiscount = 0;
      await cart.save();
    }

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

    order.isPackaged = true;
    order.packagedAt = new Date();
    order.packagedBy = user?.name || 'Admin Quản lý đơn hàng';
    order.fulfillmentStatus = FulfillmentStatus.PACKAGED;

    order.timeline.push({
      title: 'Đã hoàn tất đóng gói đơn hàng (US-04.04, BR-09)',
      description: `Admin ${order.packagedBy} đã kiểm tra toàn bộ sản phẩm đạt yêu cầu và đóng hộp quà cẩn thận kèm thiệp. Sẵn sàng bàn giao cho Shipper.`,
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

    // BR-10: Đơn chưa đóng gói thì không được bàn giao
    if (!order.isPackaged) {
      throw new BadRequestException('Đơn hàng chưa được đóng gói hoàn tất! Theo quy tắc BR-10, đơn hàng chỉ được bàn giao cho Shipper sau khi đã đóng gói xong.');
    }

    const carrier = body.carrier || order.shippingCarrier || 'Giao Hàng Tiết Kiệm (GHTK)';
    const trackingCode = body.trackingCode || order.trackingCode || `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`;

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
    },
    user: any
  ) {
    const order = await this.findOrderById(orderId);

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
      // US-04.05, BR-12: Giao hàng thành công
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

      if (body.allowRetry) {
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
    return order;
  }

  // US-04.07 – Tiếp nhận hàng trả về từ Delivery Service (BR-15)
  async receiveReturnedOrder(orderId: string, user: any) {
    const order = await this.findOrderById(orderId);

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
    return order;
  }
}

