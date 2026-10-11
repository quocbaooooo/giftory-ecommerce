const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Subject } = require('rxjs');
const storage = new Map();
global.localStorage = { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: k => storage.delete(k) };
global.window = { addEventListener() {} };
const signal = value => { const read = () => value; read.set = next => { value = next; }; return read; };
function load(file) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => {
    if (name === '@angular/core') return { Injectable: () => target => target, signal, computed: fn => fn };
    if (name === '@angular/common/http') return { HttpClient: class { constructor(backend) { return backend; } } };
    if (name.includes('environments/environment')) return { environment: { apiUrl: '/api' } };
    return require(name);
  }, module, module.exports);
  return module.exports;
}
const { safeReturnUrl, passwordPolicy, passwordsMatch } = load('features/auth/auth.utils.ts');
const { AuthService } = load('core/services/auth.service.ts');
let count = 0;
function test(name, run) { storage.clear(); run(); count++; console.log('PASS', name); }
function fixture() {
  const requests = [];
  const request = (url, body) => { const response = new Subject(); requests.push({ url, body, response }); return response; };
  const service = new AuthService({ post: request, get: request }, { navigate() {} });
  return { service, requests };
}
const session = suffix => ({ user: { _id: 'customer', email: 'test@example.com', role: 'CUSTOMER' }, accessToken: 'access-' + suffix, refreshToken: 'refresh-' + suffix });
function signIn(f, suffix = 'old') {
  f.service.login(' TEST@EXAMPLE.COM ', 'password').subscribe();
  const req = f.requests.at(-1);
  assert.equal(req.body.email, 'test@example.com');
  req.response.next({ data: session(suffix) }); req.response.complete();
}
test('Return paths reject external URLs, auth loops and customer admin destinations', () => {
  for (const value of ['https://evil.test', '//evil.test', '/%2fevil.test', '/\\evil.test', '/login?x=1', '/register', '/admin/orders', '/%0aevil', '/%zz']) assert.equal(safeReturnUrl(value), '/');
  assert.equal(safeReturnUrl('/orders?status=pending'), '/orders?status=pending');
  assert.equal(safeReturnUrl('/admin/orders', true), '/admin/orders');
});
test('Password validation handles UTF-8 limits and confirmation', () => {
  assert.equal(passwordPolicy({ value: 'a'.repeat(72) }), null);
  assert.ok(passwordPolicy({ value: '😀'.repeat(19) }));
  assert.ok(passwordPolicy({ value: '        ' }));
  assert.ok(passwordsMatch({ get: key => ({ value: key }) }));
});
test('Concurrent refresh subscribers share one request and store rotated credentials', () => {
  const f = fixture(); signIn(f);
  let received = 0;
  f.service.refreshSession().subscribe(() => received++);
  f.service.refreshSession().subscribe(() => received++);
  assert.equal(f.requests.length, 2);
  f.requests[1].response.next({ data: session('new') }); f.requests[1].response.complete();
  assert.equal(received, 2); assert.equal(f.service.accessToken(), 'access-new');
});
test('A delayed refresh cannot restore a logged-out session', () => {
  const f = fixture(); signIn(f);
  f.service.refreshSession().subscribe({ error() {} });
  f.service.logout();
  f.requests[1].response.next({ data: session('late') });
  assert.equal(f.service.isAuthenticated(), false); assert.equal(storage.size, 0);
});
test('Profile recovery from an older session cannot erase a newer login', () => {
  const f = fixture(); signIn(f);
  f.service.refreshProfile(); f.requests[1].response.error({ status: 401 });
  signIn(f, 'new-login');
  f.requests[2].response.error({ status: 401 });
  assert.equal(f.service.accessToken(), 'access-new-login');
});
test('Transient refresh failures preserve session; rejected refresh clears it', () => {
  const f = fixture(); signIn(f);
  f.service.refreshSession().subscribe({ error() {} }); f.requests[1].response.error({ status: 0 });
  assert.equal(f.service.isAuthenticated(), true);
  f.service.refreshSession().subscribe({ error() {} }); f.requests[2].response.error({ status: 401 });
  assert.equal(f.service.isAuthenticated(), false);
});
console.log(`Completed ${count} auth logic checks.`);
