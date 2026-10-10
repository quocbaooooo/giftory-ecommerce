import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { Order, OrderDocument } from './schemas/order.schema';
import { UserRole, OrderStatus, PaymentStatus, FulfillmentStatus, PaymentMode, PaymentMethod, OrderItemStatus } from '../common/enums/role.enum';

async function bootstrap() {
  console.log('--- 🔄 Bắt đầu chạy Migration an toàn cho BP-04 (KHÔNG xóa dữ liệu cũ) ---');
  const app = await NestFactory.createApplicationContext(AppModule);

  const userModel = app.get<Model<UserDocument>>(getModelToken(User.name));
  const productModel = app.get<Model<ProductDocument>>(getModelToken(Product.name));
  const orderModel = app.get<Model<OrderDocument>>(getModelToken(Order.name));

  // 1. Cập nhật các đơn hàng hiện có để đảm bảo đầy đủ các trường BP-04
  const existingOrders = await orderModel.find().exec();
  console.log(`📦 Tìm thấy ${existingOrders.length} đơn hàng hiện có trong hệ thống.`);

  let updatedCount = 0;
  for (const order of existingOrders) {
    let modified = false;

    // Bổ sung confirmationWait nếu thiếu
    if (!order.confirmationWait) {
      const createdTime = (order as any).createdAt ? new Date((order as any).createdAt).getTime() : Date.now();
      order.confirmationWait = {
        minWaitHours: 12,
        maxWaitHours: 48,
        eligibleAt: new Date(createdTime + 12 * 3600000),
        deadlineAt: new Date(createdTime + 48 * 3600000),
        confirmedAt: order.orderStatus !== OrderStatus.AWAITING_CONFIRMATION && order.orderStatus !== OrderStatus.PENDING ? new Date(createdTime + 14 * 3600000) : null,
        confirmedBy: order.orderStatus !== OrderStatus.AWAITING_CONFIRMATION && order.orderStatus !== OrderStatus.PENDING ? 'Admin Quản lý đơn hàng' : ''
      };
      modified = true;
    }

    // Bổ sung deliveryInfo nếu thiếu
    if (!order.deliveryInfo) {
      order.deliveryInfo = {
        carrier: order.shippingCarrier || 'Giao Hàng Tiết Kiệm (GHTK)',
        trackingCode: order.trackingCode || `GHTK-VN-${Math.floor(1000000 + Math.random() * 9000000)}`,
        dispatchedAt: order.orderStatus === OrderStatus.IN_TRANSIT || order.orderStatus === OrderStatus.DELIVERED ? new Date() : null,
        deliveryAttempts: [],
        deliveryResult: order.orderStatus === OrderStatus.DELIVERED ? 'SUCCESS' : 'PENDING',
        failureReason: '',
        allowRetry: true
      };
      modified = true;
    }

    // Bổ sung itemType và status cho items
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        if (!item.itemType) {
          item.itemType = item.isCustom ? 'CUSTOM' : 'READY_MADE';
          modified = true;
        }
        if (!item.status) {
          if (order.orderStatus === OrderStatus.DELIVERED || order.fulfillmentStatus === FulfillmentStatus.DELIVERED) {
            item.status = item.isCustom ? OrderItemStatus.QC_PASSED : OrderItemStatus.PREPARED;
          } else if (order.isPackaged || order.fulfillmentStatus === FulfillmentStatus.PACKAGED) {
            item.status = item.isCustom ? OrderItemStatus.QC_PASSED : OrderItemStatus.PREPARED;
          } else if (order.orderStatus === OrderStatus.CONFIRMED) {
            item.status = item.isCustom ? OrderItemStatus.IN_PRODUCTION : OrderItemStatus.PREPARED;
          } else {
            item.status = OrderItemStatus.PENDING;
          }
          modified = true;
        }
      }
    }

    if (modified) {
      await order.save();
      updatedCount++;
    }
  }
  console.log(`✅ Đã đồng bộ chuẩn BP-04 cho ${updatedCount} đơn hàng hiện tại.`);

  // 2. Thêm các đơn hàng mẫu đặc trưng của BP-04 (nếu chưa tồn tại, dùng upsert an toàn theo orderCode)
  const [firstUser, customProduct, standardProduct] = await Promise.all([
    userModel.findOne({ role: UserRole.CUSTOMER }).exec() || userModel.findOne().exec(),
    productModel.findOne({ isCustomizable: true }).exec() || productModel.findOne().exec(),
    productModel.findOne({ isCustomizable: false }).exec() || productModel.findOne().exec()
  ]);

  if (firstUser && (customProduct || standardProduct)) {
    const prodCust = customProduct || standardProduct;
    const prodStd = standardProduct || customProduct;

    const bp04SampleOrders = [
      // Đơn 1: Chờ xác nhận (< 12h)
      {
        orderCode: 'GF-104001',
        userId: firstUser._id,
        customerInfo: {
          name: firstUser.name || 'Nguyễn Minh Anh',
          phone: firstUser.phone || '0901112233',
          email: firstUser.email || 'customer@giftory.vn',
          address: 'Số 15 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM',
          note: 'Giao giờ hành chính, gọi trước 15 phút'
        },
        items: [{
          productId: prodCust._id,
          productName: prodCust.name,
          productImage: prodCust.images ? prodCust.images[0] : '',
          variantName: 'Navy Blue',
          quantity: 1,
          unitPrice: prodCust.price || 250000,
          isCustom: true,
          itemType: 'CUSTOM',
          status: OrderItemStatus.PENDING,
          customDetails: { frontMessage: 'Happy Birthday My Love ❤️', fontFamily: 'Signature', engraveColor: 'Gold' },
          depositRequired: Math.round((prodCust.price || 250000) * 0.5)
        }],
        pricing: {
          itemsTotal: prodCust.price || 250000,
          voucherDiscount: 0,
          shippingFee: 0,
          giftWrapFee: 0,
          totalAmount: prodCust.price || 250000,
          depositAmount: Math.round((prodCust.price || 250000) * 0.5),
          remainingCodAmount: Math.round((prodCust.price || 250000) * 0.5)
        },
        paymentMode: PaymentMode.DEPOSIT_50,
        paymentMethod: PaymentMethod.VIETQR,
        paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
        orderStatus: OrderStatus.AWAITING_CONFIRMATION,
        fulfillmentStatus: FulfillmentStatus.AWAITING_CONFIRMATION,
        confirmationWait: {
          minWaitHours: 12,
          maxWaitHours: 48,
          eligibleAt: new Date(Date.now() + 10 * 3600000), // Còn 10h nữa
          deadlineAt: new Date(Date.now() + 46 * 3600000),
          confirmedAt: null,
          confirmedBy: ''
        },
        isPackaged: false,
        deliveryInfo: {
          carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
          trackingCode: 'GHTK-VN-8821941',
          deliveryAttempts: [],
          deliveryResult: 'PENDING',
          failureReason: '',
          allowRetry: true
        },
        shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
        timeline: [
          { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Đơn hàng được ghi nhận ở trạng thái "Chờ xác nhận đơn hàng".', timestamp: new Date(Date.now() - 2 * 3600000), completed: true },
          { title: 'Đang trong thời gian chờ xác nhận (BR-02)', description: 'Thời gian chờ ít nhất sau 12 giờ và tối đa 48 giờ. Bộ đếm đang kích hoạt.', timestamp: new Date(Date.now() - 2 * 3600000), completed: false }
        ]
      },
      // Đơn 2: Chờ xác nhận (>= 12h, ĐỦ ĐIỀU KIỆN XÁC NHẬN)
      {
        orderCode: 'GF-104002',
        userId: firstUser._id,
        customerInfo: {
          name: 'Trần Thuý Hường',
          phone: '0902223344',
          email: 'thuyhuong@gmail.com',
          address: 'Tòa nhà Landmark 81, 720A Điện Biên Phủ, Bình Thạnh, TP.HCM',
          note: 'Đơn quà tặng kỷ niệm ngày cưới'
        },
        items: [{
          productId: prodStd._id,
          productName: prodStd.name,
          productImage: prodStd.images ? prodStd.images[0] : '',
          variantName: 'Tiêu chuẩn',
          quantity: 2,
          unitPrice: prodStd.price || 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PENDING,
          depositRequired: 0
        }],
        pricing: {
          itemsTotal: (prodStd.price || 215000) * 2,
          voucherDiscount: 30000,
          shippingFee: 0,
          giftWrapFee: 0,
          totalAmount: (prodStd.price || 215000) * 2 - 30000,
          depositAmount: (prodStd.price || 215000) * 2 - 30000,
          remainingCodAmount: 0
        },
        paymentMode: PaymentMode.FULL_PAYMENT,
        paymentMethod: PaymentMethod.VIETQR,
        paymentStatus: PaymentStatus.PAID_FULL,
        orderStatus: OrderStatus.AWAITING_CONFIRMATION,
        fulfillmentStatus: FulfillmentStatus.AWAITING_CONFIRMATION,
        confirmationWait: {
          minWaitHours: 12,
          maxWaitHours: 48,
          eligibleAt: new Date(Date.now() - 4 * 3600000), // Đã đủ 12h từ 4 tiếng trước!
          deadlineAt: new Date(Date.now() + 32 * 3600000),
          confirmedAt: null,
          confirmedBy: ''
        },
        isPackaged: false,
        deliveryInfo: {
          carrier: 'Giao Hàng Nhanh Hỏa Tốc',
          trackingCode: 'GHN-VN-4402195',
          deliveryAttempts: [],
          deliveryResult: 'PENDING',
          failureReason: '',
          allowRetry: true
        },
        shippingCarrier: 'Giao Hàng Nhanh Hỏa Tốc (2h - 48h)',
        timeline: [
          { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Đơn hàng được ghi nhận ở trạng thái "Chờ xác nhận đơn hàng".', timestamp: new Date(Date.now() - 16 * 3600000), completed: true },
          { title: 'Đã hoàn thành thời gian chờ tối thiểu 12h (BR-02)', description: 'Đơn hàng đủ điều kiện để Admin Quản lý đơn hàng xác nhận.', timestamp: new Date(Date.now() - 4 * 3600000), completed: true }
        ]
      },
      // Đơn 3: Đã xác nhận, trích xuất items gồm Ready-made & Custom (US-04.01, BR-04, BR-05)
      {
        orderCode: 'GF-104003',
        userId: firstUser._id,
        customerInfo: {
          name: 'Lê Quốc Dũng',
          phone: '0903334455',
          email: 'quocdung@gmail.com',
          address: 'Số 88 Trần Phú, Quận Hải Châu, Đà Nẵng',
          note: 'Cốc sứ khắc chữ vàng, nến thơm gói nơ satin đỏ'
        },
        items: [
          {
            productId: prodCust._id,
            productName: prodCust.name,
            productImage: prodCust.images ? prodCust.images[0] : '',
            variantName: 'Xanh Matcha',
            quantity: 1,
            unitPrice: prodCust.price || 350000,
            isCustom: true,
            itemType: 'CUSTOM',
            status: OrderItemStatus.PENDING,
            customDetails: { frontMessage: 'Khắc Tên: Thùy Trang - 2026', fontFamily: 'Serif', engraveColor: 'Gold' },
            depositRequired: Math.round((prodCust.price || 350000) * 0.5)
          },
          {
            productId: prodStd._id,
            productName: prodStd.name,
            productImage: prodStd.images ? prodStd.images[0] : '',
            variantName: 'Gỗ Thông & Lavender',
            quantity: 1,
            unitPrice: prodStd.price || 215000,
            isCustom: false,
            itemType: 'READY_MADE',
            status: OrderItemStatus.PENDING,
            depositRequired: 0
          }
        ],
        pricing: {
          itemsTotal: (prodCust.price || 350000) + (prodStd.price || 215000),
          voucherDiscount: 50000,
          shippingFee: 0,
          giftWrapFee: 0,
          totalAmount: (prodCust.price || 350000) + (prodStd.price || 215000) - 50000,
          depositAmount: Math.round((prodCust.price || 350000) * 0.5),
          remainingCodAmount: (prodCust.price || 350000) + (prodStd.price || 215000) - 50000 - Math.round((prodCust.price || 350000) * 0.5)
        },
        paymentMode: PaymentMode.DEPOSIT_50,
        paymentMethod: PaymentMethod.MOMO,
        paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
        orderStatus: OrderStatus.CONFIRMED,
        fulfillmentStatus: FulfillmentStatus.CONFIRMED,
        confirmationWait: {
          minWaitHours: 12,
          maxWaitHours: 48,
          eligibleAt: new Date(Date.now() - 14 * 3600000),
          deadlineAt: new Date(Date.now() + 20 * 3600000),
          confirmedAt: new Date(Date.now() - 3 * 3600000),
          confirmedBy: 'Admin Hoàng Nam'
        },
        isPackaged: false,
        deliveryInfo: {
          carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
          trackingCode: 'GHTK-VN-5509214',
          deliveryAttempts: [],
          deliveryResult: 'PENDING',
          failureReason: '',
          allowRetry: true
        },
        shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
        timeline: [
          { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn "Chờ xác nhận đơn hàng".', timestamp: new Date(Date.now() - 20 * 3600000), completed: true },
          { title: 'Đơn hàng đã được xác nhận (US-04.01, BR-04)', description: 'Admin Hoàng Nam xác nhận đơn. Trích xuất thông tin Order Items: 1 Ready-made Gift và 1 Custom Gift.', timestamp: new Date(Date.now() - 3 * 3600000), completed: true }
        ]
      },
      // Đơn 4: Đã đóng gói hoàn tất (US-04.04, BR-09)
      {
        orderCode: 'GF-104005',
        userId: firstUser._id,
        customerInfo: {
          name: 'Vũ Hoàng Quân',
          phone: '0905556677',
          email: 'hoangquan@gmail.com',
          address: 'Căn hộ Riverpark, Phú Mỹ Hưng, Quận 7, TP.HCM',
          note: 'Đóng hộp nơ nhung cao cấp'
        },
        items: [{
          productId: prodStd._id,
          productName: prodStd.name,
          productImage: prodStd.images ? prodStd.images[0] : '',
          variantName: 'Gỗ Thông & Lavender',
          quantity: 1,
          unitPrice: prodStd.price || 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PREPARED,
          preparedAt: new Date(Date.now() - 5 * 3600000),
          preparedBy: 'Admin Hoàng Nam',
          depositRequired: 0
        }],
        pricing: {
          itemsTotal: prodStd.price || 215000,
          voucherDiscount: 0,
          shippingFee: 30000,
          giftWrapFee: 0,
          totalAmount: (prodStd.price || 215000) + 30000,
          depositAmount: (prodStd.price || 215000) + 30000,
          remainingCodAmount: 0
        },
        paymentMode: PaymentMode.FULL_PAYMENT,
        paymentMethod: PaymentMethod.VIETQR,
        paymentStatus: PaymentStatus.PAID_FULL,
        orderStatus: OrderStatus.CONFIRMED,
        fulfillmentStatus: FulfillmentStatus.PACKAGED,
        isPackaged: true,
        packagedAt: new Date(Date.now() - 2 * 3600000),
        packagedBy: 'Admin Hoàng Nam',
        deliveryInfo: {
          carrier: 'Giao Hàng Tiết Kiệm (GHTK)',
          trackingCode: 'GHTK-VN-7703921',
          deliveryAttempts: [],
          deliveryResult: 'PENDING',
          failureReason: '',
          allowRetry: true
        },
        shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
        timeline: [
          { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn.', timestamp: new Date(Date.now() - 30 * 3600000), completed: true },
          { title: 'Đơn hàng đã được xác nhận (US-04.01)', description: 'Xác nhận đơn thành công.', timestamp: new Date(Date.now() - 10 * 3600000), completed: true },
          { title: 'Đã lấy Ready-made Gift (US-04.02)', description: 'Admin đã lấy sản phẩm có sẵn.', timestamp: new Date(Date.now() - 5 * 3600000), completed: true },
          { title: 'Đã hoàn tất đóng gói đơn hàng (US-04.04, BR-09)', description: 'Admin Hoàng Nam đã đóng gói hộp quà, sẵn sàng bàn giao cho Shipper.', timestamp: new Date(Date.now() - 2 * 3600000), completed: true }
        ]
      },
      // Đơn 5: In transit (US-04.04, US-04.05, BR-10, BR-11)
      {
        orderCode: 'GF-104006',
        userId: firstUser._id,
        customerInfo: {
          name: 'Đặng Mai Linh',
          phone: '0906667788',
          email: 'mailinh@gmail.com',
          address: 'Số 12 Bà Triệu, Phường Tràng Tiền, Quận Hoàn Kiếm, Hà Nội',
          note: 'Giao sáng trước 11h'
        },
        items: [{
          productId: prodCust._id,
          productName: prodCust.name,
          productImage: prodCust.images ? prodCust.images[0] : '',
          variantName: 'Xanh Matcha',
          quantity: 1,
          unitPrice: prodCust.price || 350000,
          isCustom: true,
          itemType: 'CUSTOM',
          status: OrderItemStatus.QC_PASSED,
          depositRequired: Math.round((prodCust.price || 350000) * 0.5)
        }],
        pricing: {
          itemsTotal: prodCust.price || 350000,
          voucherDiscount: 0,
          shippingFee: 30000,
          giftWrapFee: 0,
          totalAmount: (prodCust.price || 350000) + 30000,
          depositAmount: Math.round((prodCust.price || 350000) * 0.5),
          remainingCodAmount: (prodCust.price || 350000) + 30000 - Math.round((prodCust.price || 350000) * 0.5)
        },
        paymentMode: PaymentMode.DEPOSIT_50,
        paymentMethod: PaymentMethod.MOMO,
        paymentStatus: PaymentStatus.PARTIALLY_PAID_DEPOSIT_50,
        orderStatus: OrderStatus.IN_TRANSIT,
        fulfillmentStatus: FulfillmentStatus.SHIPPED,
        isPackaged: true,
        packagedAt: new Date(Date.now() - 14 * 3600000),
        packagedBy: 'Admin Hoàng Nam',
        trackingCode: 'GHTK-VN-9941203',
        shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
        deliveryInfo: {
          carrier: 'Giao Hàng Tiết Kiệm Express',
          trackingCode: 'GHTK-VN-9941203',
          dispatchedAt: new Date(Date.now() - 10 * 3600000),
          deliveryAttempts: [],
          deliveryResult: 'PENDING',
          failureReason: '',
          allowRetry: true
        },
        timeline: [
          { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn.', timestamp: new Date(Date.now() - 48 * 3600000), completed: true },
          { title: 'Đơn hàng đã được xác nhận (US-04.01)', description: 'Xác nhận đơn thành công.', timestamp: new Date(Date.now() - 30 * 3600000), completed: true },
          { title: 'Hoàn tất sản xuất và đạt kiểm định QC (US-04.03)', description: 'QC Passed.', timestamp: new Date(Date.now() - 20 * 3600000), completed: true },
          { title: 'Đóng gói hoàn tất (US-04.04, BR-09)', description: 'Đã đóng hộp quà.', timestamp: new Date(Date.now() - 14 * 3600000), completed: true },
          { title: 'Bàn giao cho Shipper - "In transit" (US-04.04, BR-10)', description: 'Bàn giao GHTK Express. Mã vận đơn: GHTK-VN-9941203. Đang chuyển tới người nhận.', timestamp: new Date(Date.now() - 10 * 3600000), completed: true }
        ]
      },
      // Đơn 6: Trả hàng về Giftory (US-04.06, BR-15, EF2)
      {
        orderCode: 'GF-104007',
        userId: firstUser._id,
        customerInfo: {
          name: 'Trần Văn Long',
          phone: '0977889900',
          email: 'vanlong@gmail.com',
          address: 'Số 102 Nguyễn Đình Chiểu, Phường 6, Quận 3, TP.HCM',
          note: 'Giao chiều sau 16h'
        },
        items: [{
          productId: prodStd._id,
          productName: prodStd.name,
          productImage: prodStd.images ? prodStd.images[0] : '',
          variantName: 'Gỗ Thông & Lavender',
          quantity: 1,
          unitPrice: prodStd.price || 215000,
          isCustom: false,
          itemType: 'READY_MADE',
          status: OrderItemStatus.PREPARED,
          depositRequired: 0
        }],
        pricing: {
          itemsTotal: prodStd.price || 215000,
          voucherDiscount: 0,
          shippingFee: 30000,
          giftWrapFee: 0,
          totalAmount: (prodStd.price || 215000) + 30000,
          depositAmount: 0,
          remainingCodAmount: (prodStd.price || 215000) + 30000
        },
        paymentMode: PaymentMode.FULL_PAYMENT,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.UNPAID,
        orderStatus: OrderStatus.IN_TRANSIT,
        fulfillmentStatus: FulfillmentStatus.RETURNING,
        isPackaged: true,
        packagedAt: new Date(Date.now() - 40 * 3600000),
        packagedBy: 'Admin Hoàng Nam',
        trackingCode: 'GHTK-VN-8833910',
        shippingCarrier: 'Giao Hàng Tiết Kiệm Express',
        deliveryInfo: {
          carrier: 'Giao Hàng Tiết Kiệm Express',
          trackingCode: 'GHTK-VN-8833910',
          dispatchedAt: new Date(Date.now() - 36 * 3600000),
          deliveryAttempts: [
            { attemptNumber: 1, timestamp: new Date(Date.now() - 24 * 3600000), success: false, failureReason: 'Khách không nghe máy (3 cuộc gọi)', allowRetry: true, note: 'Hẹn giao lại ngày mai' },
            { attemptNumber: 2, timestamp: new Date(Date.now() - 6 * 3600000), success: false, failureReason: 'Khách từ chối nhận hàng do đổi ý', allowRetry: false, note: 'Khách xác nhận không nhận nữa' }
          ],
          deliveryResult: 'FAILED',
          failureReason: 'Khách từ chối nhận hàng do đổi ý',
          allowRetry: false,
          returnedAt: new Date(Date.now() - 5 * 3600000)
        },
        timeline: [
          { title: 'Tiếp nhận đơn hàng từ BP-03 (BR-01)', description: 'Ghi nhận đơn COD.', timestamp: new Date(Date.now() - 60 * 3600000), completed: true },
          { title: 'Bàn giao cho Shipper - "In transit" (BR-10)', description: 'Bàn giao GHTK Express.', timestamp: new Date(Date.now() - 36 * 3600000), completed: true },
          { title: 'Giao không thành công lần 1 (BR-14)', description: 'Khách không nghe máy. Cho phép giao lại.', timestamp: new Date(Date.now() - 24 * 3600000), completed: true },
          { title: 'Giao hàng không thành công - Đang trả hàng về Giftory (US-04.06, BR-15, EF2)', description: 'Lý do: "Khách từ chối nhận hàng do đổi ý". Không được phép giao lại, Delivery Service chuyển hàng trả về kho Giftory.', timestamp: new Date(Date.now() - 5 * 3600000), completed: true }
        ]
      }
    ];

    let insertedSamples = 0;
    for (const sample of bp04SampleOrders) {
      const exists = await orderModel.findOne({ orderCode: sample.orderCode });
      if (!exists) {
        await orderModel.create(sample);
        insertedSamples++;
      }
    }
    console.log(`✅ Đã thêm an toàn ${insertedSamples} đơn hàng mẫu phục vụ trải nghiệm quy trình BP-04 mà không làm mất bất kỳ dữ liệu hiện tại nào!`);
  }

  console.log('--- 🎉 HOÀN TẤT MIGRATION AN TOÀN CHO BP-04! ---');
  await app.close();
  process.exit(0);
}

bootstrap().catch(err => {
  console.error('Lỗi migration:', err);
  process.exit(1);
});
