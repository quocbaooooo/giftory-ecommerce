const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Subject } = require('rxjs');
const source = fs.readFileSync(path.join(__dirname, '../src/app/features/admin/products/openclipart-importer.component.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true } }).outputText;
let injectedService;
const signal = value => { const read = () => value; read.set = next => { value = next; }; read.update = fn => { value = fn(value); }; return read; };
const moduleResult = { exports: {} };
const decorator = () => () => {};
new Function('require', 'module', 'exports', code)(name => name === '@angular/core' ? {
  Component: decorator, Output: decorator, inject: () => injectedService, signal, computed: fn => fn,
  EventEmitter: class { count = 0; emit() { this.count++; } },
} : {}, moduleResult, moduleResult.exports);
const { OpenClipartImporterComponent } = moduleResult.exports;
const item = (id, imported = false) => ({ id, name: `Clipart ${id}`, previewUrl: `https://openclipart.org/image/400px/${id}`, sourceUrl: `https://openclipart.org/detail/${id}`, imported });
const response = (items, page = 1) => ({ query: 'hoa', searchQuery: 'flower', total: 80, page, hasNext: true, items });
function fixture() {
  const searches = [], imports = [];
  injectedService = {
    searchOpenClipart(query, page) { const subject = new Subject(); searches.push({ query, page, subject }); return subject; },
    importOpenClipart(ids, category, query) { const subject = new Subject(); imports.push({ ids, category, query, subject }); return subject; },
  };
  return { ui: new OpenClipartImporterComponent(), searches, imports };
}
let count = 0;
function test(name, fn) { fn(); count++; console.log(`PASS ${name}`); }
test('selection survives pagination, excludes imported images, and honors a 20-item limit', () => {
  const { ui, searches } = fixture();
  ui.query = 'hoa'; ui.search(1, true);
  searches[0].subject.next(response([item('1'), item('2', true)]));
  ui.selectPage(); assert.equal(ui.selectedCount(), 1);
  ui.search(2); searches[1].subject.next(response([item('3')], 2));
  ui.toggle(item('3')); assert.deepEqual([...ui.selected().keys()], ['1', '3']);
  for (let i = 4; i < 40; i++) ui.toggle(item(String(i)));
  assert.equal(ui.selectedCount(), 20);
  ui.toggle(item('3')); assert.equal(ui.selectedCount(), 19);
});
test('a stale search response cannot replace newer results and changed terms clear selection', () => {
  const { ui, searches } = fixture();
  ui.lastQuery = 'hoa'; ui.toggle(item('1'));
  ui.query = 'birthday'; ui.search(1, true);
  assert.equal(ui.selectedCount(), 0);
  ui.query = 'heart'; ui.search(1, true);
  searches[0].subject.next({ ...response([item('1')]), query: 'birthday' });
  assert.equal(ui.items().length, 0);
  searches[1].subject.next({ ...response([item('2')]), query: 'heart' });
  assert.equal(ui.items()[0].id, '2');
  assert.equal(ui.lastQuery, 'heart');
});
test('partial imports mark completed images, retain failed selections, and refresh the library', () => {
  const { ui, imports } = fixture();
  ui.lastQuery = 'hoa'; ui.category = 'Hoa cỏ';
  ui.items.set([item('1'), item('2'), item('3')]);
  ui.selectPage(); ui.importSelected();
  assert.equal(ui.importing(), true);
  assert.deepEqual(imports[0].ids, ['1', '2', '3']);
  assert.equal(imports[0].category, 'Hoa cỏ');
  ui.importSelected(); assert.equal(imports.length, 1);
  imports[0].subject.next({ imported: 1, skipped: 1, failed: 1, results: [
    { id: '1', status: 'imported' }, { id: '2', status: 'skipped' }, { id: '3', status: 'failed', message: 'Try again' },
  ] });
  assert.equal(ui.importing(), false);
  assert.deepEqual([...ui.selected().keys()], ['3']);
  assert.ok(ui.items()[0].imported && ui.items()[1].imported);
  assert.equal(ui.failures()[0].name, 'Clipart 3');
  assert.equal(ui.imported.count, 1);
  ui.importSelected(); assert.deepEqual(imports[1].ids, ['3']);
});
test('network failures keep selections for retry and show server messages', () => {
  const { ui, imports, searches } = fixture();
  ui.toggle(item('1')); ui.importSelected();
  imports[0].subject.error({ error: { message: 'Please sign in' } });
  assert.equal(ui.importing(), false); assert.equal(ui.selectedCount(), 1);
  assert.equal(ui.error(), 'Please sign in');
  ui.query = 'hoa'; ui.search(1, true);
  searches[0].subject.error({ status: 0 });
  assert.equal(ui.searching(), false); assert.ok(ui.error());
});
test('broken previews cannot be selected, refreshed imported badges clear old selections, destroy cancels work', () => {
  const { ui, searches } = fixture();
  ui.toggle(item('1')); ui.markPreviewFailed('1');
  assert.equal(ui.selectedCount(), 0);
  ui.toggle(item('1')); assert.equal(ui.selectedCount(), 0);
  ui.toggle(item('2')); ui.lastQuery = 'hoa'; ui.search(1);
  searches[0].subject.next(response([item('2', true)]));
  assert.equal(ui.selectedCount(), 0);
  ui.search(2); ui.ngOnDestroy();
  searches[1].subject.next(response([item('3')], 2));
  assert.equal(ui.page(), 1);
});
console.log(`${count} importer UI checks passed.`);
