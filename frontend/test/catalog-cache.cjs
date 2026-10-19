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
    if (name.includes('environments/environment')) return { environment: { apiUrl: '/api' } };
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
  const storage = new Map();
  global.sessionStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
    removeItem: key => storage.delete(key),
  };
  const persisted = new ProductService(api);
  persisted.getCatalogProducts({ limit: 8 }).subscribe();
  requests.at(-1).response.next(payload); requests.at(-1).response.complete();
  let before = requests.length;
  new ProductService(api).getCatalogProducts({ limit: 8 }).subscribe(value => assert.deepEqual(value, payload));
  assert.equal(requests.length, before, 'reload restores a fresh response without a network request');
  clock += 60001;
  const values = [];
  const restored = new ProductService(api);
  restored.getCatalogProducts({ limit: 8 }).subscribe(value => values.push(value));
  restored.getCatalogProducts({ limit: 8 }).subscribe();
  assert.deepEqual(values, [payload], 'stale response displays before backend wakes');
  assert.equal(requests.length, before + 1, 'restored subscribers share one background refresh');
  const updated = { items: [{ _id: 'one', price: 456 }], meta: { total: 1 } };
  requests.at(-1).response.next(updated); requests.at(-1).response.complete();
  assert.deepEqual(values, [payload, updated], 'fresh server data replaces the saved response');
  clock += 60001;
  new ProductService(api).getCatalogProducts({ limit: 8 }).subscribe({ error: () => assert.fail('cached catalog should survive refresh failure') });
  requests.at(-1).response.error(new Error('Backend unavailable'));
  clock += 31 * 60_000;
  const expiredValues = [];
  new ProductService(api).getCatalogProducts({ limit: 8 }).subscribe(value => expiredValues.push(value));
  assert.equal(expiredValues.length, 0, 'old prices are not restored beyond the stale window');
  persisted.invalidateCatalog();
  assert.equal(storage.size, 0, 'admin invalidation also removes persisted catalog');
  const pending = new ProductService(api);
  pending.getCategories().subscribe();
  pending.invalidateCatalog();
  requests.at(-1).response.next([]); requests.at(-1).response.complete();
  assert.equal(storage.size, 0, 'late requests cannot restore data invalidated by an edit');
  storage.set(persisted.storageKey, '{broken');
  assert.doesNotThrow(() => new ProductService(api).getCategories().subscribe());
  global.sessionStorage = { getItem() { throw new Error('Disabled'); }, setItem() { throw new Error('Full'); } };
  const unavailable = new ProductService(api);
  unavailable.getCategories().subscribe();
  assert.doesNotThrow(() => { requests.at(-1).response.next([]); requests.at(-1).response.complete(); });
  delete global.sessionStorage;
  console.log('Catalog cache: deduplication, instant revisit, expiry, filter isolation, retries, admin invalidation, prefetch and fresh details passed');
  console.log('Persistent catalog: reload, stale refresh, deduplication, fresh prices, offline, expiry, invalidation and unavailable storage passed');
} finally { Date.now = originalNow; }
