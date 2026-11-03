const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { Workbook } = require('exceljs');
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/admin/products/product-transfer.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const loaded = { exports: {} };
new Function('exports', code)(loaded.exports);
const { productTable, excelTable, encodeCsv, parseCsv, tableProducts } = loaded.exports;
const product = {
  _id: '507f1f77bcf86cd799439011', name: 'Quà "đặc biệt", cho mẹ', slug: 'qua-me', description: '=SUM(1,2)\r\nDòng thứ hai, tiếng Việt',
  sku: '0000123', price: 0, salePrice: 0, category: { _id: '507f1f77bcf86cd799439012', slug: 'qua-tang' }, stock: 0,
  status: 'DRAFT', images: ['https://example.com/1,a.png', 'https://example.com/2.png'],
  variants: [{ _id: '507f1f77bcf86cd799439013', name: 'Đỏ, "lớn"', color: 'Đỏ', size: 'L', price: 0, stock: 0, images: ['a', 'b'], status: 'HIDDEN' }],
  specs: [{ key: 'Chất liệu', value: 'Gỗ\nSồi' }], tags: ['mẹ', 'sinh nhật'], audience: [], occasions: ['Sinh nhật'],
  supportsCustomization: false, studioSupported: true, isCustomizable: false, isFlashSale: false,
  flashSaleDiscountPercent: 0, customBaseFee: 0, customConfig: { blanks: [{ name: 'Trắng', frontBlankImage: 'front', backBlankImage: 'back' }], printArea: { x: 0, y: 0, width: 100, height: 100 } },
  packagingSize: 'LARGE', packagingUnits: 2, loyaltyEligible: false, rating: 4.9, reviewCount: 3, soldCount: 10
};
const expected = { ...product, categoryId: product.category._id, categorySlug: product.category.slug };
delete expected.category;
const table = productTable([product]);
for (const blank of ['', '   ']) {
  const parsed = tableProducts([['name', 'price', 'packagingSize', 'status', 'sku'], ['Gift', '1', blank, blank, '']])[0];
  assert.equal(Object.hasOwn(parsed, 'packagingSize'), false, 'blank enum must not overwrite stored value/default');
  assert.equal(Object.hasOwn(parsed, 'status'), false);
  assert.equal(parsed.sku, '', 'editable free text can still be cleared');
}
assert.deepEqual(tableProducts(parseCsv(encodeCsv(table)))[0], expected);
assert.ok(encodeCsv(table).includes("'=SUM"), 'formula-like text is escaped');
assert.deepEqual(tableProducts(parseCsv('name;price;sku\r\nQuà;0;0001'))[0], { name: 'Quà', price: 0, sku: '0001' });
assert.throws(() => parseCsv('name,price\n"unfinished,1'), /nháy/);
assert.throws(() => tableProducts([['name', 'price'], ['A', 'oops']]), /Dòng 2, cột price/);
assert.throws(() => tableProducts([['name', 'price', 'images'], ['A', '1', '{}']]), /JSON/);
assert.throws(() => tableProducts([['name', 'price', 'studioSupported'], ['A', '1', 'yes']]), /true\/false/);
assert.deepEqual(tableProducts(productTable([{ name: "'quote", price: 1, customConfig: null, sku: '' }]))[0].name, "'quote");
(async () => {
  const book = new Workbook();
  book.addWorksheet('Products').addRows(excelTable(table));
  const next = new Workbook();
  await next.xlsx.load(await book.xlsx.writeBuffer());
  const restored = [];
  next.worksheets[0].eachRow(row => restored.push(Array.from({ length: table[0].length }, (_, i) => row.getCell(i + 1).text)));
  assert.deepEqual(tableProducts(restored)[0], expected);
  console.log('PASS CSV and XLSX preserve all product fields, Unicode, multiline text, zero values, IDs, images, variants and Studio settings; malformed cells rejected');
})().catch(error => { console.error(error); process.exitCode = 1; });
