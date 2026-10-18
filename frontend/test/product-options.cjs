const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const code = ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname, '../src/app/shared/components/product-options.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText;
const loaded = { exports: {} };
new Function('require', 'exports', code)(() => ({ signal: value => { const read = () => value; read.set = v => value = v; return read; } }), loaded.exports);
const { ProductOptions } = loaded.exports;
const options = new ProductOptions();
const variants = [
  { name: 'Red S', color: 'Red', size: 'S', sku: 'RS', price: 10, stock: 2, image: 'red', images: ['red-back'], colorHex: '#ff0000' },
  { name: 'Red M', color: 'Red', size: 'M', sku: 'RM', price: 12, stock: 0, image: 'red-m' },
  { name: 'Blue M', color: 'Blue', size: 'M', sku: 'BM', price: 15, stock: 3, image: 'blue' },
  { name: 'Hidden', sku: 'H', price: 20, stock: 10, status: 'HIDDEN', image: 'secret' }
];
options.load({ price: 5, stock: 5, images: ['common', 'red'], variants });
assert.equal(options.selected(), undefined);
assert.equal(options.error(), 'Vui lòng chọn màu sắc');
assert.deepEqual(options.gallery(), ['common', 'red', 'red-back', 'red-m', 'blue']);
options.chooseColor('Red');
assert.equal(options.error(), 'Vui lòng chọn kích thước');
assert.equal(options.sizeAvailable('M'), false);
options.chooseSize('M');
assert.equal(options.selected(), undefined);
options.chooseSize('S');
assert.equal(options.price(), 10);
assert.equal(options.stock(), 2);
assert.equal(options.selected().sku, 'RS');
assert.equal(options.activeImage(), 'red');
assert.equal(options.error(), '');
options.quantity.set(3);
assert.equal(options.error(), 'Số lượng vượt quá tồn kho');
options.chooseColor('Blue');
assert.equal(options.size(), '');
assert.equal(options.activeImage(), 'blue');
options.chooseSize('M');
assert.equal(options.price(), 15);
options.moveImage(1);
assert.equal(options.activeImage(), 'common');
options.load({ images: [], variants: [variants[0], variants[1]] });
assert.equal(options.selected().sku, 'RS');
options.load({ images: [], variants: [variants[1]] });
assert.equal(options.selected(), undefined);
assert.equal(options.colorAvailable('Red'), false);
options.load({ images: [], stock: 2, price: 100, salePrice: 80 });
assert.equal(options.error(), '');
assert.equal(options.price(), 80);
console.log('Product options: gallery, selection, price, stock, sold-out and reset checks passed');
options.load({ price: 100, stock: 2, images: ['product', 'legacy-blank', 'blank-front', 'blank-back'], variants,
  customConfig: { backBlankImage: 'legacy-blank', blanks: [{ name: 'Brown blank', colorHex: '#543210', frontBlankImage: 'blank-front', backBlankImage: 'blank-back' }] }
});
assert.deepEqual(options.gallery(), ['product', 'red', 'red-back', 'red-m', 'blue']);
assert.ok(!options.colors().includes('Brown blank'));
console.log('Studio blanks are excluded from the storefront gallery and variant choices');
