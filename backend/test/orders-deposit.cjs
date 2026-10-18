require('reflect-metadata');
const assert = require('node:assert/strict');
const { OrdersService } = require('../dist/modules/orders/orders.service');
const { CartService } = require('../dist/modules/cart/cart.service');
const items = [
  { productId: { _id: 'custom', name: 'Custom', images: [] }, price: 160000, quantity: 2, isCustom: true },
  { productId: { _id: 'standard', name: 'Standard', images: [], isCustomizable: true }, price: 240000, quantity: 1, isCustom: false }
];
async function run(lines, method = 'COD', shippingMethod = 'STANDARD', discount = 0) {
  const cart = { items: structuredClone(lines), voucherCode: discount ? 'TEST' : '', save: async () => {} };
  const voucher = { code: 'TEST', eligible: true, itemDiscount: discount, shippingDiscount: 0, discountType: 'FIXED' };
  const service = new OrdersService(null, { create: async payload => payload }, { findOne: () => ({ populate: async () => cart }) }, null, null, null,
    { quote: async () => voucher, reserve: async () => voucher, release: async () => {} });
  const order = await service.createOrder({ sessionId: 'test', paymentMethod: method, shippingMethod });
  const cartService = new CartService({}, {}, {}, { list: async () => discount ? [voucher] : [] });
  const quote = await cartService.calculateCartTotals({ items: lines, shippingMethod, paymentMode: method === 'COD' ? 'DEPOSIT_50' : 'FULL_PAYMENT', voucherCode: discount ? 'TEST' : '', save: async () => {} });
  assert.equal(order.pricing.depositAmount, quote.pricing.depositAmount);
  assert.equal(order.pricing.remainingCodAmount, quote.pricing.remainingCodAmount);
  return order;
}
(async () => {
  const mixed = await run(items);
  assert.equal(mixed.pricing.depositAmount, 160000);
  assert.equal(mixed.pricing.remainingCodAmount, 400000);
  assert.deepEqual(mixed.items.map(item => item.depositRequired), [160000, 0]);
  const express = await run(items, 'COD', 'EXPRESS');
  assert.equal(express.pricing.depositAmount, 160000);
  assert.equal(express.pricing.remainingCodAmount, 450000);
  assert.equal((await run(items, 'VIETQR', 'EXPRESS')).pricing.depositAmount, 610000);
  assert.equal((await run([items[1]])).pricing.depositAmount, 0);
  assert.equal((await run([items[0]])).pricing.depositAmount, 160000);
  assert.equal((await run(items, 'COD', 'STANDARD', 500000)).pricing.depositAmount, 60000);
  console.log('Order creation matches cart deposits for mixed/custom/standard orders, quantity, shipping, discounts and full payment');
})().catch(error => { console.error(error); process.exitCode = 1; });
