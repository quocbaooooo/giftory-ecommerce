const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomInt } = require('node:crypto');
require('reflect-metadata');
const mongoose = require('mongoose');
const { evaluateVoucher, shippingPrice } = require('../dist/modules/vouchers/voucher.rules');
const { VouchersService } = require('../dist/modules/vouchers/vouchers.service');
const { CartService } = require('../dist/modules/cart/cart.service');
const { OrdersService } = require('../dist/modules/orders/orders.service');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'giftory-vouchers-test-'));
const port = randomInt(35000, 45000);
const proc = spawn(process.env.MONGOD_BINARY || 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe', [
  '--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--logpath', path.join(directory, 'mongo.log'),
], { windowsHide: true, stdio: 'ignore' });
let spawnError, connection, previewApp, previewServer, count = 0;
proc.on('error', error => { spawnError = error; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) { await run(); count++; console.log(`PASS ${name}`); }
(async () => {
  for (let i = 0; i < 40; i++) {
    if (spawnError) throw spawnError;
    const candidate = mongoose.createConnection(`mongodb://127.0.0.1:${port}/vouchers_test`, { serverSelectionTimeoutMS: 300 });
    try { connection = await candidate.asPromise(); break; }
    catch { await candidate.close(); await sleep(100); }
  }
  assert.ok(connection, 'Isolated MongoDB did not start');
  const model = (name, file) => connection.model(name, require(`../dist/database/schemas/${file}.schema`)[`${name}Schema`]);
  const Voucher = model('Voucher', 'voucher'), User = model('User', 'user'), Txn = model('LoyaltyTransaction', 'loyalty-transaction');
  const Product = model('Product', 'product'), Cart = model('Cart', 'cart'), Order = model('Order', 'order');
  const vouchers = new VouchersService(Voucher, User, Txn);
  const carts = new CartService(Cart, Product, Voucher, vouchers);
  const orders = new OrdersService({}, Order, Cart, User, Product, Txn, vouchers);
  const user = await User.create({ name: 'Test', email: 'voucher@example.test', password: 'test-only' });
  const product = await Product.create({ name: 'Apron', slug: 'apron', description: 'Test gift', category: new mongoose.Types.ObjectId(), price: 210000, salePrice: 175000, stock: 100 });
  const create = (code, extra = {}) => Voucher.create({ code, title: code, discountType: 'FIXED', discountValue: 30000, minOrderValue: 200000, usageLimit: 100, ...extra });
  const fixed = await create('TRIAN30K');
  const percent = await create('PERCENT', { discountType: 'PERCENT', discountValue: 15, maxDiscount: 40000 });
  await create('FREESHIP', { discountValue: 35000, minOrderValue: 150000 }); // Original legacy FIXED type.
  await create('EXPIRED', { expiresAt: new Date(Date.now() - 1000) });
  await create('EXHAUSTED', { usedCount: 100 });
  await create('DISABLED', { isActive: false });
  await create('POINTS', { requiredPoints: 50, minOrderValue: 0 });
  await test('standard shipping boundary matches checkout; express remains chargeable', async () => {
    assert.deepEqual([0, 175000, 249999, 250000, 500000].map(n => shippingPrice(n)), [0, 30000, 30000, 0, 0]);
    assert.equal(shippingPrice(260000, 'EXPRESS'), 50000);
  });
  await test('fixed, rounded percentage, cap, and oversized discount never exceed item value', async () => {
    assert.equal((await vouchers.quote(' trian30k ', 260000, 0)).itemDiscount, 30000);
    assert.equal((await vouchers.quote('PERCENT', 260001, 0)).itemDiscount, 39000);
    assert.equal((await vouchers.quote('PERCENT', 500000, 0)).itemDiscount, 40000);
    assert.equal(evaluateVoucher({ ...fixed.toObject(), minOrderValue: 0, discountValue: 999999 }, 100000, 30000).totalAmount, 30000);
  });
  await test('legacy freeship discounts shipping only and cannot discount free standard delivery', async () => {
    const quote = await vouchers.quote('FREESHIP', 175000, 30000);
    assert.equal(quote.discountType, 'FREESHIP'); assert.equal(quote.itemDiscount, 0);
    assert.equal(quote.shippingDiscount, 30000); assert.equal(quote.totalAmount, 175000);
    assert.equal((await vouchers.quote('FREESHIP', 260000, 50000)).shippingDiscount, 35000);
    assert.equal((await vouchers.quote('FREESHIP', 260000, 0)).eligible, false);
  });
  await test('expired, disabled, exhausted, point-locked and under-minimum vouchers are rejected', async () => {
    for (const code of ['EXPIRED', 'DISABLED', 'EXHAUSTED', 'POINTS']) {
      await assert.rejects(vouchers.reserve(code, 260000, 0), /./);
    }
    const quote = await vouchers.quote('TRIAN30K', 175000, 30000);
    assert.equal(quote.eligible, false); assert.equal(quote.missingAmount, 25000);
    await assert.rejects(vouchers.quote(undefined, 260000, 0));
  });
  await test('offers rank real savings and saving is persistent, idempotent, account scoped and does not reserve quota', async () => {
    await Promise.all([vouchers.save('TRIAN30K', String(user._id)), vouchers.save(' trian30k ', String(user._id))]);
    assert.deepEqual((await User.findById(user._id)).savedVoucherCodes, ['TRIAN30K']);
    const offers = await vouchers.list(260000, 0, String(user._id));
    assert.equal(offers[0].code, 'PERCENT'); assert.equal(offers[0].recommended, true);
    assert.equal(offers.filter(v => v.recommended).length, 1);
    assert.equal(offers.find(v => v.code === 'TRIAN30K').saved, true);
    assert.equal((await vouchers.list(260000, 0)).find(v => v.code === 'TRIAN30K').saved, false);
    assert.equal((await Voucher.findById(fixed._id)).usedCount, 0);
  });
  const session = 'voucher-cart';
  await test('cart recalculates percentage on every quantity change and clears invalid discounts with a reason', async () => {
    await carts.addItem({ productId: String(product._id), quantity: 2, sessionId: session });
    let cart = await carts.applyVoucher('PERCENT', undefined, session);
    assert.equal(cart.pricing.voucherDiscount, 40000);
    cart = await carts.updateItemQuantity(0, 1, undefined, session);
    assert.equal(cart.pricing.itemsTotal, 175000); assert.equal(cart.pricing.voucherDiscount, 0);
    assert.equal(cart.voucherCode, ''); assert.ok(cart.voucherNotice);
    assert.equal(cart.pricing.totalAmount, 205000);
    assert.equal((await Voucher.findById(percent._id)).usedCount, 0);
  });
  await test('freeship survives eligible shipping changes and is removable', async () => {
    let cart = await carts.applyVoucher('FREESHIP', undefined, session);
    assert.equal(cart.pricing.totalAmount, 175000);
    cart = await carts.setShippingMethod('EXPRESS', undefined, session);
    assert.equal(cart.pricing.shippingFee, 15000); assert.equal(cart.pricing.totalAmount, 190000);
    cart = await carts.applyVoucher('', undefined, session);
    assert.equal(cart.pricing.totalAmount, 225000); assert.equal(cart.voucherCode, '');
  });
  await test('last voucher use is reserved atomically under concurrent orders', async () => {
    await create('LAST', { usageLimit: 1 });
    const results = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => vouchers.reserve('LAST', 260000, 0, undefined, `TEST-${i}`)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await Voucher.findOne({ code: 'LAST' })).usedCount, 1);
  });
  await test('one redeemed point voucher buys one use, even under concurrency', async () => {
    await Txn.create({ userId: user._id, type: 'REDEEM', referenceId: 'POINTS', points: -50, balanceAfter: 50, description: 'Test' });
    const results = await Promise.allSettled(Array.from({ length: 5 }, (_, i) => vouchers.reserve('POINTS', 260000, 0, String(user._id), `POINT-${i}`)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal((await Voucher.findOne({ code: 'POINTS' })).usedCount, 1);
    assert.equal((await vouchers.quote('POINTS', 260000, 0, String(user._id))).eligible, false);
  });
  const dto = { sessionId: session, customerInfo: { name: 'Buyer', phone: '0912345678', email: '', address: 'Test address' }, shippingMethod: 'EXPRESS', paymentMethod: 'VIETQR' };
  await test('order uses fresh shipping and voucher quote, stores a snapshot, consumes one use and clears cart', async () => {
    await carts.applyVoucher('FREESHIP', undefined, session);
    const order = await orders.createOrder(dto);
    assert.equal(order.voucherCode, 'FREESHIP'); assert.equal(order.voucherType, 'FREESHIP');
    assert.equal(order.pricing.voucherDiscount, 0); assert.equal(order.pricing.shippingDiscount, 35000);
    assert.equal(order.pricing.shippingFee, 15000); assert.equal(order.pricing.totalAmount, 190000);
    assert.equal(order.pricing.depositAmount, 190000);
    assert.equal((await Voucher.findOne({ code: 'FREESHIP' })).usedCount, 1);
    assert.equal((await carts.getCart(undefined, session)).items.length, 0);
  });
  await test('failure to persist order releases reserved quota and keeps cart', async () => {
    await carts.addItem({ productId: String(product._id), quantity: 2, sessionId: session });
    await carts.applyVoucher('TRIAN30K', undefined, session);
    const failing = new OrdersService({}, { create: async () => { throw new Error('Simulated write failure'); } }, Cart, User, Product, Txn, vouchers);
    await assert.rejects(failing.createOrder(dto), /Simulated write failure/);
    assert.equal((await Voucher.findById(fixed._id)).usedCount, 0);
    assert.equal((await carts.getCart(undefined, session)).items.length, 1);
  });
  await test('checkout rejects a code exhausted after cart preview, without creating an order', async () => {
    const before = await Order.countDocuments();
    await Voucher.updateOne({ code: 'TRIAN30K' }, { usedCount: 100 });
    await assert.rejects(orders.createOrder(dto));
    assert.equal(await Order.countDocuments(), before);
    const cart = await carts.getCart(undefined, session);
    assert.equal(cart.voucherCode, ''); assert.equal(cart.pricing.voucherDiscount, 0); assert.ok(cart.voucherNotice);
  });
  console.log(`${count} voucher integration checks passed`);
  if (process.argv.includes('--preview')) {
    await Voucher.updateOne({ code: 'TRIAN30K' }, { usedCount: 0 });
    await create('TRIAN50K', { discountValue: 50000, minOrderValue: 300000 });
    await Cart.deleteMany({});
    process.env.MONGODB_URI = `mongodb://127.0.0.1:${port}/vouchers_test`;
    process.env.JWT_ACCESS_SECRET = 'voucher-preview-only';
    process.env.JWT_REFRESH_SECRET = 'voucher-preview-refresh-only';
    const { NestFactory } = require('@nestjs/core');
    const { ValidationPipe } = require('@nestjs/common');
    const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
    previewApp = await NestFactory.create(require('../dist/app.module').AppModule, { logger: false });
    previewApp.enableCors({ origin: 'http://127.0.0.1:4200' });
    previewApp.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    previewApp.useGlobalInterceptors(new TransformInterceptor());
    previewApp.setGlobalPrefix('api');
    await previewApp.listen(3000, '127.0.0.1');
    // Serve the built UI with an in-memory API URL replacement; source/config stay untouched.
    const staticRoot = path.resolve(__dirname, '../../frontend/dist/frontend/browser');
    previewServer = require('node:http').createServer((request, response) => {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      let filename = path.resolve(staticRoot, '.' + pathname);
      if (!filename.startsWith(staticRoot + path.sep)) filename = path.join(staticRoot, 'index.html');
      if (!fs.existsSync(filename) || fs.statSync(filename).isDirectory()) filename = path.join(staticRoot, 'index.html');
      const extension = path.extname(filename);
      response.setHeader('Content-Type', ({ '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' })[extension] || 'application/octet-stream');
      const contents = fs.readFileSync(filename);
      response.end(extension === '.js' ? contents.toString().replaceAll('https://giftory-ecommerce.onrender.com/api', 'http://127.0.0.1:3000/api') : contents);
    });
    await new Promise(resolve => previewServer.listen(4200, '127.0.0.1', resolve));
    console.log('Isolated voucher preview ready at http://127.0.0.1:4200. Press Enter to stop.');
    process.stdin.resume(); await new Promise(resolve => process.stdin.once('data', resolve)); process.stdin.pause();
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (previewServer) await new Promise(resolve => previewServer.close(resolve));
  if (previewApp) await previewApp.close();
  if (connection) await connection.close();
  proc.kill();
  if (proc.exitCode === null && !spawnError) await new Promise(resolve => proc.once('exit', resolve));
  const resolved = fs.realpathSync(directory), parent = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('giftory-vouchers-test-')) fs.rmSync(resolved, { recursive: true, force: true });
});
