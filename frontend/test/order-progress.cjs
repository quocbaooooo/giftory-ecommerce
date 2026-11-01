const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
const { TestScheduler } = require('rxjs/testing');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/orders/orders.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText;
function fixture(scheduler) {
  let serverOrder = { orderCode: 'GF-TEST', orderStatus: 'AWAITING_CONFIRMATION', fulfillmentStatus: 'AT_WORKSHOP', paymentStatus: 'PAID_FULL', trackingCode: 'legacy-code', timeline: [] };
  let requests = 0;
  const services = { OrderService: { getOrderByCode: () => { requests++; return rx.of(serverOrder); } }, AuthService: { isAuthenticated: () => true },
    ActivatedRoute: { paramMap: rx.of(new Map([['code', 'GF-TEST']])), queryParamMap: rx.of(new Map()) }, Router: {} };
  const signal = value => { const read = () => value; read.set = next => { value = next; }; return read; };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@angular/core') return { Component: () => target => target, inject: token => token, signal, computed: fn => fn };
    if (name === 'rxjs') return { ...rx, timer: (due, period) => rx.timer(due, period, scheduler) };
    if (name === 'rxjs/operators') return require(name);
    if (name === '@angular/common' || name === '@angular/forms' || name.includes('greeting-card-preview.component')) return {};
    if (name === '@angular/router' || name.includes('/services/')) return services;
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const component = new module.exports.OrdersComponent();
  component.activeOrder.set(serverOrder);
  return { component, set: changes => { serverOrder = { ...serverOrder, ...changes }; component.activeOrder.set(serverOrder); }, serverOnly: changes => { serverOrder = { ...serverOrder, ...changes }; }, requests: () => requests };
}
const f = fixture();
assert.equal(f.component.getStepStageNumber(), 1, 'paid but unconfirmed legacy orders must stay at step 1');
assert.equal(f.component.getStepperProgressPercent(), 0);
assert.equal(f.component.getOrderTrackingCode(), 'Chưa có mã vận đơn');
assert.equal(f.component.getOrderHeaderBadge().label, 'Chờ Xác Nhận (12h - 48h)');
for (const [changes, stage] of [
  [{ orderStatus: 'CONFIRMED', fulfillmentStatus: 'CONFIRMED' }, 2],
  [{ orderStatus: 'PROCESSING', fulfillmentStatus: 'QUALITY_INSPECTION' }, 2],
  [{ fulfillmentStatus: 'PACKAGED', isPackaged: true }, 3],
  [{ orderStatus: 'IN_TRANSIT' }, 4],
  [{ orderStatus: 'DELIVERED' }, 5],
]) { f.set(changes); assert.equal(f.component.getStepStageNumber(), stage); }
assert.equal(f.component.getStepIcon(5), 'check');
console.log('PASS progress follows admin state; payment alone cannot advance confirmation or expose tracking');
f.set({ timeline: [
  { title: 'Bàn giao Shipper', completed: false, timestamp: '2030-01-01', description: 'Scheduled only' },
  { title: 'Đặt hàng', completed: true, timestamp: '2026-11-01T10:00:00Z', description: '' },
  { title: 'Đã thanh toán', completed: true, timestamp: '2026-11-01T11:00:00Z', description: '' },
  { title: 'Đóng gói (US-04.04, BR-09)', completed: true, timestamp: '2026-11-01T12:00:00Z', description: 'quy trình BP-04' },
] });
assert.deepEqual(f.component.getOrderTimeline().map(e => e.title), ['Đóng gói', 'Đã thanh toán', 'Đặt hàng']);
assert.ok(!f.component.getOrderTimeline().some(e => e.description.includes('BP-04')));
console.log('PASS history shows only actual events, newest first, without internal process labels');
const scheduler = new TestScheduler((a, b) => assert.deepEqual(a, b));
global.history = { state: {} };
scheduler.run(() => {
  const p = fixture(scheduler);
  p.component.ngOnInit();
  scheduler.schedule(() => {
    assert.equal(p.component.getStepStageNumber(), 1);
    p.serverOnly({ orderStatus: 'CONFIRMED', fulfillmentStatus: 'CONFIRMED' });
  }, 14000);
  scheduler.schedule(() => {
    assert.equal(p.component.getStepStageNumber(), 2);
    assert.equal(p.requests(), 2);
    p.component.ngOnDestroy();
  }, 15001);
  scheduler.schedule(() => assert.equal(p.requests(), 2, 'polling stops when leaving page'), 31000);
});
console.log('PASS admin updates refresh on the customer page and polling is cleaned up on exit');
