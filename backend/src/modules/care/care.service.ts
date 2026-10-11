import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Connection, Model, Types } from 'mongoose';
import {
  canCancel,
  paidAmount,
  reviewDueAt,
  supportAvailability,
  requiredText,
  attachmentMime,
} from './care.rules';

@Injectable()
export class CareService implements OnModuleInit, OnModuleDestroy {
  private timer: ReturnType<typeof setInterval>;
  private running = false;
  private logger = new Logger(CareService.name);
  constructor(
    @InjectConnection() private db: Connection,
    @InjectModel('Order') private orders: Model<any>,
    @InjectModel('User') private users: Model<any>,
    @InjectModel('Product') private products: Model<any>,
    @InjectModel('LoyaltyTransaction') private loyalty: Model<any>,
    @InjectModel('Review') private reviews: Model<any>,
    @InjectModel('SupportCase') private cases: Model<any>,
    @InjectModel('CareNotice') private notices: Model<any>,
    @InjectModel('Refund') private refunds: Model<any>,
    @InjectModel('CareAttachment') private attachments: Model<any>,
    private config: ConfigService,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.tick(), 30000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
  }
  id(value: string) {
    if (
      typeof value !== 'string' ||
      !/^[a-fA-F0-9]{24}$/.test(value) ||
      !Types.ObjectId.isValid(value)
    )
      throw new BadRequestException('ID không hợp lệ');
    return new Types.ObjectId(value);
  }
  async ownedOrder(id: string, userId: string, session?: any) {
    const order = await this.orders
      .findOne({ _id: this.id(id), userId: this.id(userId) })
      .session(session || null);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng của bạn');
    return order;
  }
  async notice(
    key: string,
    userId: any,
    text: string,
    orderId: any,
    session?: any,
    dueAt = new Date(),
    kind = 'RESULT',
  ) {
    if (!userId) return;
    await this.notices.updateOne(
      { key },
      {
        $setOnInsert: {
          key,
          userId,
          text,
          orderId,
          dueAt,
          kind,
          href: '/care',
          status: 'SCHEDULED',
        },
      },
      { upsert: true, session },
    );
  }
  async award(
    userId: any,
    points: number,
    referenceId: string,
    description: string,
    session: any,
  ) {
    // The surrounding transaction also writes the order/review, serializing duplicate events.
    if (
      points <= 0 ||
      (await this.loyalty.exists({ userId, referenceId }).session(session))
    )
      return;
    const user = await this.users.findOneAndUpdate(
      { _id: userId, isActive: true },
      { $inc: { loyaltyPoints: points } },
      { new: true, session },
    );
    if (!user) return;
    await this.loyalty.create(
      [
        {
          userId,
          type: 'EARN',
          points,
          balanceAfter: user.loyaltyPoints,
          referenceId,
          description,
        },
      ],
      { session },
    );
  }
  async delivered(orderId: any) {
    // The invitation is independent from the loyalty transaction and survives reward failures.
    const delivered = await this.orders.findOne({
      _id: orderId,
      orderStatus: 'DELIVERED',
      deliveredAt: { $ne: null },
    });
    if (
      delivered?.userId &&
      (await this.users.exists({ _id: delivered.userId, isActive: true }))
    ) {
      await this.notice(
        `review:${delivered._id}`,
        delivered.userId,
        `Mời bạn đánh giá sản phẩm trong đơn ${delivered.orderCode}. Bỏ qua không ảnh hưởng điểm mua hàng.`,
        delivered._id,
        undefined,
        reviewDueAt(delivered.deliveredAt),
        'REVIEW_INVITE',
      );
    }
    await this.db.transaction(async (session) => {
      const order = await this.orders
        .findOne({
          _id: orderId,
          orderStatus: 'DELIVERED',
          careProcessedAt: null,
        })
        .session(session);
      if (!order || !order.userId) return;
      const user = await this.users
        .findOne({ _id: order.userId, isActive: true })
        .session(session);
      if (!user) return;
      if (!order.deliveredAt) return; // Never invent a historical delivery time.
      const eligibleTotal = order.items
        .filter((i) => i.loyaltyEligible !== false)
        .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const discountRatio =
        order.pricing.itemsTotal > 0
          ? Math.max(
              0,
              1 - order.pricing.voucherDiscount / order.pricing.itemsTotal,
            )
          : 0;
      const points = Math.floor((eligibleTotal * discountRatio) / 10000);
      const legacy = await this.loyalty
        .exists({
          userId: order.userId,
          referenceId: order.orderCode,
          type: 'EARN',
        })
        .session(session);
      if (!legacy)
        await this.award(
          order.userId,
          points,
          `purchase:${order._id}`,
          `Tích điểm đơn ${order.orderCode}`,
          session,
        );
      await this.notice(
        `purchase:${order._id}`,
        order.userId,
        legacy
          ? `Đơn ${order.orderCode}: điểm mua hàng đã được ghi nhận trước đây.`
          : `Đơn ${order.orderCode}: ${points > 0 ? `cộng ${points} điểm mua hàng` : 'không đủ điều kiện tích điểm'}.`,
        order._id,
        session,
      );
      order.careProcessedAt = new Date();
      await order.save({ session });
    });
  }
  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      const orders = await this.orders
        .find({
          orderStatus: 'DELIVERED',
          userId: { $ne: null },
          deliveredAt: { $ne: null },
          careProcessedAt: null,
        })
        .limit(100);
      for (const order of orders) {
        try {
          await this.delivered(order._id);
        } catch (error) {
          this.logger.error('Không thể xử lý hậu mãi', error.stack);
        }
      }
      for (const returned of await this.orders
        .find({ orderStatus: 'RETURNED_BP06', bp06CaseId: null })
        .limit(100))
        await this.transfer(returned);
      await this.notices.updateMany(
        { status: 'SCHEDULED', dueAt: { $lte: new Date() } },
        { $set: { status: 'SENT', sentAt: new Date() } },
      );
      await this.cases.updateMany(
        { status: 'QUEUED', availableAt: { $lte: new Date() } },
        { $set: { status: 'OPEN' } },
      );
      for (const refund of await this.refunds
        .find({
          status: { $ne: 'SUCCESS' },
          nextAttemptAt: { $lte: new Date() },
        })
        .limit(20)) {
        try {
          await this.dispatchRefund(refund);
        } catch (error) {
          this.logger.error('Không thể xử lý hoàn tiền', error.stack);
        }
      }
    } catch (error) {
      this.logger.error('Tác vụ hậu mãi sẽ thử lại', error.stack);
    } finally {
      this.running = false;
    }
  }
  async inbox(userId: string) {
    // In-app delivery is durable; polling also releases due notifications when no worker is running.
    await this.notices.updateMany(
      {
        userId: this.id(userId),
        status: 'SCHEDULED',
        dueAt: { $lte: new Date() },
      },
      { $set: { status: 'SENT', sentAt: new Date() } },
    );
    return this.notices
      .find({ userId: this.id(userId), status: { $in: ['SENT', 'DISMISSED'] } })
      .sort({ createdAt: -1 })
      .limit(100);
  }
  async dismiss(id: string, userId: string) {
    const result = await this.notices.findOneAndUpdate(
      { _id: this.id(id), userId: this.id(userId), status: 'SENT' },
      { $set: { status: 'DISMISSED', readAt: new Date() } },
      { new: true },
    );
    if (!result) throw new NotFoundException('Không tìm thấy thông báo');
    return result;
  }
  async validateAttachments(ids: unknown, userId: string, review = false) {
    if (ids === undefined) return [];
    if (
      !Array.isArray(ids) ||
      ids.length > 5 ||
      new Set(ids).size !== ids.length
    )
      throw new BadRequestException('Tối đa 5 tệp đính kèm khác nhau');
    const values = ids.map((value) => this.id(value));
    const files = await this.attachments.find({
      _id: { $in: values },
      userId: this.id(userId),
    });
    if (
      files.length !== values.length ||
      (review && files.some((file) => file.mime === 'application/pdf'))
    )
      throw new BadRequestException('Tệp không hợp lệ hoặc không thuộc về bạn');
    return values;
  }
  async upload(userId: string, file: any) {
    if (!file?.buffer?.length || file.size > 10 * 1024 * 1024)
      throw new BadRequestException('Tệp tối đa 10 MB');
    const mime = attachmentMime(file.buffer);
    return this.attachments
      .create({
        userId: this.id(userId),
        name: file.originalname.slice(0, 200),
        mime,
        size: file.size,
        data: file.buffer,
      })
      .then((file) => ({ _id: file._id, name: file.name, mime: file.mime }));
  }
  async download(id: string, user?: any) {
    const file = await this.attachments.findById(this.id(id)).select('+data');
    if (!file) throw new NotFoundException('Không tìm thấy tệp');
    const published = await this.reviews.exists({
      attachments: file._id,
      status: 'APPROVED',
    });
    if (
      !published &&
      user?.role !== 'ADMIN' &&
      String(file.userId) !== String(user?.sub || user?._id || '')
    )
      throw new ForbiddenException();
    return file;
  }
  publicReviews(productId: string) {
    return this.reviews
      .find({ productId: this.id(productId), status: 'APPROVED' })
      .select('author rating content attachments publishedAt')
      .sort({ publishedAt: -1 })
      .limit(100);
  }
  myReviews(userId: string) {
    return this.reviews
      .find({ userId: this.id(userId) })
      .sort({ updatedAt: -1 })
      .limit(100);
  }
  async submitReview(userId: string, body: any) {
    const order = await this.ownedOrder(body.orderId, userId);
    if (order.orderStatus !== 'DELIVERED')
      throw new BadRequestException('Chỉ đánh giá đơn đã giao thành công');
    const productId = this.id(body.productId);
    if (
      !order.items.some((item) => String(item.productId) === String(productId))
    )
      throw new BadRequestException('Sản phẩm không thuộc đơn hàng');
    if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5)
      throw new BadRequestException('Chọn từ 1 đến 5 sao');
    const content = requiredText(body.content, 'Nội dung đánh giá', 10, 3000);
    const attachments = await this.validateAttachments(
      body.attachments,
      userId,
      true,
    );
    // Every text and media submission is held for human moderation, including resubmissions.
    const existing = await this.reviews.findOne({
      orderId: order._id,
      productId,
    });
    if (existing && existing.status !== 'REJECTED')
      throw new BadRequestException('Đánh giá đã gửi hoặc đã xuất bản');
    try {
      if (existing) {
        const edited = await this.reviews.findOneAndUpdate(
          { _id: existing._id, status: 'REJECTED' },
          {
            $set: {
              rating: body.rating,
              content,
              attachments,
              status: 'PENDING',
              moderationNote: '',
            },
          },
          { new: true },
        );
        if (!edited) throw new BadRequestException('Đánh giá đang được xử lý');
        return edited;
      }
      const user = await this.users.findById(userId);
      return await this.reviews.create({
        userId,
        orderId: order._id,
        productId,
        author: user.name,
        rating: body.rating,
        content,
        attachments,
      });
    } catch (error) {
      if (error.code === 11000)
        throw new BadRequestException('Sản phẩm đã có đánh giá trong đơn này');
      throw error;
    }
  }
  async moderate(id: string, adminId: string, body: any) {
    if (!['APPROVED', 'REJECTED'].includes(body.status))
      throw new BadRequestException('Kết quả kiểm duyệt không hợp lệ');
    const note =
      body.status === 'REJECTED'
        ? requiredText(body.note, 'Lý do từ chối')
        : '';
    return this.db.transaction(async (session) => {
      const review = await this.reviews
        .findOne({ _id: this.id(id), status: 'PENDING' })
        .session(session);
      if (!review)
        throw new BadRequestException('Đánh giá không còn chờ duyệt');
      review.status = body.status;
      review.moderationNote = note;
      review.moderatedBy = this.id(adminId);
      if (body.status === 'APPROVED') {
        review.publishedAt = new Date();
        const configured = Number(this.config.get('REVIEW_REWARD_POINTS', 0));
        const points =
          Number.isSafeInteger(configured) && configured > 0 ? configured : 0;
        await this.award(
          review.userId,
          points,
          `review:${review._id}`,
          'Thưởng đánh giá đã xuất bản',
          session,
        );
      }
      await review.save({ session });
      if (body.status === 'APPROVED') {
        const published = await this.reviews
          .find({ productId: review.productId, status: 'APPROVED' })
          .session(session);
        await this.products.updateOne(
          { _id: review.productId },
          {
            $set: {
              reviewCount: published.length,
              rating:
                published.reduce((sum, r) => sum + r.rating, 0) /
                published.length,
            },
          },
          { session },
        );
      }
      await this.notice(
        `moderation:${review._id}:${review.updatedAt.getTime()}`,
        review.userId,
        body.status === 'APPROVED'
          ? 'Đánh giá đã được xuất bản. Điểm thưởng (nếu có) đã được cập nhật.'
          : `Đánh giá cần chỉnh sửa: ${note}`,
        review.orderId,
        session,
      );
      return review;
    });
  }
  async createCase(userId: string, body: any) {
    const order = await this.ownedOrder(body.orderId, userId);
    if (!['RETURN', 'COMPLAINT', 'SUPPORT'].includes(body.type))
      throw new BadRequestException('Loại yêu cầu không hợp lệ');
    const description = requiredText(body.description, 'Mô tả', 10);
    const reason =
      body.type !== 'SUPPORT'
        ? requiredText(body.reason, 'Lý do', 3, 1000)
        : '';
    if (
      body.productId &&
      !order.items.some((item) => String(item.productId) === body.productId)
    )
      throw new BadRequestException('Sản phẩm không thuộc đơn hàng');
    const attachments = await this.validateAttachments(
      body.attachments,
      userId,
    );
    return this.cases.create({
      userId,
      orderId: order._id,
      productId: body.productId || undefined,
      type: body.type,
      reason,
      description,
      attachments,
      ...supportAvailability(),
    });
  }
  myCases(userId: string) {
    return this.cases
      .find({ userId: this.id(userId) })
      .sort({ updatedAt: -1 })
      .limit(100);
  }
  async reply(id: string, userId: string, body: any) {
    const text = requiredText(body.text, 'Thông tin bổ sung', 3);
    const attachments = await this.validateAttachments(
      body.attachments,
      userId,
    );
    const result = await this.cases.findOneAndUpdate(
      { _id: this.id(id), userId: this.id(userId), status: { $ne: 'CLOSED' } },
      {
        $push: {
          messages: { author: 'CUSTOMER', text, timestamp: new Date() },
        },
        $addToSet: { attachments: { $each: attachments } },
        $set: { status: 'INVESTIGATING' },
      },
      { new: true },
    );
    if (!result)
      throw new BadRequestException('Hồ sơ không tồn tại hoặc đã đóng');
    return result;
  }
  async transfer(order: any) {
    const supportCase = await this.cases.findOneAndUpdate(
      { sourceKey: `return:${order._id}` },
      {
        $setOnInsert: {
          sourceKey: `return:${order._id}`,
          orderId: order._id,
          userId: order.userId,
          type: 'RETURN',
          reason:
            order.deliveryInfo.failureReason || 'Giao hàng không thành công',
          description: order.deliveryInfo.bp06Note,
          ...supportAvailability(),
        },
      },
      { new: true, upsert: true },
    );
    await this.orders.updateOne(
      { _id: order._id, bp06CaseId: null },
      { $set: { bp06CaseId: supportCase._id }, $inc: { __v: 1 } },
    );
    return supportCase;
  }
  adminReviews() {
    return this.reviews
      .find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(100);
  }
  adminCases() {
    return this.cases
      .find()
      .populate('orderId')
      .sort({ updatedAt: -1 })
      .limit(100);
  }
  adminRefunds() {
    return this.refunds.find().sort({ updatedAt: -1 }).limit(100);
  }
  async updateCase(id: string, adminId: string, body: any) {
    return this.db.transaction(async (session) => {
      const item = await this.cases.findById(this.id(id)).session(session);
      if (!item || item.status === 'CLOSED')
        throw new BadRequestException('Hồ sơ không tồn tại hoặc đã đóng');
      const order = await this.orders.findById(item.orderId).session(session);
      if (body.status === 'NEEDS_INFO') {
        const text = requiredText(body.message, 'Yêu cầu bổ sung');
        item.status = 'NEEDS_INFO';
        item.messages.push({ author: 'CSKH', text, timestamp: new Date() });
        await this.notice(
          `case-info:${item._id}:${Date.now()}`,
          item.userId,
          text,
          item.orderId,
          session,
        );
      } else {
        if (!['INVESTIGATING', 'RESOLVING', 'CLOSED'].includes(body.status))
          throw new BadRequestException('Trạng thái hồ sơ không hợp lệ');
        item.investigation = requiredText(
          body.investigation,
          'Kết quả xác minh',
          10,
        );
        item.responsibility = requiredText(
          body.responsibility,
          'Nguyên nhân / trách nhiệm',
          3,
          1000,
        );
        if (
          order.items.some((i) => i.isCustom) &&
          body.customizationChecked !== true
        )
          throw new BadRequestException(
            'Cần đối chiếu cấu hình tùy chỉnh đã xác nhận',
          );
        item.customizationChecked = body.customizationChecked === true;
        if (body.status !== 'INVESTIGATING') {
          if (
            ![
              'REFUND',
              'REPLACEMENT',
              'REPRODUCTION',
              'REDELIVERY',
              'REJECT',
              'OTHER',
            ].includes(body.resolution)
          )
            throw new BadRequestException('Chọn phương án xử lý');
          const existingRefund = await this.refunds
            .findOne({ caseId: item._id })
            .session(session);
          if (existingRefund && body.resolution !== 'REFUND')
            throw new BadRequestException(
              'Đã có yêu cầu hoàn tiền, không được đổi phương án',
            );
          item.resolution = body.resolution;
          if (body.resolution === 'REFUND' && !existingRefund) {
            const amount = paidAmount(order);
            if (
              amount <= 0 ||
              (await this.refunds
                .exists({ orderId: order._id })
                .session(session))
            )
              throw new BadRequestException(
                'Không có khoản tiền có thể hoàn hoặc đơn đã có yêu cầu hoàn tiền',
              );
            await this.refunds.create(
              [
                {
                  key: `case:${item._id}`,
                  caseId: item._id,
                  orderId: order._id,
                  userId: item.userId,
                  amount,
                  nextAttemptAt: new Date(),
                },
              ],
              { session },
            );
            // Serialize refund creation across multiple cases for the same order.
            order.refundPending = true;
            await order.save({ session });
          }
          if (body.status === 'CLOSED') {
            if (
              body.resolution === 'REFUND' &&
              existingRefund?.status !== 'SUCCESS'
            )
              throw new BadRequestException(
                'Chưa có xác nhận hoàn tiền thành công',
              );
            item.result = requiredText(body.result, 'Kết quả thực hiện', 10);
            item.resolutionStatus = 'COMPLETED';
            item.closedAt = new Date();
            await this.notice(
              `case-closed:${item._id}`,
              item.userId,
              `Kết quả ${item.resolution}: ${item.result}`,
              item.orderId,
              session,
            );
          } else item.resolutionStatus = 'PENDING';
        }
        item.status = body.status;
        item.messages.push({
          author: `CSKH ${adminId}`,
          text: `${body.status}: ${item.investigation}`,
          timestamp: new Date(),
        });
      }
      await item.save({ session });
      return item;
    });
  }
  async cancel(orderId: string, userId: string) {
    return this.db.transaction(async (session) => {
      const order = await this.ownedOrder(orderId, userId, session);
      if (!canCancel(order))
        throw new BadRequestException(
          'Đơn đã xác nhận không thể hủy. Vui lòng gửi yêu cầu Đổi trả, Khiếu nại hoặc Hỗ trợ.',
        );
      const amount = paidAmount(order);
      if (order.items.some((i) => i.isCustom) && amount <= 0)
        throw new BadRequestException(
          'Đơn tùy chỉnh chưa có khoản cọc được xác nhận. Vui lòng liên hệ CSKH để xác minh.',
        );
      if (amount > 0) {
        await this.refunds.updateOne(
          { key: `cancel:${order._id}` },
          {
            $setOnInsert: {
              key: `cancel:${order._id}`,
              orderId: order._id,
              userId: order.userId,
              amount,
              nextAttemptAt: new Date(),
            },
          },
          { upsert: true, session },
        );
        if (!order.refundPending)
          order.timeline.push({
            title: 'Yêu cầu hủy đang chờ hoàn tiền',
            description: 'Chỉ hoàn tất hủy sau khi cổng thanh toán xác nhận.',
            timestamp: new Date(),
            completed: false,
          });
        order.refundPending = true;
        await this.notice(
          `cancel-pending:${order._id}`,
          order.userId,
          `Đã tiếp nhận yêu cầu hủy ${order.orderCode}. Đang chờ cổng thanh toán xác nhận hoàn ${amount.toLocaleString('vi-VN')}đ.`,
          order._id,
          session,
        );
      } else {
        order.orderStatus = 'CANCELLED';
        order.timeline.push({
          title: 'Đã hủy đơn hàng',
          description: 'Đơn chưa thanh toán; không phát sinh hoàn tiền.',
          timestamp: new Date(),
          completed: true,
        });
        await this.notice(
          `cancelled:${order._id}`,
          order.userId,
          `Đã hủy đơn ${order.orderCode}; không phát sinh hoàn tiền.`,
          order._id,
          session,
        );
      }
      await order.save({ session });
      return order;
    });
  }
  async dispatchRefund(refund: any) {
    // Adapter contract: authenticated HTTPS endpoint, idempotency key, exact echoed amount/currency.
    const endpoint = this.config.get<string>('REFUND_GATEWAY_URL');
    const token = this.config.get<string>('REFUND_GATEWAY_TOKEN');
    let result: any;
    let error = '';
    try {
      if (!endpoint?.startsWith('https://') || !token)
        throw new Error('Chưa cấu hình cổng hoàn tiền');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': refund.key,
        },
        body: JSON.stringify({
          requestId: refund.key,
          orderId: String(refund.orderId),
          amount: refund.amount,
          currency: 'VND',
        }),
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('Cổng thanh toán chưa xác nhận');
      result = await response.json();
      if (
        result.requestId !== refund.key ||
        result.amount !== refund.amount ||
        result.currency !== 'VND' ||
        !['SUCCESS', 'PENDING', 'FAILED'].includes(result.status) ||
        (result.status === 'SUCCESS' && !result.reference)
      )
        throw new Error('Phản hồi hoàn tiền không hợp lệ');
    } catch (err) {
      error = err.message;
    }
    await this.db.transaction(async (session) => {
      const current = await this.refunds.findById(refund._id).session(session);
      if (!current || current.status === 'SUCCESS') return;
      current.status = error ? 'PENDING' : result.status;
      current.error =
        error ||
        (result.status === 'FAILED' ? 'Cổng thanh toán từ chối hoàn tiền' : '');
      current.nextAttemptAt = new Date(Date.now() + 5 * 60000);
      const order = await this.orders
        .findById(current.orderId)
        .session(session);
      if (current.status === 'SUCCESS') {
        if (!current.caseId && !canCancel(order))
          throw new BadRequestException(
            'Đơn không còn đủ điều kiện hủy; cần CSKH đối soát',
          );
        current.completedAt = new Date();
        current.gatewayReference = String(result.reference);
        order.paymentStatus = 'REFUNDED';
        order.refundPending = false;
        if (!current.caseId) order.orderStatus = 'CANCELLED';
        order.timeline.push({
          title: current.caseId
            ? 'Hoàn tiền theo hồ sơ hỗ trợ'
            : 'Đã hoàn tiền và hủy đơn',
          description: `Hoàn ${current.amount} VND. Mã xác nhận: ${current.gatewayReference}`,
          timestamp: new Date(),
          completed: true,
        });
        await order.save({ session });
        await this.notice(
          `refund-success:${current._id}`,
          current.userId,
          `Đã hoàn ${current.amount.toLocaleString('vi-VN')}đ${current.caseId ? ' theo hồ sơ hỗ trợ' : ' và hủy đơn hàng'}.`,
          order._id,
          session,
        );
      } else {
        const zalo = this.config.get<string>('SUPPORT_ZALO_URL', '');
        await this.notice(
          `refund-pending:${current._id}`,
          current.userId,
          `Hoàn tiền chưa thành công; yêu cầu vẫn được theo dõi. Liên hệ CSKH${zalo.startsWith('https://zalo.me/') ? `: ${zalo}` : ' tại mục Hỗ trợ'}.`,
          order._id,
          session,
        );
        if (/^https:\/\/zalo\.me\/[A-Za-z0-9_-]+$/.test(zalo))
          await this.notices.updateOne(
            { key: `refund-pending:${current._id}` },
            { $set: { href: zalo } },
            { session },
          );
      }
      await current.save({ session });
    });
  }
}
