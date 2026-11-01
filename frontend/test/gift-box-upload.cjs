const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const signal = initial => {
  let value = initial;
  const read = () => value;
  read.set = next => { value = next; };
  read.update = change => { value = change(value); };
  return read;
};
const decorator = () => () => {};
const source = fs.readFileSync(path.join(__dirname, '../src/app/features/admin/products/admin-products.component.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true
} }).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => name === '@angular/core'
  ? { Component: decorator, ViewChild: decorator } : {}, loaded, loaded.exports);
const admin = Object.create(loaded.exports.AdminProductsComponent.prototype);
Object.assign(admin, {
  giftBoxesSaving: signal(false), giftBoxUploading: signal({}),
  giftBoxUploadMessages: signal({}), giftBoxUploadErrors: signal({}),
  giftBoxOptions: [{ id: 'NONE', image: '/none.svg' }, { id: 'SILK', image: '/silk.svg' }]
});
const pending = [];
admin.adminService = { uploadGiftBoxImage(file) { return { subscribe(observer) { pending.push({file, observer}); } }; } };
let saves = 0;
admin.api = { patch() { saves++; return { subscribe() {} }; } };
const select = (box, type = 'image/png', size = 100) => {
  const target = { files: [{ type, size }], value: 'photo.png' };
  admin.onGiftBoxFileSelected({ target }, box);
  assert.equal(target.value, '', 'reset chooser so the same file can be retried');
};
const [none, silk] = admin.giftBoxOptions;
select(none, 'text/plain');
select(none, 'image/png', 8 * 1024 * 1024 + 1);
assert.equal(pending.length, 0, 'invalid files never upload');
assert.equal(none.image, '/none.svg');
select(none);
select(none);
assert.equal(pending.length, 1, 'duplicate upload for a row is blocked');
select(silk);
assert.equal(pending.length, 2, 'different rows may upload independently');
admin.saveGiftBoxes();
assert.equal(saves, 0, 'cannot save before uploads settle');
pending[1].observer.error({error: {message: 'Cloudinary unavailable'}});
assert.equal(silk.image, '/silk.svg', 'failure preserves the existing image');
assert.equal(admin.giftBoxUploading().SILK, false);
assert.equal(admin.giftBoxUploadErrors().SILK, true);
assert.equal(admin.giftBoxUploadsPending(), true, 'another row is still pending');
pending[0].observer.next({url: 'https://res.cloudinary.com/demo/image/upload/box.png'});
assert.equal(none.image, 'https://res.cloudinary.com/demo/image/upload/box.png');
assert.equal(admin.giftBoxUploadsPending(), false);
assert.equal(admin.giftBoxUploadErrors().NONE, false);
select(silk);
pending[2].observer.next({url: 'data:image/png;base64,abc'});
assert.equal(silk.image, '/silk.svg', 'a fallback URL must not masquerade as a Cloudinary upload');
assert.equal(admin.giftBoxUploadErrors().SILK, true);
select(silk);
pending[3].observer.error({status: 0});
assert.match(admin.giftBoxUploadMessages().SILK, /backend.*3000/, 'network failures identify the unavailable backend');
select(silk);
pending[4].observer.error({name: 'TimeoutError'});
assert.match(admin.giftBoxUploadMessages().SILK, /thời gian chờ/, 'timeouts explain how to retry');
admin.saveGiftBoxes();
assert.equal(saves, 1, 'configuration may save after all uploads settle');
select(silk);
assert.equal(pending.length, 5, 'cannot upload during configuration save');
console.log('PASS gift-box upload validation, concurrent rows, retry, Cloudinary URL, and save coordination');
