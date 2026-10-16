const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
const { TestScheduler } = require('rxjs/testing');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/checkout/checkout.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText;
function fixture(scheduler, fail = false) {
  const requests = [], navigations = [];
  const order = { orderCode: 'GF-DEMO', customerInfo: { phone: '0912345678' }, paymentStatus: 'UNPAID', pricing: { depositAmount: 50000, totalAmount: 100000 } };
  const services = {
    OrderService: { simulateDemoPayment: (code, phone) => {
      requests.push({ code, phone, time: scheduler.now() });
      return fail ? rx.throwError(() => new Error('Offline')) : rx.of({ ...order, paymentStatus: 'PARTIALLY_PAID_DEPOSIT_50' });
    } },
    CartService: { cart: () => null, quantitySyncPending: () => false, voucherSyncPending: () => false }, AuthService: {},
    Router: { navigate: (...args) => navigations.push(args) }, ActivatedRoute: {},
  };
  const signal = value => {
    const read = () => value;
    read.set = next => { value = next; };
    read.update = update => { value = update(value); };
    return read;
  };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@angular/core') return { Component: () => target => target, inject: token => token, signal, computed: fn => fn };
    if (name === 'rxjs') return { ...rx, timer: (due, period) => rx.timer(due, period, scheduler) };
    if (name === '@angular/common' || name === '@angular/forms') return {};
    if (name.includes('cart-vouchers.component')) return { CartVouchersComponent: class {} };
    if (name.includes('greeting-card-preview.component')) return { GreetingCardPreviewComponent: class {} };
    if (name === '@angular/router') return services;
    if (name.includes('environments/environment')) return { environment: { production: false } };
    if (name.includes('/services/')) return services;
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const component = new module.exports.CheckoutComponent();
  component.pendingOrder.set(order);
  component.showPaymentModal.set(true);
  return { component, requests, navigations };
}
let count = 0;
function test(name, run) {
  const scheduler = new TestScheduler((a, b) => assert.deepEqual(a, b));
  scheduler.run(() => run(scheduler));
  count++;
  console.log(`PASS ${name}`);
}
test('automatic confirmation runs at 4 seconds and navigates using server result', scheduler => {
  const f = fixture(scheduler);
  f.component.startPaymentPolling();
  scheduler.schedule(() => assert.equal(f.requests.length, 0), 3999);
  scheduler.schedule(() => {
    assert.deepEqual(f.requests, [{ code: 'GF-DEMO', phone: '0912345678', time: 4000 }]);
    assert.deepEqual(f.navigations[0][0], ['/payment-result', 'GF-DEMO']);
    assert.equal(f.component.showPaymentModal(), false);
  }, 4001);
});
test('failure stays on QR screen and retry reuses the same order', scheduler => {
  const f = fixture(scheduler, true);
  f.component.startPaymentPolling();
  scheduler.schedule(() => {
    assert.ok(f.component.paymentError());
    assert.equal(f.navigations.length, 0);
    assert.equal(f.component.showPaymentModal(), true);
    f.component.retryPayment();
    assert.equal(f.component.paymentError(), null);
  }, 4001);
  scheduler.schedule(() => {
    assert.equal(f.requests.length, 2);
    assert.equal(f.requests[1].code, 'GF-DEMO');
  }, 8002);
});
test('leaving checkout cancels the automatic payment', scheduler => {
  const f = fixture(scheduler);
  f.component.startPaymentPolling();
  scheduler.schedule(() => f.component.ngOnDestroy(), 2000);
  scheduler.schedule(() => assert.equal(f.requests.length, 0), 5000);
});
console.log(`${count} checkout demo checks passed`);
