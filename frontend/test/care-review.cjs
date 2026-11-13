const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const source = fs.readFileSync('src/app/features/care/care.component.ts', 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
const moduleState = { exports: {} };
new Function('require', 'module', 'exports', code)(name => name === '@angular/core' ? { Component: () => target => target, afterNextRender: () => {} } : {}, moduleState, moduleState.exports);
const { CareComponent } = moduleState.exports;
const state = value => { const read = () => value; read.set = next => value = next; return read; };
function fixture(status = 'DELIVERED', productId = 'product-a') {
  const component = Object.create(CareComponent.prototype);
  Object.assign(component, { orders: state([{ _id: 'order-a', orderStatus: status, items: [{ productId: 'product-a' }, { productId: { _id: 'product-b' } }] }]), reviews: state([]), error: state(''), route: { snapshot: { queryParamMap: { get: key => ({ intent: 'review', orderId: 'order-a', productId })[key] } } }, orderId: '', productId: '', reviewContent: '', reviewFiles: [], rating: 5, reviewLinkHandled: false });
  component.act = (...args) => component.submission = args;
  return component;
}
for (const product of ['product-a', 'product-b']) {
  const c = fixture('DELIVERED', product); c.openLinkedReview();
  assert.equal(c.orderId, 'order-a'); assert.equal(c.productId, product);
  c.reviewContent = 'Quà đẹp, đóng gói cẩn thận'; c.submitReview();
  assert.equal(c.submission[1].productId, product);
}
for (const status of ['PENDING', 'SHIPPING', 'CANCELLED']) {
  const c = fixture(status); c.openLinkedReview();
  assert.equal(c.orderId, ''); assert.ok(c.error());
  c.orderId = 'order-a'; c.productId = 'product-a'; c.submitReview(); assert.equal(c.submission, undefined);
}
const foreign = fixture('DELIVERED', 'foreign'); foreign.openLinkedReview(); assert.ok(foreign.error());
const c = fixture(); c.openLinkedReview();
for (const status of ['PENDING', 'APPROVED']) {
  c.reviews.set([{ orderId: 'order-a', productId: 'product-a', status }]); c.submitReview(); assert.equal(c.submission, undefined);
}
c.reviews.set([{ orderId: 'order-a', productId: 'product-a', status: 'REJECTED', rating: 3, content: 'Cần thêm thông tin', attachments: ['photo'] }]);
c.selectReviewProduct('product-a'); assert.equal(c.rating, 3); assert.equal(c.reviewContent, 'Cần thêm thông tin');
c.submitReview(); assert.equal(c.submission[0], 'care/reviews');
c.selectReviewProduct('product-b'); assert.equal(c.rating, 5); assert.equal(c.reviewContent, ''); assert.deepEqual(c.reviewFiles, []);
console.log('PASS review links select delivered owned orders/products, block duplicate submissions, and reset drafts');
