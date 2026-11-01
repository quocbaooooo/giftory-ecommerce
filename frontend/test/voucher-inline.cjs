const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Subject } = require('rxjs');
const signal = value => { const read = () => value; read.set = next => { value = next; }; return read; };
const decorator = () => () => {};
const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/shared/components/cart-vouchers.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', compiled)(name => name === '@angular/core' ? { Component: decorator, ViewChild: decorator } : {}, loaded, loaded.exports);
const widget = Object.create(loaded.exports.CartVouchersComponent.prototype);
const requests = [];
let quantitiesPending = false;
Object.assign(widget, { inlineCode: '', busy: signal(false), inlineMessage: signal(''), inlineFailed: signal(false),
  cart: { quantitySyncPending: () => quantitiesPending, voucherSyncPending: () => false,
    applyVoucher(code) { const response = new Subject(); requests.push({ code, response }); return response; } }
});
widget.applyInlineCode();
assert.equal(requests.length, 0, 'blank codes do not submit');
widget.inlineCode = '  trian30k  ';
quantitiesPending = true;
widget.applyInlineCode();
assert.equal(requests.length, 0, 'wait until quantity synchronization completes');
quantitiesPending = false;
widget.applyInlineCode();
assert.equal(requests[0].code, 'TRIAN30K');
assert.equal(widget.busy(), true);
widget.applyInlineCode();
assert.equal(requests.length, 1, 'duplicate submit cannot race the first request');
requests[0].response.next({});
assert.equal(widget.busy(), false);
assert.equal(widget.inlineCode, '');
assert.match(widget.inlineMessage(), /TRIAN30K/);
widget.inlineCode = 'expired';
widget.applyInlineCode();
requests[1].response.error({ error: { message: 'Mã đã hết hạn' } });
assert.equal(widget.busy(), false);
assert.equal(widget.inlineCode, 'expired', 'retain invalid code for editing');
assert.equal(widget.inlineFailed(), true);
assert.equal(widget.inlineMessage(), 'Mã đã hết hạn');
widget.inlineCode = 'FREESHIP';
widget.applyInlineCode();
assert.equal(widget.inlineFailed(), false, 'retry clears the previous error');
requests[2].response.next({});
console.log('PASS inline voucher validation, normalization, sync guards, duplicate submit, and retry');
