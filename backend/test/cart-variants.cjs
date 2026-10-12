require('reflect-metadata');
const assert = require('node:assert/strict');
const { CartService } = require('../dist/modules/cart/cart.service');
const id = '507f1f77bcf86cd799439011';
const product = { price: 100, stock: 30, images: ['common'], variants: [
  { name: 'Red', sku: 'RS', price: 120, stock: 2, image: 'red' },
  { name: 'Red', sku: 'RM', price: 140, stock: 4, image: 'red-m' },
  { name: 'Blue', sku: 'BS', price: 150, stock: 0 },
  { name: 'Hidden', sku: 'H', price: 150, stock: 10, status: 'HIDDEN' }
] };
const cart = { items: [], save: async () => {} };
const service = new CartService({}, { findById: async () => product }, {});
service.findOrCreateCart = async () => cart;
service.getCart = async () => cart;
(async () => {
  for (const payload of [{}, { variantName: 'Red' }, { variantSku: 'bad' }, { variantSku: 'BS' }, { variantSku: 'H' }]) {
    await assert.rejects(service.addItem({ productId: id, quantity: 1, ...payload }));
  }
  await service.addItem({ productId: id, quantity: 1, variantSku: 'RS' });
  assert.equal(cart.items[0].price, 120);
  assert.equal(cart.items[0].image, 'red');
  await service.addItem({ productId: id, quantity: 1, variantSku: 'RM' });
  assert.equal(cart.items.length, 2);
  assert.equal(cart.items[1].price, 140);
  await assert.rejects(service.addItem({ productId: id, quantity: 2, variantSku: 'RS' }));
  await assert.rejects(service.updateItemQuantity(0, 3));
  await assert.rejects(service.updateItemQuantity(0, 1.5));
  await service.addItem({ productId: id, quantity: 1, variantSku: 'RS' });
  assert.equal(cart.items[0].quantity, 2);
  console.log('Cart variants: required selection, SKU identity, price, image and cumulative stock checks passed');
})().catch(err => { console.error(err); process.exitCode = 1; });
