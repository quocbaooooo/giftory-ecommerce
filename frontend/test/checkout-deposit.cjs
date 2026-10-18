const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/checkout/checkout.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
}).outputText;
function fixture(items, discount = 0, paymentMode = 'DEPOSIT_50') {
  const services = {
    CartService: { cart: () => ({ paymentMode }), items: () => items, itemsCount: () => items.length,
      pricing: () => ({ itemsTotal: items.reduce((sum, item) => sum + item.price * item.quantity, 0), voucherDiscount: discount }) },
    ActivatedRoute: { snapshot: { queryParamMap: { get: () => null } } }
  };
  const signal = value => { const read = () => value; read.set = next => { value = next; }; return read; };
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@angular/core') return { Component: () => target => target, inject: token => token, signal, computed: fn => fn };
    if (name === 'rxjs') return rx;
    if (name === '@angular/router' || name.includes('/services/')) return services;
    if (name.includes('environment')) return { environment: {} };
    return {};
  }, loaded, loaded.exports);
  return new loaded.exports.CheckoutComponent();
}
const custom = { price: 160000, quantity: 2, isCustom: true };
const standard = { price: 240000, quantity: 1, isCustom: false };
const checkout = fixture([custom, standard]);
assert.equal(checkout.selectedPaymentMethod(), 'COD', 'entering checkout preserves the cart deposit choice');
assert.equal(checkout.calculatedDepositAmount(), 160000);
assert.equal(checkout.displayPricing().remainingCodAmount, 400000);
checkout.selectedShippingMethod.set('EXPRESS');
assert.equal(checkout.calculatedDepositAmount(), 160000);
assert.equal(checkout.displayPricing().remainingCodAmount, 450000);
checkout.selectedPaymentMethod.set('VIETQR');
assert.equal(checkout.calculatedDepositAmount(), 610000);
assert.equal(fixture([standard]).calculatedDepositAmount(), 0);
assert.equal(fixture([{ ...standard, productId: { isCustomizable: true } }]).calculatedDepositAmount(), 0, 'an explicit standard item stays standard');
assert.equal(fixture([custom]).calculatedDepositAmount(), 160000);
const discounted = fixture([custom, standard], 500000);
assert.equal(discounted.calculatedDepositAmount(), 60000, 'deposit cannot exceed discounted total');
assert.equal(fixture([custom], 0, 'FULL_PAYMENT').selectedPaymentMethod(), 'VIETQR');
checkout.pendingOrder.set({ items: [], pricing: { totalAmount: 610000, depositAmount: 160000, remainingCodAmount: 450000 } });
assert.equal(checkout.calculatedDepositAmount(), 160000, 'the payment modal uses authoritative server pricing');
assert.equal(checkout.displayPricing().remainingCodAmount, 450000);
const buyNow = fixture([]);
buyNow.cartService.buyNowItem = () => ({ price: 160000, quantity: 2, customDetails: { customText: 'Tên' } });
buyNow.isBuyNowQuery.set(true);
assert.equal(buyNow.calculatedDepositAmount(), 160000);
console.log('Checkout: custom-only deposit, mixed orders, quantity, shipping, discounts, full payment, server result and Buy Now passed');
