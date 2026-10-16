const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomInt } = require('node:crypto');
require('reflect-metadata');
const mongoose = require('mongoose');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { getConnectionToken } = require('@nestjs/mongoose');
const { TransformInterceptor } = require('../dist/common/interceptors/transform.interceptor');
const { locations } = require('../dist/modules/recipients/locations.data');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const databaseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'giftory-recipients-test-'));
const mongoPort = randomInt(35000, 45000);
const proc = spawn(process.env.MONGOD_BINARY || 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe', [
  '--dbpath', databaseRoot, '--port', String(mongoPort), '--bind_ip', '127.0.0.1', '--logpath', path.join(databaseRoot, 'mongo.log'),
], { windowsHide: true, stdio: 'ignore' });
let spawnError, app, baseUrl, checks = 0;
const preview = process.argv.includes('--preview');
proc.on('error', error => { spawnError = error; });
async function test(name, run) { await run(); checks++; console.log(`PASS ${name}`); }
async function request(method, route, token, body, expected = 200) {
  const response = await fetch(`${baseUrl}${route}`, { method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await response.json();
  assert.equal(response.status, expected, JSON.stringify(data));
  return data.data;
}
(async () => {
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${mongoPort}/recipients_test`;
  process.env.JWT_ACCESS_SECRET = 'isolated-test-access';
  process.env.JWT_REFRESH_SECRET = 'isolated-test-refresh';
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (spawnError) throw spawnError;
    try {
      const connection = await mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 300 }).asPromise();
      await connection.close(); ready = true; break;
    } catch { await sleep(100); }
  }
  assert.ok(ready, 'Isolated MongoDB did not start');
  const { AppModule } = require('../dist/app.module');
  app = await NestFactory.create(AppModule, { logger: false });
  if (preview) app.enableCors({ origin: 'http://127.0.0.1:4200' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors(new TransformInterceptor());
  app.setGlobalPrefix('api');
  await app.listen(preview ? 3000 : 0, '127.0.0.1');
  baseUrl = `${await app.getUrl()}/api`;
  const one = await request('POST', '/auth/register', null, { name: 'Người mua một', email: 'one@example.test', password: 'Test-password-123' }, 201);
  const two = await request('POST', '/auth/register', null, { name: 'Người mua hai', email: 'two@example.test', password: 'Test-password-123' }, 201);
  const province = locations[0], ward = province.wards[0];
  const input = { name: '  Nguyễn   Minh Anh  ', phone: '+84 912 345 678', provinceCode: province.code, wardCode: ward.code, street: '  128   Đường Số 7  ' };
  let saved;
  await test('complete local location catalog and province-scoped wards', async () => {
    const provinces = await request('GET', '/locations/provinces');
    assert.equal(provinces.length, 34);
    assert.equal(locations.reduce((sum, item) => sum + item.wards.length, 0), 3321);
    assert.equal(new Set(locations.flatMap(item => item.wards.map(ward => ward.code))).size, 3321);
    const wards = await request('GET', `/locations/provinces/${province.code}/wards`);
    assert.deepEqual(wards, province.wards);
  });
  await test('guests cannot read or write saved recipients', async () => {
    await request('GET', '/recipients', null, undefined, 401);
    await request('POST', '/recipients', null, input, 401);
  });
  await test('save normalizes whitespace, phone and server-owned address names', async () => {
    saved = (await request('POST', '/recipients', one.accessToken, { ...input, provinceName: 'Fake', address: 'Fake', ownerId: two.user._id }, 201))[0];
    assert.equal(saved.name, 'Nguyễn Minh Anh');
    assert.equal(saved.phone, '0912345678');
    assert.equal(saved.address, `128 Đường Số 7, ${ward.name}, ${province.name}`);
  });
  await test('relogin retrieves the same saved contact', async () => {
    const session = await request('POST', '/auth/login', null, { email: 'one@example.test', password: 'Test-password-123' });
    assert.equal((await request('GET', '/recipients', session.accessToken))[0].id, saved.id);
  });
  await test('concurrent duplicate saves keep a single contact', async () => {
    await Promise.all(Array.from({ length: 3 }, () => request('POST', '/recipients', one.accessToken, input, 201)));
    assert.equal((await request('GET', '/recipients', one.accessToken)).length, 1);
  });
  await test('other account cannot read or delete the saved contact', async () => {
    assert.deepEqual(await request('GET', '/recipients', two.accessToken), []);
    assert.deepEqual(await request('DELETE', `/recipients/${saved.id}`, two.accessToken), []);
    assert.equal((await request('GET', '/recipients', one.accessToken)).length, 1);
  });
  await test('invalid phone and wards belonging to another province are rejected', async () => {
    await request('POST', '/recipients', one.accessToken, { ...input, phone: '123' }, 400);
    await request('POST', '/recipients', one.accessToken, { ...input, wardCode: locations[1].wards[0].code }, 400);
    await request('POST', '/recipients', one.accessToken, { ...input, street: '  ' }, 400);
  });
  await test('order stores an independent structured and formatted address snapshot', async () => {
    const connection = app.get(getConnectionToken());
    const product = await connection.model('Product').create({ name: 'Quà thử', slug: 'recipient-test-gift', description: 'Quà thử', price: 100000, category: new mongoose.Types.ObjectId(), stock: 5 });
    const payload = {
      customerInfo: { name: saved.name, phone: saved.phone, address: 'Spoofed address', provinceCode: province.code, wardCode: ward.code, street: saved.street },
      paymentMode: 'FULL_PAYMENT', paymentMethod: 'VIETQR', buyNowItem: { productId: String(product._id), quantity: 1 },
    };
    await request('POST', '/orders', one.accessToken, { ...payload, customerInfo: { ...payload.customerInfo, wardCode: locations[1].wards[0].code } }, 400);
    const order = await request('POST', '/orders', one.accessToken, payload, 201);
    assert.equal(order.customerInfo.address, saved.address);
    assert.equal(order.customerInfo.provinceCode, province.code);
    assert.equal(order.customerInfo.wardName, ward.name);
    await request('DELETE', `/recipients/${saved.id}`, one.accessToken);
    assert.deepEqual(await request('GET', '/recipients', one.accessToken), []);
    const persisted = await request('GET', `/orders/${order.orderCode}`, one.accessToken);
    assert.equal(persisted.customerInfo.address, saved.address);
    assert.equal(persisted.greetingCard, null);
  });
  await test('greeting card catalog, validation and saved print content', async () => {
    const templates = await request('GET', '/orders/greeting-card-templates');
    assert.equal(templates.length, 3);
    const connection = app.get(getConnectionToken());
    const product = await connection.model('Product').findOne({ slug: 'recipient-test-gift' });
    const payload = {
      customerInfo: { name: saved.name, phone: saved.phone, address: saved.address },
      paymentMode: 'FULL_PAYMENT', paymentMethod: 'COD', buyNowItem: { productId: String(product._id), quantity: 1 },
    };
    for (const card of [
      { templateId: 'UNKNOWN', message: 'Chúc vui' },
      { templateId: 'LOVE', message: '  ' },
      { templateId: 'LOVE', message: 'a'.repeat(301) },
      { templateId: 'LOVE', message: Array(7).fill('Chúc vui').join('\n') },
      { templateId: 'LOVE', heading: '  ', message: 'Chúc vui' },
      { templateId: 'LOVE', heading: 'a'.repeat(81), message: 'Chúc vui' },
      { templateId: 'LOVE', heading: null, message: 'Chúc vui' },
    ]) await request('POST', '/orders', one.accessToken, { ...payload, greetingCard: card }, 400);
    const order = await request('POST', '/orders', one.accessToken, {
      ...payload, greetingCard: { templateId: 'LOVE', templateName: 'Fake style', heading: '  Gửi   người bạn đặc biệt  ', message: '  Thương bạn nhiều!\r\nChúc một ngày thật vui.  ' },
    }, 201);
    assert.equal(order.greetingCard.templateName, 'Lãng mạn');
    assert.equal(order.greetingCard.heading, 'Gửi người bạn đặc biệt');
    assert.equal(order.greetingCard.message, 'Thương bạn nhiều!\nChúc một ngày thật vui.');
    const persisted = await request('GET', `/orders/${order.orderCode}`, one.accessToken);
    assert.deepEqual(persisted.greetingCard, order.greetingCard);
    await request('GET', `/orders/admin/${order.orderCode}`, two.accessToken, undefined, 403);
    await connection.model('User').updateOne({ _id: one.user._id }, { $set: { role: 'ADMIN' } });
    const workshopOrder = await request('GET', `/orders/admin/${order.orderCode}`, one.accessToken);
    assert.equal(workshopOrder.greetingCard.message, order.greetingCard.message);
    assert.equal(workshopOrder.greetingCard.heading, 'Gửi người bạn đặc biệt');
    await request('POST', `/orders/admin/${order._id}/confirm`, one.accessToken, { bypassWaitTime: true }, 201);
    await request('POST', `/orders/admin/${order._id}/items/${order.items[0]._id}/pick`, one.accessToken, {}, 201);
    const packed = await request('POST', `/orders/admin/${order._id}/package`, one.accessToken, {}, 201);
    assert.equal(packed.isPackaged, true);
    assert.match(packed.timeline.at(-1).description, /kèm thiệp Lãng mạn/);
    assert.deepEqual(packed.greetingCard, order.greetingCard);
    const legacy = await request('POST', '/orders', one.accessToken, { ...payload, greetingCard: { templateId: 'THANK_YOU', message: 'Cảm ơn bạn!' } }, 201);
    assert.equal(legacy.greetingCard.heading, 'Gửi bạn thật nhiều yêu thương');
    if (preview) console.log(`Preview order: ${order.orderCode}`);
  });
  await test('voucher catalog and saved codes enforce authentication and account isolation', async () => {
    const connection = app.get(getConnectionToken());
    const voucher = await connection.model('Voucher').create({ code: 'SAVE20K', title: 'Saved offer', discountType: 'FIXED', discountValue: 20000, usageLimit: 100 });
    await request('POST', '/vouchers/SAVE20K/save', null, {}, 401);
    await request('POST', '/vouchers/SAVE20K/save', one.accessToken, {}, 201);
    await request('POST', '/vouchers/SAVE20K/save', one.accessToken, {}, 201);
    assert.equal((await request('GET', '/vouchers', one.accessToken)).find(v => v.code === 'SAVE20K').saved, true);
    assert.equal((await request('GET', '/vouchers', two.accessToken)).find(v => v.code === 'SAVE20K').saved, false);
    assert.equal((await request('GET', '/vouchers')).find(v => v.code === 'SAVE20K').saved, false);
    assert.equal((await connection.model('Voucher').findById(voucher._id)).usedCount, 0);
    await request('POST', '/cart/apply-voucher', one.accessToken, {}, 400);
  });
  console.log(`${checks} recipient integration checks passed`);
  if (preview) {
    console.log('Isolated preview ready. Sign in as one@example.test / Test-password-123. Press Enter to stop.');
    process.stdin.resume();
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.pause();
  }
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (app) await app.close();
  proc.kill();
  if (proc.exitCode === null && !spawnError) await new Promise(resolve => proc.once('exit', resolve));
  // Only remove the freshly created isolated test directory after resolving its boundary.
  const resolved = fs.realpathSync(databaseRoot);
  const parent = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('giftory-recipients-test-')) fs.rmSync(resolved, { recursive: true, force: true });
});
