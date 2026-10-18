require('reflect-metadata');
const assert = require('node:assert/strict');
const { CartService } = require('../dist/modules/cart/cart.service');
const { OrdersService } = require('../dist/modules/orders/orders.service');
const id = '507f1f77bcf86cd799439011';
const product = { _id: id, name: 'Bình Khắc Laser', price: 250000, salePrice: 220000,
  customBaseFee: 30000, isCustomizable: true, stock: 100, images: [],
  variants: [{ name: 'Black style', sku: 'BLACK', price: 250000, stock: 100 }],
  toString() { return id; } };

function fixture() {
  let saves = 0;
  const cart = { items: [], paymentMode: 'DEPOSIT_50', shippingMethod: 'STANDARD',
    async save() { saves++; }, async populate() { this.items.forEach(item => { item.productId = product; }); } };
  const service = new CartService({}, { findById: async () => product }, {}, { list: async () => [] });
  service.findOrCreateCart = async () => cart;
  return { service, cart, saves: () => saves };
}

(async () => {
  const { service, cart } = fixture();
  const quote = await service.addItem({ productId: id, quantity: 1, customDetails: { customFee: 0 } });
  assert.equal(quote.items[0].price, 220000, 'sale 220k + explicit zero, not original 250k or default 30k fee');
  assert.equal(quote.items[0].depositRequired, 110000);
  assert.equal(quote.pricing.itemsTotal, 220000);
  assert.equal(quote.pricing.depositAmount, 110000);
  assert.equal(quote.items[0].variantSku, undefined);
  const quantity = await service.updateItemQuantity(0, 2);
  assert.equal(quantity.pricing.itemsTotal, 440000);
  assert.equal(quantity.pricing.depositAmount, 220000);
  await service.updateItemCustomDetails(0, { customFee: 20000 });
  assert.equal(cart.items[0].price, 240000);
  assert.equal(cart.items[0].depositRequired, 240000);
  await service.updateItemCustomDetails(0, { customFee: 0 });
  assert.equal(cart.items[0].price, 220000, 'editing back to zero must match a newly added item');
  assert.equal(cart.items[0].depositRequired, 220000);

  const old = fixture();
  old.cart.items = [{ productId: product, isCustom: true, customDetails: { customFee: 0 },
    price: 250000, quantity: 1, depositRequired: 125000 }];
  const repaired = await old.service.getCart();
  assert.equal(repaired.items[0].price, 220000);
  assert.equal(repaired.pricing.depositAmount, 110000);
  assert.equal(old.saves(), 1, 'persist the correction for existing cart items');
  await old.service.getCart();
  assert.equal(old.saves(), 1, 'an already-correct cart should not need another write');

  const fallback = fixture();
  await fallback.service.addItem({ productId: id, quantity: 1, customDetails: {} });
  assert.equal(fallback.cart.items[0].price, 250000, 'only a missing quote uses the default customization fee');
  product.salePrice = 0;
  await fallback.service.updateItemCustomDetails(0, { customFee: 0 });
  assert.equal(fallback.cart.items[0].price, 250000, 'no sale uses the actual original price');
  product.salePrice = 220000;
  for (const customFee of [-1, NaN, Infinity, '0']) {
    await assert.rejects(fallback.service.addItem({ productId: id, quantity: 1, customDetails: { customFee } }));
  }

  // A direct checkout must correct a legacy quote even if GET /cart was skipped.
  const stale = { items: [{ productId: product, isCustom: true, customDetails: { customFee: 0 },
    price: 250000, quantity: 1 }], async save() {} };
  const orders = new OrdersService(null, { create: async payload => payload },
    { findOne: () => ({ populate: async () => stale }) }, null, { findById: async () => product }, null);
  const order = await orders.createOrder({ sessionId: 'test', paymentMethod: 'COD' });
  assert.equal(order.items[0].unitPrice, 220000);
  assert.equal(order.items[0].depositRequired, 110000);
  assert.equal(order.pricing.depositAmount, 110000);
  const buyNow = await orders.createOrder({ paymentMethod: 'COD', buyNowItem: {
    productId: id, quantity: 1, customDetails: { customFee: 20000 } } });
  assert.equal(buyNow.items[0].unitPrice, 240000);
  assert.equal(buyNow.pricing.depositAmount, 120000);
  console.log('Studio/cart/order pricing: 220k sale, explicit zero, paid extras, edits, quantities, old cart repair and checkout passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
