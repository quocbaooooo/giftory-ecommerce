const assert = require('node:assert/strict');
require('reflect-metadata');
const { OrdersService } = require('../dist/modules/orders/orders.service');
const { PaymentStatus, OrderStatus } = require('../dist/common/enums/role.enum');

const previousEnvironment = process.env.NODE_ENV;
const previousFlag = process.env.ENABLE_PAYMENT_SIMULATION;
let checks = 0;
async function test(name, run) {
  await run();
  checks++;
  console.log(`PASS ${name}`);
}
function fixture(depositAmount = 50000) {
  const order = {
    _id: 'demo-order', orderCode: 'GF-DEMO', userId: { toString: () => 'owner' },
    customerInfo: { phone: '0912345678' },
    pricing: { depositAmount, totalAmount: 100000 },
    paymentStatus: PaymentStatus.UNPAID, orderStatus: OrderStatus.AWAITING_CONFIRMATION,
    timeline: [{ title: 'Đặt hàng' }, { title: 'Chờ thanh toán' }],
  };
  let writes = 0;
  const model = {
    findOne: () => ({ exec: async () => order }),
    findOneAndUpdate: (filter, update) => ({ exec: async () => {
      if (order.paymentStatus !== filter.paymentStatus) return null;
      writes++;
      Object.assign(order, update.$set);
      return order;
    } }),
  };
  const service = new OrdersService(null, model, null, null, null, null);
  return { service, order, writes: () => writes };
}
(async () => {
  process.env.NODE_ENV = 'development';
  process.env.ENABLE_PAYMENT_SIMULATION = 'true';
  await test('50% deposit and full payment are determined by server pricing', async () => {
    for (const [amount, status] of [[50000, PaymentStatus.PARTIALLY_PAID_DEPOSIT_50], [100000, PaymentStatus.PAID_FULL]]) {
      const { service, order } = fixture(amount);
      await service.processDemoPayment(order.orderCode, undefined, '0912345678');
      assert.equal(order.paymentStatus, status);
      assert.equal(order.timeline[1].completed, true);
      assert.match(order.timeline.at(-1).title, /mô phỏng/);
    }
  });
  await test('retries and concurrent confirmations do not double-write', async () => {
    const f = fixture();
    await Promise.all(Array.from({ length: 3 }, () => f.service.processDemoPayment('GF-DEMO', 'owner')));
    await f.service.processDemoPayment('GF-DEMO', 'owner');
    assert.equal(f.writes(), 1);
    assert.equal(f.order.timeline.length, 3);
  });
  await test('wrong guest phone cannot confirm an order', async () => {
    const f = fixture();
    await assert.rejects(f.service.processDemoPayment('GF-DEMO', undefined, '0999999999'), /Không tìm thấy/);
    assert.equal(f.writes(), 0);
  });
  await test('cancelled, refunded, refund-pending and zero-deposit orders are rejected', async () => {
    for (const change of [{ orderStatus: 'CANCELLED' }, { paymentStatus: 'REFUNDED' }, { refundPending: true }, { pricing: { depositAmount: 0 } }]) {
      const f = fixture();
      Object.assign(f.order, change);
      await assert.rejects(f.service.processDemoPayment('GF-DEMO', 'owner'));
      assert.equal(f.writes(), 0);
    }
  });
  await test('production and explicit disable always reject simulation', async () => {
    for (const [env, flag] of [['production', 'true'], ['development', 'false']]) {
      process.env.NODE_ENV = env;
      process.env.ENABLE_PAYMENT_SIMULATION = flag;
      await assert.rejects(fixture().service.processDemoPayment('GF-DEMO', 'owner'), /không khả dụng/);
    }
  });
  console.log(`${checks} payment demo checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => {
  if (previousEnvironment === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = previousEnvironment;
  if (previousFlag === undefined) delete process.env.ENABLE_PAYMENT_SIMULATION;
  else process.env.ENABLE_PAYMENT_SIMULATION = previousFlag;
});
