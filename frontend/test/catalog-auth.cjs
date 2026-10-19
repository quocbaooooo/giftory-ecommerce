const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const rx = require('rxjs');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/core/interceptors/auth.interceptor.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const moduleStub = { exports: {} };
const auth = { accessToken: () => 'test-token' };
const router = {};
new Function('require', 'module', 'exports', code)(name => {
  if (name === '@angular/core') return { inject: token => token === 'AuthService' ? auth : router };
  if (name === '@angular/router') return { Router: 'Router' };
  if (name === '../services/auth.service') return { AuthService: 'AuthService' };
  if (name.includes('environments/environment')) return { environment: { apiUrl: 'https://api.example/api' } };
  if (name === 'rxjs') return rx;
  return {};
}, moduleStub, moduleStub.exports);
const interceptor = moduleStub.exports.authInterceptor;
function sent(method, endpoint) {
  const req = { method, url: `https://api.example/api/${endpoint}`, clone: options => ({ ...req, ...options }) };
  let captured;
  interceptor(req, value => { captured = value; return rx.of({}); }).subscribe();
  return captured;
}
for (const endpoint of ['products?view=catalog', 'products/best-sellers', 'products/slug/mug', 'categories', 'categories/display-settings']) {
  assert.equal(sent('GET', endpoint).setHeaders, undefined, `${endpoint} stays public`);
}
for (const [method, endpoint] of [['POST', 'products'], ['PATCH', 'products/id'], ['GET', 'categories/admin'], ['GET', 'cart'], ['GET', 'orders'], ['GET', 'auth/me']]) {
  assert.equal(sent(method, endpoint).setHeaders.Authorization, 'Bearer test-token', `${method} ${endpoint} retains auth`);
}
console.log('Catalog auth: public reads avoid bearer preflights; admin, cart, orders and profile retain authentication');
