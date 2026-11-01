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
const databaseRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'giftory-direct-gift-test-'));
const mongoPort = randomInt(35000, 45000);
const proc = spawn(process.env.MONGOD_BINARY || 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe', [
  '--dbpath', databaseRoot, '--port', String(mongoPort), '--bind_ip', '127.0.0.1', '--replSet', 'gifttest', '--logpath', path.join(databaseRoot, 'mongo.log'),
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
  process.env.MONGODB_URI = `mongodb://127.0.0.1:${mongoPort}/gift_test?directConnection=true`;
  process.env.JWT_ACCESS_SECRET = 'isolated-test-access';
  process.env.JWT_REFRESH_SECRET = 'isolated-test-refresh';
  let ready = false;
  for (let i = 0; i < 40; i++) {
    if (spawnError) throw spawnError;
    try {
      const connection = await mongoose.createConnection(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 300 }).asPromise();
      await connection.db.admin().command({replSetInitiate:{_id:'gifttest',members:[{_id:0,host:`127.0.0.1:${mongoPort}`}]}});
      for(let n=0;n<60;n++) {
        if((await connection.db.admin().command({hello:1})).isWritablePrimary) { ready=true; break; }
        await sleep(250);
      }
      await connection.close(); break;
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
  const db=app.get(getConnectionToken());
  const { CareService }=require('../dist/modules/care/care.service'); app.get(CareService).delivered=async()=>{};
  process.env.ENABLE_PAYMENT_SIMULATION='true'; process.env.NODE_ENV='development';
  await db.model('User').updateOne({_id:one.user._id},{$set:{role:'ADMIN'}});
  const product=await db.model('Product').create({name:'Gift Test',slug:'gift-test',description:'Test',price:100000,category:new mongoose.Types.ObjectId(),stock:20});
  const province=locations[0],ward=province.wards[0];
  const payload={ customerInfo:{name:'Recipient',phone:'0988888888',email:'recipient@example.test',address:'ignored',provinceCode:province.code,wardCode:ward.code,street:'12 Test Street'},
    gift:{enabled:true,anonymous:true,sender:{name:'Buyer Secret',phone:'0911111111',email:'buyer@example.test'}},
    greetingCard:{templateId:'LOVE',heading:'For you',message:'Enjoy your wonderful gift!'},paymentMode:'DEPOSIT_50',paymentMethod:'VIETQR',buyNowItem:{productId:String(product._id),quantity:1} };
  let order,rawToken;
  await test('gift rejects COD, missing buyer/card, long messages, same phone, anonymous name disclosure',async()=>{
    for(const input of [{...payload,paymentMethod:'COD'}, {...payload,gift:{enabled:true}}, {...payload,greetingCard:undefined}, {...payload,greetingCard:{...payload.greetingCard,message:'x'.repeat(201)}}, {...payload,customerInfo:{...payload.customerInfo,phone:'0911111111'}}, {...payload,greetingCard:{...payload.greetingCard,message:'From Buyer Secret'}}]) await request('POST','/orders',one.accessToken,input,400);
  });
  await test('both parties stored independently; full prepayment, zero COD, buyer-only simulated notice',async()=>{
    order=await request('POST','/orders',one.accessToken,payload,201);
    assert.equal(order.pricing.depositAmount,order.pricing.totalAmount); assert.equal(order.pricing.remainingCodAmount,0); assert.equal(order.paymentMode,'FULL_PAYMENT');
    assert.equal(order.customerInfo.email,''); assert.equal(order.gift.sender.email,'buyer@example.test');
    assert.equal(order.gift.notifications.length,1); assert.equal(order.gift.notifications[0].audience,'BUYER'); assert.equal(order.gift.notifications[0].status,'SIMULATED');
    assert.equal(order.gift.recipientAccessToken,undefined); assert.equal(order.gift.recipientAccessHash,undefined);
    const raw=await db.model('Order').findById(order._id); rawToken=raw.gift.recipientAccessToken; assert.equal(rawToken.length,43);
  });
  await test('recipient phone/account cannot read buyer order or cancel; buyer phone works',async()=>{
    await request('GET',`/orders/${order.orderCode}?phone=0988888888`,null,undefined,404);
    await request('GET',`/orders/${order.orderCode}`,two.accessToken,undefined,404);
    assert.equal((await request('GET',`/orders/${order.orderCode}?phone=0911111111`)).orderCode,order.orderCode);
    await request('PATCH',`/orders/${order._id}/cancel`,two.accessToken,{},404);
  });
  await test('blind slip/portal hide prices and buyer identity and use local QR rendering',async()=>{
    await request('GET',`/orders/admin/${order._id}/gift-slip`,two.accessToken,undefined,403);
    const slip=await request('GET',`/orders/admin/${order._id}/gift-slip`,one.accessToken);
    assert.ok(slip.qrImage.startsWith('data:image/png;base64,')); assert.equal(slip.recipientUrl.split('#')[1],rawToken);
    assert.equal(slip.senderLabel,'Giftory'); assert.equal(slip.collectPayment,false); assert.equal(slip.hidePrices,true);
    const view=await request('POST',`/orders/gift/${order.orderCode}/access`,null,{token:rawToken},201);
    const text=JSON.stringify(view); for(const secret of ['Buyer Secret','buyer@example.test','0911111111','unitPrice','totalAmount','remainingCodAmount','notifications','recipientAccessHash']) assert.ok(!text.includes(secret),secret);
    await request('POST',`/orders/gift/${order.orderCode}/access`,null,{token:'x'.repeat(43)},404);
    await request('POST',`/orders/gift/${order.orderCode}/warranty`,null,{token:rawToken,productId:String(product._id),reason:'BROKEN',description:'This item is broken'},400);
  });
  await test('cannot hand off unpaid gifts; payment preserves fulfillment; paid gift can be dispatched',async()=>{
    await request('POST',`/orders/admin/${order._id}/confirm`,one.accessToken,{bypassWaitTime:true},201);
    await request('POST',`/orders/admin/${order._id}/items/${order.items[0]._id}/pick`,one.accessToken,{},201);
    await request('POST',`/orders/admin/${order._id}/package`,one.accessToken,{},201);
    await request('POST',`/orders/admin/${order._id}/dispatch`,one.accessToken,{},400);
    const paid=await request('POST',`/orders/${order.orderCode}/demo-payment`,one.accessToken,{},201);
    assert.equal(paid.paymentStatus,'PAID_FULL'); assert.equal(paid.fulfillmentStatus,'PACKAGED');
    const dispatched=await request('POST',`/orders/admin/${order._id}/dispatch`,one.accessToken,{},201); assert.equal(dispatched.orderStatus,'IN_TRANSIT');
  });
  await test('failed gift delivery never auto-returns; invites only after buyer exception; valid reschedule',async()=>{
    const failed=await request('POST',`/orders/admin/${order._id}/delivery-result`,one.accessToken,{success:false,failureReason:'Recipient did not answer',allowRetry:false},201);
    assert.equal(failed.orderStatus,'IN_TRANSIT'); assert.notEqual(failed.fulfillmentStatus,'RETURNING'); assert.equal(failed.gift.exception.status,'AWAITING_BUYER');
    assert.equal(failed.gift.notifications.at(-1).audience,'BUYER');
    await request('POST',`/orders/admin/${order._id}/receive-return`,one.accessToken,{},400);
    await request('POST',`/orders/gift/${order.orderCode}/schedule`,null,{token:rawToken,window:new Date(Date.now()+86400000).toISOString()},400);
    const sent=await request('POST',`/orders/admin/${order._id}/gift-link/simulate`,one.accessToken,{},201); assert.equal(sent.status,'SIMULATED');
    await request('POST',`/orders/gift/${order.orderCode}/schedule`,null,{token:rawToken,window:new Date(Date.now()-86400000).toISOString()},400);
    const scheduled=await request('POST',`/orders/gift/${order.orderCode}/schedule`,null,{token:rawToken,window:new Date(Date.now()+86400000).toISOString()},201); assert.equal(scheduled.status,'CONFIRMED');
  });
  await test('POD required; recipient warranty is idempotent and cannot request refund',async()=>{
    await request('POST',`/orders/admin/${order._id}/delivery-result`,one.accessToken,{success:true},400);
    const done=await request('POST',`/orders/admin/${order._id}/delivery-result`,one.accessToken,{success:true,proofOfDelivery:'https://example.test/proof.jpg'},201);
    assert.equal(done.orderStatus,'DELIVERED'); assert.equal(done.gift.notifications.at(-1).audience,'BUYER');
    const warranty={token:rawToken,type:'WARRANTY',productId:String(product._id),reason:'BROKEN',description:'The gift arrived with broken parts.'};
    await request('POST',`/orders/gift/${order.orderCode}/warranty`,null,{...warranty,type:'REFUND'},400);
    await request('POST',`/orders/gift/${order.orderCode}/warranty`,null,{...warranty,resolution:'REFUND'},400);
    const item=await request('POST',`/orders/gift/${order.orderCode}/warranty`,null,warranty,201);
    const duplicate=await request('POST',`/orders/gift/${order.orderCode}/warranty`,null,warranty,201); assert.equal(item.id,duplicate.id);
    const stored=await db.model('SupportCase').findById(item.id); assert.equal(stored.claimantRole,'RECIPIENT'); assert.equal(stored.userId,undefined); assert.equal(stored.claimantPhone,'0988888888');
    await request('PATCH',`/care/admin/cases/${item.id}`,one.accessToken,{status:'RESOLVING',investigation:'Confirmed broken product on delivery',responsibility:'Warehouse',resolution:'REFUND'},400);
  });
  await test('custom gifts require full prepayment; legacy half-paid gifts settle before dispatch',async()=>{
    const custom=await db.model('Product').create({name:'Custom Gift',slug:'custom-gift',description:'Test',price:200000,category:product.category,stock:10,isCustomizable:true});
    const created=await request('POST','/orders',one.accessToken,{...payload,buyNowItem:{productId:String(custom._id),quantity:1,customDetails:{frontMessage:'Love'}}},201);
    assert.equal(created.items[0].isCustom,true); assert.equal(created.pricing.depositAmount,created.pricing.totalAmount); assert.equal(created.pricing.remainingCodAmount,0);
    await db.model('Order').updateOne({_id:created._id},{$set:{paymentStatus:'PARTIALLY_PAID_DEPOSIT_50',isPackaged:true,orderStatus:'PROCESSING','pricing.depositAmount':created.pricing.totalAmount/2,'pricing.remainingCodAmount':created.pricing.totalAmount/2}});
    await request('POST',`/orders/admin/${created._id}/dispatch`,one.accessToken,{},400);
    await request('POST',`/orders/${created.orderCode}/gift-settle-demo`,two.accessToken,{},404);
    const paid=await request('POST',`/orders/${created.orderCode}/gift-settle-demo`,one.accessToken,{},201);
    assert.equal(paid.paymentStatus,'PAID_FULL'); assert.equal(paid.pricing.remainingCodAmount,0);
    assert.equal(paid.gift.notifications.at(-1).kind,'PAYMENT_SETTLED');
    await request('POST',`/orders/admin/${created._id}/dispatch`,one.accessToken,{},201);
  });
  await test('normal COD remains unchanged',async()=>{
    const standard=await request('POST','/orders',one.accessToken,{...payload,gift:undefined,greetingCard:undefined,paymentMethod:'COD'},201);
    assert.equal(standard.gift,null); assert.equal(standard.pricing.depositAmount,0); assert.ok(standard.pricing.remainingCodAmount>0);
  });
  console.log(`${checks} isolated direct-gift integration checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (app) await app.close();
  proc.kill();
  if (proc.exitCode === null && !spawnError) await new Promise(resolve => proc.once('exit', resolve));
  // Only remove the freshly created isolated test directory after resolving its boundary.
  const resolved = fs.realpathSync(databaseRoot);
  const parent = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('giftory-direct-gift-test-')) fs.rmSync(resolved, { recursive: true, force: true });
});
