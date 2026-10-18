const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const signal = value => {
  const read = () => value;
  read.set = next => { value = next; };
  read.update = fn => { value = fn(value); };
  return read;
};
const decorator = () => () => {};
const core = { signal, computed: fn => fn, effect() {}, inject: () => ({}), Component: decorator, ViewChild: decorator, HostListener: decorator };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/custom-studio/custom-studio.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', code)(name => name === '@angular/core' ? core : {}, loaded, loaded.exports);
const studio = new loaded.exports.CustomStudioComponent();
studio.updateKonvaCanvas = () => {};
const product = { price: 100, salePrice: 80, images: ['storefront'], variants: [{ name: 'Brown', price: 200, image: 'variant', stock: 10 }],
  customConfig: { supportedColors: ['Brown'], blanks: [
    { name: 'Brown', colorHex: '#543210', frontBlankImage: 'brown-front', backBlankImage: 'brown-back' },
    { name: 'White blank', colorHex: '#FFFFFF', frontBlankImage: 'white-front', backBlankImage: 'white-back' }
  ] }
};
studio.selectTemplate(product);
assert.deepEqual(studio.availableColorOptions().map(option => option.name), ['Brown', 'White blank']);
assert.equal(studio.baseProductPrice(), 80, 'matching variant names cannot override Studio prices');
assert.equal(studio.getCurrentBlankImage(), 'brown-front');
studio.switchFace(false);
assert.equal(studio.getCurrentBlankImage(), 'brown-back');
studio.setColor('White blank');
assert.equal(studio.getCurrentBlankImage(), 'white-back');
studio.switchFace(true);
assert.equal(studio.getCurrentBlankImage(), 'white-front');
studio.setColor('removed-color');
assert.equal(studio.selectedColor(), 'White blank');
studio.selectTemplate({ ...product, customConfig: { supportedColors: ['Brown'], frontBlankImage: 'default-front' } });
assert.deepEqual(studio.availableColorOptions().map(option => option.name), ['Mặc định']);
assert.equal(studio.getCurrentBlankImage(), 'default-front');
studio.switchFace(false);
assert.ok(!['storefront', 'variant', 'default-front'].includes(studio.getCurrentBlankImage()));
console.log('Studio blanks: independent choices, pricing, both faces, legacy fallback and invalid restored colors passed');
