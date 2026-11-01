const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/checkout/checkout.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
}).outputText;
const province = { code: '79', name: 'Thành phố Hồ Chí Minh' };
const ward = { code: '26734', name: 'Phường thử' };
const saved = { id: 'contact-1', name: 'Nguyễn Minh Anh', phone: '0912345678', provinceCode: province.code, provinceName: province.name, wardCode: ward.code, wardName: ward.name, street: '128 Đường Số 7', address: `128 Đường Số 7, ${ward.name}, ${province.name}` };
function fixture(loggedIn = true) {
  const wardRequests = [], saves = [], orders = [];
  const saveResponse = new rx.Subject();
  const services = {
    RecipientService: {
      wards: code => { const response = new rx.Subject(); wardRequests.push({ code, response }); return response; },
      save: input => { saves.push(input); return saveResponse; },
      remove: () => rx.of([]),
    },
    AuthService: { isAuthenticated: () => loggedIn },
    CartService: { cart: () => null, quantitySyncPending: () => false, voucherSyncPending: () => false, itemsCount: () => 1, items: () => [], getSessionId: () => 'test-session', pricing: () => ({ itemsTotal: 100000, voucherDiscount: 0 }) },
    OrderService: { createOrder: payload => { orders.push(payload); return new rx.Subject(); } },
    Router: {}, ActivatedRoute: { snapshot: { queryParamMap: { get: () => null } } },
  };
  const signal = value => { const read = () => value; read.set = next => { value = next; }; read.update = fn => { value = fn(value); }; return read; };
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@angular/core') return { Component: () => target => target, inject: token => token, signal, computed: fn => fn };
    if (name === 'rxjs') return rx;
    if (name === '@angular/common' || name === '@angular/forms') return {};
    if (name.includes('cart-vouchers.component')) return { CartVouchersComponent: class {} };
    if (name.includes('greeting-card-preview.component')) return { GreetingCardPreviewComponent: class {} };
    if (name === '@angular/router' || name.includes('/services/')) return services;
    if (name.includes('environments/environment')) return { environment: { production: false } };
    throw new Error(`Unexpected dependency ${name}`);
  }, module, module.exports);
  const component = new module.exports.CheckoutComponent();
  component.provinces.set([province, { code: '01', name: 'Thành phố Hà Nội' }]);
  component.recipients.set([saved]);
  return { component, wardRequests, saves, saveResponse, orders };
}
const f=fixture(); const c=f.component;
c.customerName='Minh Anh'; c.customerPhone='0912345678'; c.customerEmail='buyer@example.test'; c.street='12 My Street'; c.provinceCode=province.code; c.wardCode=ward.code; c.wards.set([ward]);
assert.equal(c.directGift(),false); assert.equal(c.selectedPaymentMethod(),'COD');
c.setDirectGift(true);
assert.equal(c.buyerName,'Minh Anh'); assert.equal(c.buyerPhone,'0912345678'); assert.equal(c.buyerEmail,'buyer@example.test');
assert.equal(c.customerName,''); assert.equal(c.customerPhone,''); assert.equal(c.street,''); assert.equal(c.includeGreetingCard(),true); assert.equal(c.selectedPaymentMethod(),'VIETQR');
assert.equal(c.calculatedDepositAmount(),c.calculatedTotalAmount());
c.customerName='Recipient'; c.customerPhone='0988888888'; c.street='99 Gift Street'; c.provinceCode=province.code; c.wards.set([ward]); c.wardCode=ward.code;
c.greetingCardTemplates.set([{id:'BIRTHDAY',name:'Test'}]); c.greetingCardMessage='Happy birthday to you!';
c.selectedPaymentMethod.set('COD'); c.submitOrder(); assert.equal(f.orders.length,0); assert.match(c.giftError(),/COD/);
c.selectedPaymentMethod.set('VIETQR'); c.greetingCardMessage='x'.repeat(201); c.submitOrder(); assert.equal(f.orders.length,0); assert.match(c.greetingCardError(),/200/);
c.greetingCardMessage='From Minh Anh'; c.giftAnonymous=true; c.submitOrder(); assert.equal(f.orders.length,0); assert.ok(c.giftError());
c.greetingCardMessage='Happy birthday to you!'; c.giftAnonymous=true; c.submitOrder();
assert.equal(f.orders.length,1); const payload=f.orders[0];
assert.equal(payload.gift.enabled,true); assert.equal(payload.gift.anonymous,true); assert.equal(payload.gift.sender.phone,'0912345678');
assert.equal(payload.customerInfo.phone,'0988888888'); assert.equal(payload.customerInfo.email,''); assert.equal(payload.paymentMode,'FULL_PAYMENT'); assert.equal(payload.paymentMethod,'VIETQR');
console.log('PASS gift checkout isolates buyer/recipient, hides COD, enforces full payment and 200-character card, and validates anonymity');
const g=fixture().component; g.customerName='Minh Anh'; g.customerPhone='0912345678'; g.customerEmail='buyer@example.test'; g.street='12 My Street'; g.provinceCode=province.code; g.wardCode=ward.code; g.wards.set([ward]);
g.setDirectGift(true); g.customerName='Other'; g.customerPhone='0988888888'; g.setDirectGift(false);
assert.equal(g.customerName,'Minh Anh'); assert.equal(g.customerPhone,'0912345678'); assert.equal(g.street,'12 My Street'); assert.equal(g.selectedPaymentMethod(),'COD'); assert.equal(g.includeGreetingCard(),false);
console.log('PASS turning gift mode off restores the buyer delivery and ordinary COD scenario');
g.customerName='Buyer updated before gifting';
g.setDirectGift(true);
assert.equal(g.buyerName,'Buyer updated before gifting');
g.buyerName='Buyer edited while gifting'; g.buyerPhone='0901234567'; g.buyerEmail='updated@example.test';
g.setDirectGift(false);
assert.equal(g.customerName,'Buyer edited while gifting'); assert.equal(g.customerPhone,'0901234567'); assert.equal(g.customerEmail,'updated@example.test');
assert.equal(g.street,'12 My Street');
console.log('PASS buyer edits survive toggling gift delivery and self-delivery');
