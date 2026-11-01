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
let count = 0;
function test(name, run) { run(); count++; console.log(`PASS ${name}`); }
test('saved recipient fills the form and composes the address after loading wards', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  assert.equal(f.component.customerName, saved.name);
  assert.equal(f.component.customerPhone, saved.phone);
  assert.equal(f.component.street, saved.street);
  assert.equal(f.component.wardCode, '');
  assert.equal(f.component.recipientValid(), false);
  f.wardRequests[0].response.next([ward]);
  assert.equal(f.component.wardCode, ward.code);
  assert.equal(f.component.customerAddress, saved.address);
  assert.equal(f.component.recipientValid(), true);
});
test('changing province clears ward and stale responses cannot replace new options', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  f.component.changeProvince('01');
  assert.equal(f.component.wardCode, '');
  f.wardRequests[0].response.next([ward]);
  assert.deepEqual(f.component.wards(), []);
  f.wardRequests[1].response.next([{ code: '00001', name: 'Phường Hà Nội' }]);
  assert.equal(f.component.wards()[0].code, '00001');
  assert.equal(f.component.wardCode, '');
});
test('save normalizes phone and selects the persisted recipient', () => {
  const f = fixture();
  f.component.directGift.set(true);
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  f.component.customerPhone = '+84 912 345 678';
  f.component.street = ' 128   Đường Số 7 ';
  f.component.saveRecipient();
  assert.equal(f.saves[0].phone, '0912345678');
  assert.equal(f.saves[0].street, saved.street);
  assert.equal(f.component.recipientSaving(), true);
  assert.equal(f.saves[0].purpose, 'RECIPIENT');
  f.saveResponse.next([saved]);
  assert.equal(f.component.recipientSaving(), false);
  assert.equal(f.component.selectedRecipientId, saved.id);
  assert.ok(f.component.recipientNotice());
});
test('guest can enter structured address but cannot save contacts', () => {
  const f = fixture(false);
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  assert.equal(f.component.recipientValid(), true);
  f.component.saveRecipient();
  assert.equal(f.saves.length, 0);
});
test('new recipient clears old address; deleting keeps the current order form', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  f.component.removeRecipient();
  assert.deepEqual(f.component.recipients(), []);
  assert.equal(f.component.customerAddress, saved.address);
  f.component.selectRecipient('');
  assert.equal(f.component.customerName, '');
  assert.equal(f.component.customerPhone, '');
  assert.equal(f.component.customerAddress, '');
});
test('failed save leaves entered data available for retry', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  f.component.saveRecipient();
  f.saveResponse.error(new Error('Offline'));
  assert.equal(f.component.recipientSaving(), false);
  assert.ok(f.component.recipientFormError());
  assert.equal(f.component.customerAddress, saved.address);
});
console.log(`${count} checkout recipient checks passed`);

test('member checkout uses profile address without reselecting province or ward', () => {
  const f = fixture(); const c = f.component;
  c.authService.currentUser = () => ({ address: { detailAddress: '12 Profile Street', street: 'Old Street', ward: 'Profile Ward', district: 'Profile District', city: 'Profile City' } });
  c.customerName = 'Buyer Name'; c.customerPhone = '0912345678';
  assert.equal(c.usesSavedBuyerAddress(), true);
  assert.equal(c.recipientValid(), true);
  assert.equal(c.provinceCode, '');
  c.submitOrder();
  assert.equal(f.orders[0].customerInfo.address, '12 Profile Street, Profile Ward, Profile District, Profile City');
  assert.equal(f.orders[0].customerInfo.provinceCode, undefined);
  assert.equal(f.orders[0].customerInfo.street, undefined);
});

test('saved buyer address preserves buyer contact; new addresses require structured entry', () => {
  const f = fixture(); const c = f.component;
  c.authService.currentUser = () => ({ address: { street: '12 Home', city: 'Home City' } });
  c.customerName = 'Buyer Name'; c.customerPhone = '0901234567';
  c.recipients.set([{ ...saved, purpose: 'DELIVERY' }]);
  c.selectBuyerAddress(saved.id);
  assert.equal(c.customerAddress, saved.address);
  assert.equal(c.customerName, 'Buyer Name'); assert.equal(c.customerPhone, '0901234567');
  c.selectBuyerAddress('new');
  assert.equal(c.usesSavedBuyerAddress(), false); assert.equal(c.customerAddress, ''); assert.equal(c.recipientValid(), false);
  c.provinceCode = province.code; c.wards.set([ward]); c.wardCode = ward.code; c.street = '99 New Street';
  c.saveRecipient();
  const stored = { ...saved, purpose: 'DELIVERY', id: 'new-address', name: c.customerName, phone: c.customerPhone, street: c.street, address: `99 New Street, ${ward.name}, ${province.name}` };
  f.saveResponse.next([stored]);
  assert.equal(f.saves[0].purpose, 'DELIVERY');
  assert.equal(c.buyerAddressChoice(), stored.id); assert.equal(c.customerAddress, stored.address);
});
function enableGift(component) {
  component.directGift.set(true);
  component.selectedPaymentMethod.set('VIETQR');
  component.buyerName = 'Gift Buyer'; component.buyerPhone = '0988888888'; component.buyerEmail = 'buyer@example.test';
}

test('gift greeting card is submitted separately from delivery notes', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  f.component.greetingCardTemplates.set([{ id: 'LOVE', name: 'Lãng mạn' }]);
  enableGift(f.component);
  f.component.greetingCardTemplateId.set('LOVE');
  f.component.greetingCardHeading = '  Gửi người bạn thân nhất  ';
  f.component.greetingCardMessage = '  Thương bạn nhiều!\nMột ngày thật vui nhé.  ';
  f.component.customerNote = 'Gọi trước khi giao';
  f.component.submitOrder();
  assert.deepEqual(f.orders[0].greetingCard, { templateId: 'LOVE', heading: 'Gửi người bạn thân nhất', message: 'Thương bạn nhiều!\nMột ngày thật vui nhé.' });
  assert.equal(f.orders[0].customerInfo.note, 'Gọi trước khi giao');
});
test('blank or overflowing greeting card blocks placing an order', () => {
  const f = fixture();
  enableGift(f.component);
  f.component.greetingCardTemplates.set([{ id: 'BIRTHDAY', name: 'Thanh lịch' }]);
  for (const message of ['  ', 'a'.repeat(201), Array(7).fill('Chúc vui').join('\n')]) {
    f.component.greetingCardMessage = message;
    f.component.submitOrder();
    assert.ok(f.component.greetingCardError());
    assert.equal(f.orders.length, 0);
  }
});
test('turning greeting card off omits its draft from the order', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  f.component.greetingCardMessage = 'Chỉ là bản nháp';
  f.component.directGift.set(false);
  f.component.submitOrder();
  assert.equal(f.orders.length, 1);
  assert.equal(f.orders[0].greetingCard, undefined);
});
test('style changes preserve a custom heading and message in the submitted card', () => {
  const f = fixture();
  f.component.selectRecipient(saved.id);
  f.wardRequests[0].response.next([ward]);
  enableGift(f.component);
  f.component.greetingCardTemplates.set([{ id: 'BIRTHDAY', name: 'Thanh lịch' }, { id: 'LOVE', name: 'Lãng mạn' }, { id: 'THANK_YOU', name: 'Tự nhiên' }]);
  f.component.greetingCardHeading = 'Mừng ngày đặc biệt của mẹ';
  f.component.greetingCardMessage = 'Chúc mẹ luôn vui và khỏe!';
  for (const id of ['LOVE', 'BIRTHDAY', 'THANK_YOU']) {
    f.component.greetingCardTemplateId.set(id);
    assert.equal(f.component.greetingCardHeading, 'Mừng ngày đặc biệt của mẹ');
    assert.equal(f.component.greetingCardMessage, 'Chúc mẹ luôn vui và khỏe!');
  }
  f.component.submitOrder();
  assert.equal(f.orders[0].greetingCard.templateId, 'THANK_YOU');
  assert.equal(f.orders[0].greetingCard.heading, 'Mừng ngày đặc biệt của mẹ');
});
test('empty and oversized headings block checkout when a card is requested', () => {
  for (const heading of ['   ', 'a'.repeat(81)]) {
    const f = fixture();
    enableGift(f.component);
    f.component.greetingCardHeading = heading;
    f.component.submitOrder();
    assert.equal(f.orders.length, 0);
    assert.match(f.component.greetingCardError(), /tiêu đề/);
  }
});
console.log('5 checkout greeting card checks passed');
