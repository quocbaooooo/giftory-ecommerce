const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const mongoose = require('mongoose');
require('reflect-metadata');
const { CareService } = require('../dist/modules/care/care.service');
const rules = require('../dist/modules/care/care.rules');
const schemas = require('../dist/modules/care/care.schemas');
const { OrderSchema } = require('../dist/database/schemas/order.schema');
const { UserSchema } = require('../dist/database/schemas/user.schema');
const { ProductSchema } = require('../dist/database/schemas/product.schema');
const {
  LoyaltyTransactionSchema,
} = require('../dist/database/schemas/loyalty-transaction.schema');
const { OrdersService } = require('../dist/modules/orders/orders.service');
const { ConfigService } = require('@nestjs/config');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const testRoot = path.resolve(__dirname, '..');
const root = fs.mkdtempSync(path.join(testRoot, '.giftory-care-tests-'));
const port = require('node:crypto').randomInt(28000, 35000);
const executable =
  process.env.MONGOD_BINARY ||
  'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe';
const proc = spawn(
  executable,
  [
    '--dbpath',
    root,
    '--port',
    String(port),
    '--bind_ip',
    '127.0.0.1',
    '--replSet',
    'caretest',
    '--logpath',
    path.join(root, 'mongo.log'),
  ],
  { windowsHide: true, stdio: 'ignore' },
);
let spawnError;
proc.on('error', (err) => {
  spawnError = err;
});
let connection;
let checks = 0;
async function test(name, fn) {
  await fn();
  checks++;
  console.log(`PASS ${name}`);
}
(async () => {
  for (let i = 0; i < 60; i++) {
    if (spawnError) throw spawnError;
    if (proc.exitCode !== null)
      throw new Error(
        `mongod exited ${proc.exitCode}: ${fs.existsSync(path.join(root, 'mongo.log')) ? fs.readFileSync(path.join(root, 'mongo.log'), 'utf8').slice(-6000) : 'no log'}`,
      );
    try {
      connection = await mongoose
        .createConnection(
          `mongodb://127.0.0.1:${port}/caretest?directConnection=true`,
          { serverSelectionTimeoutMS: 500 },
        )
        .asPromise();
      break;
    } catch {
      await sleep(250);
    }
  }
  assert(connection, 'Isolated MongoDB did not start');
  await connection.db
    .admin()
    .command({
      replSetInitiate: {
        _id: 'caretest',
        members: [{ _id: 0, host: `127.0.0.1:${port}` }],
      },
    });
  for (let i = 0; i < 60; i++) {
    if ((await connection.db.admin().command({ hello: 1 })).isWritablePrimary)
      break;
    await sleep(250);
  }
  const Order = connection.model('Order', OrderSchema),
    User = connection.model('User', UserSchema),
    Product = connection.model('Product', ProductSchema);
  const Loyalty = connection.model(
    'LoyaltyTransaction',
    LoyaltyTransactionSchema,
  );
  const Review = connection.model('Review', schemas.ReviewSchema),
    Case = connection.model('SupportCase', schemas.SupportCaseSchema),
    Notice = connection.model('CareNotice', schemas.NoticeSchema),
    Refund = connection.model('Refund', schemas.RefundSchema),
    Attachment = connection.model('CareAttachment', schemas.AttachmentSchema);
  await Promise.all(
    [
      Order,
      User,
      Product,
      Loyalty,
      Review,
      Case,
      Notice,
      Refund,
      Attachment,
    ].map((m) => m.init()),
  );
  const config = new ConfigService({ REVIEW_REWARD_POINTS: 7 });
  const care = new CareService(
    connection,
    Order,
    User,
    Product,
    Loyalty,
    Review,
    Case,
    Notice,
    Refund,
    Attachment,
    config,
  );
  const user = await User.create({
    name: 'Người mua thử',
    email: 'care-test@example.test',
    password: 'test',
    loyaltyPoints: 0,
  });
  const other = await User.create({
    name: 'Người khác',
    email: 'other-test@example.test',
    password: 'test',
    loyaltyPoints: 0,
  });
  const productId = new mongoose.Types.ObjectId();
  await Product.collection.insertOne({
    _id: productId,
    name: 'Quà',
    slug: 'test-gift',
    rating: 0,
    reviewCount: 0,
  });
  let code = 0;
  async function order(extra = {}) {
    return Order.create({
      orderCode: `TEST-${++code}`,
      userId: user._id,
      customerInfo: { name: 'Test', phone: '0123456789', address: 'Test' },
      items: [
        { productId, productName: 'Quà', quantity: 1, unitPrice: 100000 },
      ],
      pricing: {
        itemsTotal: 100000,
        voucherDiscount: 0,
        totalAmount: 100000,
        depositAmount: 50000,
      },
      orderStatus: 'AWAITING_CONFIRMATION',
      ...extra,
    });
  }
  const uid = String(user._id);
  await test('48-hour boundary and Vietnam support hours', async () => {
    assert.equal(
      rules.reviewDueAt(new Date('2026-01-01T00:00:00Z')).toISOString(),
      '2026-01-03T00:00:00.000Z',
    );
    assert.equal(
      rules.supportAvailability(new Date('2026-01-01T00:59:00Z')).status,
      'QUEUED',
    );
    assert.equal(
      rules.supportAvailability(new Date('2026-01-01T01:00:00Z')).status,
      'OPEN',
    );
    assert.equal(
      rules
        .supportAvailability(new Date('2026-01-01T15:00:00Z'))
        .availableAt.toISOString(),
      '2026-01-02T01:00:00.000Z',
    );
  });
  const delivered = await order({
    orderStatus: 'DELIVERED',
    deliveredAt: new Date(),
  });
  await test('Concurrent delivery events award once and defer invitation', async () => {
    await Promise.all([
      care.delivered(delivered._id),
      care.delivered(delivered._id),
    ]);
    assert.equal((await User.findById(uid)).loyaltyPoints, 10);
    assert.equal(
      await Loyalty.countDocuments({
        referenceId: `purchase:${delivered._id}`,
      }),
      1,
    );
    const invite = await Notice.findOne({ key: `review:${delivered._id}` });
    assert.equal(
      invite.dueAt.getTime() - delivered.deliveredAt.getTime(),
      48 * 3600000,
    );
    assert(!(await care.inbox(uid)).some((n) => n.kind === 'REVIEW_INVITE'));
  });
  await test('Due invitations release and dismiss without affecting points', async () => {
    await Notice.updateOne(
      { key: `review:${delivered._id}` },
      { $set: { dueAt: new Date(Date.now() - 1) } },
    );
    const invite = (await care.inbox(uid)).find(
      (n) => n.kind === 'REVIEW_INVITE',
    );
    assert(invite);
    await care.dismiss(String(invite._id), uid);
    assert.equal((await User.findById(uid)).loyaltyPoints, 10);
  });
  await test('Non-delivered and fully discounted orders earn no purchase points', async () => {
    const pending = await order();
    await care.delivered(pending._id);
    const free = await order({
      orderStatus: 'DELIVERED',
      deliveredAt: new Date(),
      pricing: { itemsTotal: 100000, voucherDiscount: 100000, totalAmount: 0 },
    });
    await care.delivered(free._id);
    assert.equal((await User.findById(uid)).loyaltyPoints, 10);
    assert(await Notice.exists({ key: `review:${free._id}` }));
  });
  await test('Excluded products earn no points but still receive invitations', async () => {
    const excluded = await order({
      orderStatus: 'DELIVERED',
      deliveredAt: new Date(),
      items: [
        {
          productId,
          productName: 'Excluded',
          quantity: 1,
          unitPrice: 100000,
          loyaltyEligible: false,
        },
      ],
    });
    await care.delivered(excluded._id);
    assert.equal((await User.findById(uid)).loyaltyPoints, 10);
    assert(await Notice.exists({ key: `review:${excluded._id}` }));
  });
  await test('Ownership enforced for reviews, support and cancellation', async () => {
    await assert.rejects(() =>
      care.cancel(String(delivered._id), String(other._id)),
    );
    await assert.rejects(() =>
      care.submitReview(String(other._id), {
        orderId: String(delivered._id),
        productId: String(productId),
        rating: 5,
        content: 'Sản phẩm rất đẹp',
      }),
    );
    await assert.rejects(() =>
      care.createCase(String(other._id), {
        orderId: String(delivered._id),
        type: 'SUPPORT',
        description: 'Cần hỗ trợ giao hàng',
      }),
    );
  });
  let review;
  await test('Review held from public until approved, rejection allows editing', async () => {
    review = await care.submitReview(uid, {
      orderId: String(delivered._id),
      productId: String(productId),
      rating: 5,
      content: 'Quà tặng rất đẹp và chắc chắn',
    });
    assert.equal((await care.publicReviews(String(productId))).length, 0);
    await care.moderate(String(review._id), uid, {
      status: 'REJECTED',
      note: 'Vui lòng bổ sung trải nghiệm',
    });
    review = await care.submitReview(uid, {
      orderId: String(delivered._id),
      productId: String(productId),
      rating: 4,
      content: 'Mình đã dùng sản phẩm, màu đẹp',
    });
    assert.equal(review.status, 'PENDING');
    await care.moderate(String(review._id), uid, { status: 'APPROVED' });
    assert.equal((await care.publicReviews(String(productId))).length, 1);
    assert.equal((await Product.findById(productId)).rating, 4);
    assert.equal((await Product.findById(productId)).reviewCount, 1);
    assert.equal((await User.findById(uid)).loyaltyPoints, 17);
    await assert.rejects(() =>
      care.moderate(String(review._id), uid, { status: 'APPROVED' }),
    );
    assert.equal((await User.findById(uid)).loyaltyPoints, 17);
  });
  await test('Attachment signature, ownership and review media validation', async () => {
    await assert.rejects(() =>
      care.upload(uid, {
        buffer: Buffer.from('<script>bad</script>'),
        size: 20,
        originalname: 'fake.jpg',
      }),
    );
    const pdf = await care.upload(uid, {
      buffer: Buffer.from('%PDF-1.4 test'),
      size: 13,
      originalname: 'evidence.pdf',
    });
    await assert.rejects(() =>
      care.validateAttachments([String(pdf._id)], uid, true),
    );
    await assert.rejects(() =>
      care.download(String(pdf._id), { _id: other._id, role: 'CUSTOMER' }),
    );
    assert.equal(
      (await care.download(String(pdf._id), { _id: user._id })).mime,
      'application/pdf',
    );
  });
  await test('Only unconfirmed unpaid standard orders cancel immediately', async () => {
    const unpaid = await order();
    await care.cancel(String(unpaid._id), uid);
    assert.equal((await Order.findById(unpaid._id)).orderStatus, 'CANCELLED');
    for (const status of [
      'CONFIRMED',
      'PROCESSING',
      'IN_TRANSIT',
      'DELIVERED',
      'RETURNED_BP06',
      'CANCELLED',
    ]) {
      const o = await order({ orderStatus: status });
      await assert.rejects(() => care.cancel(String(o._id), uid));
      assert.equal((await Order.findById(o._id)).orderStatus, status);
    }
  });
  let paid, refund;
  await test('Concurrent paid cancellation produces one pending refund', async () => {
    paid = await order({ paymentStatus: 'PAID_FULL' });
    await Promise.all([
      care.cancel(String(paid._id), uid),
      care.cancel(String(paid._id), uid),
    ]);
    assert.equal(await Refund.countDocuments({ orderId: paid._id }), 1);
    refund = await Refund.findOne({ orderId: paid._id });
    assert.equal(refund.amount, 100000);
    assert.equal(
      (await Order.findById(paid._id)).orderStatus,
      'AWAITING_CONFIRMATION',
    );
    const ordersService = new OrdersService(
      care,
      Order,
      null,
      User,
      Product,
      Loyalty,
    );
    await assert.rejects(() =>
      ordersService.confirmOrder(String(paid._id), { name: 'Admin' }, true),
    );
  });
  await test('Missing gateway leaves refund pending and order uncancelled', async () => {
    await care.dispatchRefund(refund);
    assert.equal((await Refund.findById(refund._id)).status, 'PENDING');
    assert.equal(
      (await Order.findById(paid._id)).orderStatus,
      'AWAITING_CONFIRMATION',
    );
  });
  config.set('REFUND_GATEWAY_URL', 'https://gateway.example.test/refunds');
  config.set('REFUND_GATEWAY_TOKEN', 'test-token');
  const originalFetch = global.fetch;
  await test('Unmatched gateway responses cannot complete refund', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        requestId: refund.key,
        amount: 1,
        currency: 'VND',
        status: 'SUCCESS',
        reference: 'gw-1',
      }),
    });
    await care.dispatchRefund(refund);
    assert.equal((await Refund.findById(refund._id)).status, 'PENDING');
  });
  await test('Verified gateway success completes cancellation idempotently', async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        requestId: refund.key,
        amount: refund.amount,
        currency: 'VND',
        status: 'SUCCESS',
        reference: 'gw-1',
      }),
    });
    await care.dispatchRefund(refund);
    await care.dispatchRefund(refund);
    assert.equal((await Order.findById(paid._id)).orderStatus, 'CANCELLED');
    assert.equal((await Order.findById(paid._id)).paymentStatus, 'REFUNDED');
    assert.equal(
      await Notice.countDocuments({ key: `refund-success:${refund._id}` }),
      1,
    );
  });
  global.fetch = originalFetch;
  await test('Custom cancellation refunds actual recorded deposit', async () => {
    const custom = await order({
      paymentStatus: 'PARTIALLY_PAID_DEPOSIT_50',
      items: [
        {
          productId,
          productName: 'Custom',
          isCustom: true,
          quantity: 1,
          unitPrice: 100000,
        },
      ],
    });
    await care.cancel(String(custom._id), uid);
    assert.equal((await Refund.findOne({ orderId: custom._id })).amount, 50000);
  });
  let support;
  await test('Return/complaint reason required and incomplete resolution cannot close', async () => {
    await assert.rejects(() =>
      care.createCase(uid, {
        orderId: String(delivered._id),
        type: 'RETURN',
        description: 'Sản phẩm cần kiểm tra',
      }),
    );
    support = await care.createCase(uid, {
      orderId: String(delivered._id),
      type: 'COMPLAINT',
      reason: 'Sản phẩm bị lỗi',
      description: 'Màu sắc chưa đúng yêu cầu',
    });
    await care.updateCase(String(support._id), uid, {
      status: 'NEEDS_INFO',
      message: 'Vui lòng mô tả chi tiết lỗi',
    });
    await care.reply(String(support._id), uid, {
      text: 'Lỗi ở mặt sau sản phẩm',
    });
    await assert.rejects(() =>
      care.updateCase(String(support._id), uid, {
        status: 'CLOSED',
        resolution: 'REPLACEMENT',
      }),
    );
    await care.updateCase(String(support._id), uid, {
      status: 'CLOSED',
      resolution: 'REPLACEMENT',
      investigation: 'Đã kiểm tra sản phẩm có lỗi',
      responsibility: 'Giftory',
      result: 'Đã giao sản phẩm thay thế cho khách',
    });
    assert.equal((await Case.findById(support._id)).status, 'CLOSED');
    assert(await Notice.exists({ key: `case-closed:${support._id}` }));
    await assert.rejects(() =>
      care.reply(String(support._id), uid, {
        text: 'Không thể sửa hồ sơ đã đóng',
      }),
    );
  });
  await test('Refund resolution blocks case closure until gateway success', async () => {
    const o = await order({
      orderStatus: 'DELIVERED',
      paymentStatus: 'PAID_FULL',
    });
    const c = await care.createCase(uid, {
      orderId: String(o._id),
      type: 'RETURN',
      reason: 'Sản phẩm lỗi',
      description: 'Sản phẩm bị lỗi cần hoàn tiền',
    });
    const body = {
      status: 'RESOLVING',
      resolution: 'REFUND',
      investigation: 'Đã kiểm tra lỗi sản xuất',
      responsibility: 'Giftory',
      result: 'Đã thực hiện hoàn tiền cho khách',
    };
    await care.updateCase(String(c._id), uid, body);
    await assert.rejects(() =>
      care.updateCase(String(c._id), uid, { ...body, status: 'CLOSED' }),
    );
    const r = await Refund.findOne({ caseId: c._id });
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        requestId: r.key,
        amount: r.amount,
        currency: 'VND',
        status: 'SUCCESS',
        reference: 'gw-case',
      }),
    });
    await care.dispatchRefund(r);
    global.fetch = originalFetch;
    await care.updateCase(String(c._id), uid, { ...body, status: 'CLOSED' });
    assert.equal((await Order.findById(o._id)).orderStatus, 'DELIVERED');
  });
  await test('Transfer to BP06 creates one recoverable support case', async () => {
    const o = await order({
      orderStatus: 'RETURNED_BP06',
      deliveryInfo: {
        failureReason: 'Không liên lạc được',
        bp06Note: 'Kiểm tra hàng hoàn',
      },
    });
    const a = await care.transfer(o);
    const b = await care.transfer(o);
    assert.equal(String(a._id), String(b._id));
    assert.equal(
      String((await Order.findById(o._id)).bp06CaseId),
      String(a._id),
    );
  });
  await test('Custom support requires verified customization before resolution', async () => {
    const o = await order({
      orderStatus: 'CONFIRMED',
      items: [
        {
          productId,
          productName: 'Custom',
          isCustom: true,
          quantity: 1,
          unitPrice: 100000,
          customDetails: { text: 'Bao' },
        },
      ],
    });
    const c = await care.createCase(uid, {
      orderId: String(o._id),
      type: 'COMPLAINT',
      reason: 'Sai tên khắc',
      description: 'Tên khắc chưa đúng nội dung',
    });
    const body = {
      status: 'RESOLVING',
      resolution: 'REPRODUCTION',
      investigation: 'Đã đối chiếu nội dung khắc',
      responsibility: 'Giftory',
    };
    await assert.rejects(() => care.updateCase(String(c._id), uid, body));
    await care.updateCase(String(c._id), uid, {
      ...body,
      customizationChecked: true,
    });
  });
  await test('Order lookup requires ownership or matching guest phone', async () => {
    const service = new OrdersService(care, Order, null, User, Product, Loyalty);
    const mine = await order();
    assert.equal(String((await service.getOrderByCode(mine.orderCode, uid))._id), String(mine._id));
    await assert.rejects(() => service.getOrderByCode(mine.orderCode));
    await assert.rejects(() => service.getOrderByCode(mine.orderCode, String(other._id)));
    await assert.rejects(() => service.getOrderByCode(mine.orderCode, undefined, '0987654321'));
    assert.equal(String((await service.getOrderByCode(mine.orderCode, undefined, '+84 123 456 789'))._id), String(mine._id));
    await assert.rejects(() => service.getOrderByCode('NOT-FOUND', uid));
  });
  await test('Order list contains only current customer orders, newest first', async () => {
    const service = new OrdersService(care, Order, null, User, Product, Loyalty);
    const otherOrder = await order({ userId: other._id });
    const rows = await service.getMyOrders(uid);
    assert(rows.length > 1);
    assert(rows.every(row => String(row.userId) === uid && String(row._id) !== String(otherOrder._id)));
    assert(rows.every((row, index) => !index || rows[index - 1].createdAt >= row.createdAt));
    assert.deepEqual(await service.getMyOrders(), []);
  });
  await require('./auth.checks.cjs')(connection, test);
  console.log(
    `Completed ${checks} integration checks against isolated MongoDB replica set.`,
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (connection) await connection.close();
    proc.kill();
    await new Promise((resolve) => {
      if (proc.exitCode !== null) resolve();
      else {
        proc.once('exit', resolve);
        setTimeout(resolve, 5000);
      }
    });
    const resolved = path.resolve(root);
    const allowed = testRoot + path.sep;
    if (
      resolved.startsWith(allowed) &&
      path.basename(resolved).startsWith('.giftory-care-tests-')
    )
      fs.rmSync(resolved, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 200,
      });
  });
