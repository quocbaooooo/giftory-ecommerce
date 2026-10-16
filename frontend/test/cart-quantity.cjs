const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/core/services/cart.service.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText;
const signal = value => { const read = () => value; read.set = next => { value = next; }; return read; };
const tick = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const clone = value => JSON.parse(JSON.stringify(value));
function snapshot(items, paymentMode = 'DEPOSIT_50') {
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = itemsTotal >= 250000 || itemsTotal === 0 ? 0 : 30000;
  const depositAmount = paymentMode === 'FULL_PAYMENT' ? itemsTotal + shippingFee
    : items.reduce((sum, item) => sum + (item.isCustom ? Math.round(item.price * item.quantity * 0.5) : 0), 0);
  return {
    _id: 'cart-test', items, paymentMode, voucherDiscount: 0, includeGiftWrap: true,
    pricing: { itemsTotal, voucherDiscount: 0, shippingFee, giftWrapFee: 0, totalAmount: itemsTotal + shippingFee, depositAmount, remainingCodAmount: itemsTotal + shippingFee - depositAmount, totalCustomItems: items.reduce((sum, item) => sum + (item.isCustom ? item.quantity : 0), 0) },
  };
}
async function fixture({ custom = false, paymentMode = 'DEPOSIT_50', voucher = null, shippingMethod = 'STANDARD' } = {}) {
  const requests = [], timers = new Map(), storage = new Map();
  let timerId = 0;
  const makeRequest = (method, url, body) => {
    const response = new rx.Subject(); requests.push({ method, url, body, response }); return response;
  };
  const api = { get: (url, body) => makeRequest('GET', url, body), patch: (url, body) => makeRequest('PATCH', url, body),
    delete: url => makeRequest('DELETE', url), post: (url, body) => makeRequest('POST', url, body) };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', code)(name => {
    if (name === '@angular/core') return { Injectable: () => target => target, signal, computed: fn => fn };
    if (name === 'rxjs') return rx;
    if (name.includes('api.service')) return {};
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports,
  { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  { getItem: () => null }, callback => { timers.set(++timerId, callback); return timerId; }, id => timers.delete(id));
  const service = new module.exports.CartService(api);
  await tick();
  let server = snapshot([
    { _id: 'line-a', productId: { _id: 'cup', name: 'Ly' }, quantity: 1, price: 260000, isCustom: custom, depositRequired: custom ? 130000 : 0 },
    { _id: 'line-b', productId: { _id: 'apron', name: 'Tạp dề' }, quantity: 1, price: 175000, isCustom: false, depositRequired: 0 },
  ], paymentMode);
  server.shippingMethod = shippingMethod;
  server.appliedVoucher = voucher;
  requests[0].response.next(clone(server)); requests[0].response.complete(); await tick();
  requests.length = 0;
  const fire = async () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(callback => callback()); await tick(); };
  const reply = async request => {
    const index = Number(request.url.match(/items\/(\d+)/)?.[1]);
    if (request.method === 'PATCH') server.items[index].quantity = request.body.quantity;
    if (request.method === 'DELETE') server.items.splice(index, 1);
    if (request.method === 'POST' && request.url === 'cart/items') {
      server.items.find(item => item.productId._id === request.body.productId).quantity += request.body.quantity;
    }
    server = snapshot(server.items, paymentMode);
    request.response.next(clone(server)); request.response.complete(); await tick();
  };
  return { service, requests, fire, reply };
}
let count = 0;
async function test(name, run) { await run(); count++; console.log(`PASS ${name}`); }
(async () => {
  await test('two product lines stay two while total quantity and prices update immediately', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 2).subscribe();
    f.service.updateQuantity(0, 3).subscribe();
    assert.equal(f.service.productCount(), 2);
    assert.equal(f.service.itemsCount(), 4);
    assert.equal(f.service.pricing().itemsTotal, 955000);
    assert.equal(f.service.pricing().shippingFee, 0);
    assert.equal(f.service.quantitySyncPending(), true);
    assert.equal(f.requests.length, 0);
    await f.fire();
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].body.quantity, 3);
    await f.reply(f.requests[0]);
    assert.equal(f.service.quantitySyncPending(), false);
    assert.equal(f.service.items()[0].quantity, 3);
  });
  await test('a slow response cannot rewind newer rapid edits', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 2).subscribe(); await f.fire();
    f.service.updateQuantity(0, 3).subscribe();
    f.service.updateQuantity(0, 4).subscribe();
    await f.fire();
    assert.equal(f.requests.length, 1);
    await f.reply(f.requests[0]);
    assert.equal(f.service.items()[0].quantity, 4);
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].body.quantity, 4);
    await f.reply(f.requests[1]);
    assert.equal(f.service.items()[0].quantity, 4);
    assert.equal(f.service.quantitySyncPending(), false);
  });
  await test('edits to different products are saved serially without losing either', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 3).subscribe();
    f.service.updateQuantity(1, 2).subscribe(); await f.fire();
    assert.equal(f.requests.length, 1);
    await f.reply(f.requests[0]);
    assert.deepEqual(f.service.items().map(item => item.quantity), [3, 2]);
    assert.equal(f.requests.length, 2);
    await f.reply(f.requests[1]);
    assert.deepEqual(f.service.items().map(item => item.quantity), [3, 2]);
    assert.equal(f.service.pricing().itemsTotal, 1130000);
    assert.equal(f.service.quantitySyncPending(), false);
  });
  await test('stock failure rolls back the failed line, keeps other edits and permits retry', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 99).subscribe();
    f.service.updateQuantity(1, 2).subscribe(); await f.fire();
    f.requests[0].response.error({ error: { message: 'Số lượng vượt quá tồn kho' } }); await tick();
    assert.deepEqual(f.service.items().map(item => item.quantity), [1, 2]);
    assert.equal(f.service.quantityError(), 'Số lượng vượt quá tồn kho');
    await f.reply(f.requests[1]);
    f.service.updateQuantity(0, 2).subscribe(); await f.fire();
    await f.reply(f.requests[2]);
    assert.equal(f.service.items()[0].quantity, 2);
    assert.equal(f.service.quantityError(), null);
    assert.equal(f.service.quantitySyncPending(), false);
  });
  await test('decrement below one cannot implicitly delete a product', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 0).subscribe(); await f.fire();
    assert.equal(f.requests.length, 0);
    assert.equal(f.service.productCount(), 2);
    assert.equal(f.service.items()[0].quantity, 1);
  });
  await test('queued removals resolve by stable line ID after indexes shift', async () => {
    const f = await fixture();
    f.service.removeItem(0).subscribe();
    f.service.removeItem(1).subscribe(); await tick();
    assert.equal(f.requests.length, 1);
    await f.reply(f.requests[0]);
    assert.match(f.requests[1].url, /items\/0\?/);
    await f.reply(f.requests[1]);
    assert.equal(f.service.productCount(), 0);
  });
  await test('adding the same product waits for quantity edits instead of losing units', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 3).subscribe();
    f.service.addItem('cup', 1).subscribe(); await tick();
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].method, 'PATCH');
    await f.reply(f.requests[0]);
    assert.equal(f.requests[1].method, 'POST');
    await f.reply(f.requests[1]);
    assert.equal(f.service.items()[0].quantity, 4);
  });
  await test('optimistic percentage discount is recalculated and capped while quantity saves', async () => {
    const f = await fixture({ voucher: { code: 'PERCENT', discountType: 'PERCENT', discountValue: 10, maxDiscount: 60000, minOrderValue: 200000 } });
    f.service.updateQuantity(0, 2).subscribe();
    assert.equal(f.service.pricing().voucherDiscount, 60000);
    assert.equal(f.service.pricing().totalAmount, 635000);
  });
  await test('optimistic freeship only reduces shipping and follows the selected delivery method', async () => {
    const f = await fixture({ shippingMethod: 'EXPRESS', voucher: { code: 'SHIP', discountType: 'FREESHIP', discountValue: 35000, minOrderValue: 0, maxDiscount: 0 } });
    f.service.updateQuantity(0, 2).subscribe();
    assert.equal(f.service.pricing().voucherDiscount, 0);
    assert.equal(f.service.pricing().shippingDiscount, 35000);
    assert.equal(f.service.pricing().shippingFee, 15000);
    assert.equal(f.service.pricing().totalAmount, 710000);
  });
  await test('applying a voucher waits for the latest quantity and reports pending state until confirmed', async () => {
    const f = await fixture();
    f.service.updateQuantity(0, 2).subscribe();
    f.service.applyVoucher('TEST').subscribe();
    await tick();
    assert.equal(f.service.voucherSyncPending(), true);
    assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].method, 'PATCH');
    await f.reply(f.requests[0]); await tick();
    assert.equal(f.requests[1].url, 'cart/apply-voucher');
    await f.reply(f.requests[1]);
    assert.equal(f.service.voucherSyncPending(), false);
  });
  await test('custom deposits and full-payment totals update alongside quantities', async () => {
    const deposit = await fixture({ custom: true });
    deposit.service.updateQuantity(0, 3).subscribe();
    assert.equal(deposit.service.pricing().totalCustomItems, 3);
    assert.equal(deposit.service.pricing().depositAmount, 390000);
    assert.equal(deposit.service.pricing().remainingCodAmount, 565000);
    await deposit.fire(); await deposit.reply(deposit.requests[0]);
    assert.equal(deposit.service.pricing().depositAmount, 390000);
    const full = await fixture({ paymentMode: 'FULL_PAYMENT' });
    full.service.updateQuantity(0, 3).subscribe();
    assert.equal(full.service.pricing().depositAmount, 955000);
    assert.equal(full.service.pricing().remainingCodAmount, 0);
    await full.fire(); await full.reply(full.requests[0]);
    assert.equal(full.service.pricing().depositAmount, 955000);
  });
  console.log(`${count} cart quantity checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; });
