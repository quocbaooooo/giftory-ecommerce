const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
function compile(file) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  }).outputText;
  const loaded = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@angular/core') return { Injectable: () => target => target };
    if (name === 'rxjs' || name === 'rxjs/operators') return rx;
    return {};
  }, loaded, loaded.exports);
  return loaded.exports;
}
const { ProductService } = compile('src/app/core/services/product.service.ts');
const { AdminService } = compile('src/app/core/services/admin.service.ts');
const originalNow = Date.now;
let clock = 1000;
Date.now = () => clock;
try {
  const requests = [];
  const request = (endpoint, params) => {
    const response = new rx.Subject();
    requests.push({ endpoint, params, response });
    return response;
  };
  const api = { getWithMeta: request, get: request, post: request, patch: request, delete: request };
  const service = new ProductService(api);
  const results = [];
  const first = service.getCatalogProducts({ limit: 12, sort: 'popular' }).subscribe(value => results.push(value));
  service.getCatalogProducts({ sort: 'popular', limit: '12', empty: '' }).subscribe(value => results.push(value));
  assert.equal(requests.length, 1, 'simultaneous equivalent queries share one request');
  assert.equal(requests[0].params.view, 'catalog');
  first.unsubscribe();
  const payload = { items: [{ _id: 'one', price: 123 }], meta: { total: 1 } };
  requests[0].response.next(payload); requests[0].response.complete();
  service.getCatalogProducts({ limit: 12, sort: 'popular' }).subscribe(value => assert.deepEqual(value, payload));
  assert.equal(requests.length, 1, 'returning to a page reuses the completed response');
  clock += 60001;
  service.getCatalogProducts({ limit: 12, sort: 'popular' }).subscribe();
  assert.equal(requests.length, 2, 'expired cache fetches fresh prices');
  requests[1].response.next(payload); requests[1].response.complete();
  service.getCatalogProducts({ limit: 12, sort: 'popular', category: 'mugs' }).subscribe({ error() {} });
  assert.equal(requests.length, 3, 'different filters never reuse another result');
  requests[2].response.error(new Error('Offline'));
  service.getCatalogProducts({ limit: 12, sort: 'popular', category: 'mugs' }).subscribe();
  assert.equal(requests.length, 4, 'a failed fetch is retryable');
  const admin = new AdminService(api, service);
  admin.updateProduct('one', { price: 456 }).subscribe();
  requests.at(-1).response.next({ success: true });
  service.getCatalogProducts({ limit: 12, sort: 'popular' }).subscribe();
  assert.equal(requests.length, 6, 'a successful admin update invalidates cached lists');
  requests.at(-1).response.next(payload); requests.at(-1).response.complete();
  admin.updateProduct('one', {}).subscribe({ error() {} });
  requests.at(-1).response.error(new Error('Rejected'));
  service.getCatalogProducts({ limit: 12, sort: 'popular' }).subscribe();
  assert.equal(requests.length, 7, 'a failed mutation does not invalidate good data');
  service.prefetchProductList();
  service.getCatalogProducts({ sort: 'popular', page: 1, limit: 12 }).subscribe();
  assert.equal(requests.length, 8, 'prefetch and navigation share an in-flight request');
  const count = requests.length;
  service.getProducts({ limit: 100 }).subscribe();
  service.getProducts({ limit: 100 }).subscribe();
  assert.equal(requests.length, count + 2);
  assert.equal(requests.at(-1).params.view, undefined, 'admin requests retain full editable products');
  service.getProductBySlug('one').subscribe(); service.getProductBySlug('one').subscribe();
  assert.equal(requests.length, count + 4, 'product details and purchase options remain fresh');
  for (let i = 0; i < 50; i++) service.getCatalogProducts({ search: 'query-' + i }).subscribe();
  assert.ok(service.catalogCache.size <= 40, 'searching cannot grow the cache without bound');
  console.log('Catalog cache: deduplication, instant revisit, expiry, filter isolation, retries, admin invalidation, prefetch and fresh details passed');
} finally { Date.now = originalNow; }
