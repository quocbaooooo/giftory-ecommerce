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
class Shape {
  constructor(attrs) { this.attrs = attrs; }
  setAttrs(attrs) { Object.assign(this.attrs, attrs); }
  fill(value) { this.attrs.fill = value; }
  hide() { this.attrs.visible = false; }
}
const core = { signal, computed: fn => fn, effect() {}, inject: () => ({}), Component: decorator, ViewChild: decorator, HostListener: decorator };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/custom-studio/custom-studio.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', code)(name => name === '@angular/core' ? core : name === 'konva' ? { default: { Rect: Shape, Image: Shape } } : {}, loaded, loaded.exports);
const studio = new loaded.exports.CustomStudioComponent();
assert.equal(studio.baseProductPrice(), 0, 'never quote a hardcoded 250k while the product is loading');
assert.equal(studio.isFormInvalid(), true, 'cannot purchase before product pricing loads');
assert.equal(studio.validateInputs(), false);
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
const black = { name: 'Đen', colorHex: '#000000', frontBlankImage: 'black-front', backBlankImage: 'black-back' };
const original = { frontBlankImage: 'original-white-front', backBlankImage: 'original-white-back', blanks: [] };
studio.switchFace(true);
studio.selectTemplate({ ...product, customConfig: original });
assert.equal(studio.getCurrentBlankImage(), 'original-white-front');
studio.activeTemplate.set({ ...product, customConfig: { ...original, blanks: [black] } });
assert.deepEqual(studio.availableColorOptions().map(option => option.name), ['Mặc định', 'Đen']);
assert.equal(studio.getCurrentBlankImage(), 'original-white-front', 'adding black must preserve the selected original white blank');
studio.switchFace(false);
assert.equal(studio.getCurrentBlankImage(), 'original-white-back');
studio.setColor('Đen');
assert.equal(studio.getCurrentBlankImage(), 'black-back');
studio.switchFace(true);
assert.equal(studio.getCurrentBlankImage(), 'black-front');
studio.setColor('Mặc định');
assert.equal(studio.getCurrentBlankImage(), 'original-white-front');
const white = { name: 'Trắng', colorHex: '#FFFFFF', frontBlankImage: original.frontBlankImage, backBlankImage: original.backBlankImage };
studio.selectTemplate({ ...product, customConfig: { ...original, blanks: [white, black] } });
assert.deepEqual(studio.availableColorOptions().map(option => option.name), ['Trắng', 'Đen'], 'an explicitly listed original must not be duplicated');
assert.equal(studio.getCurrentBlankImage(), 'original-white-front');
studio.selectTemplate({ ...product, customConfig: { ...original, blanks: [{ ...black, name: 'Mặc định' }] } });
assert.deepEqual(studio.availableColorOptions().map(option => option.name), ['Phôi gốc', 'Mặc định']);
assert.equal(studio.getCurrentBlankImage(), 'original-white-front');
studio.setColor('Mặc định');
assert.equal(studio.getCurrentBlankImage(), 'black-front', 'name collisions must not load the wrong blank image');
assert.deepEqual(original.blanks, [], 'display choices must not modify saved product configuration');
console.log('Studio blanks: independent choices, pricing, both faces, legacy fallback and invalid restored colors passed');

const pricing = new loaded.exports.CustomStudioComponent();
pricing.updateKonvaCanvas = () => {};
pricing.selectTemplate({ _id: 'laser-bottle', price: 250000, salePrice: 220000, customBaseFee: 30000,
  customConfig: { backEngraveFee: 0, photoPrintFee: 0 }, images: [], variants: [{ price: 250000 }] });
assert.equal(pricing.isFormInvalid(), false);
assert.equal(pricing.finalProductPrice(), 220000);
assert.equal(pricing.depositPrice(), 110000);
pricing.cartService = { addItem(id, quantity, variant, details) {
  assert.equal(id, 'laser-bottle');
  assert.equal(quantity, 1);
  assert.equal(variant, undefined, 'Studio must not select a sales variant');
  assert.equal(details.customFee, 0, 'explicit free customization must survive the cart payload');
  return { subscribe() {} };
} };
pricing.onPrimaryActionClick();
pricing.uploadedImage.set('photo');
assert.equal(pricing.totalSurcharges(), 0, 'configured zero photo fees must remain free');
pricing.activeTemplate.set({ ...pricing.activeTemplate(), customConfig: { photoPrintFee: 20000 } });
assert.equal(pricing.finalProductPrice(), 240000);
assert.equal(pricing.depositPrice(), 120000);
pricing.uploadedImage.set('');
pricing.activeTemplate.set({ ...pricing.activeTemplate(), salePrice: 0 });
assert.equal(pricing.finalProductPrice(), 250000, 'without a sale use the actual base price');
console.log('Studio pricing: pending product, sale price, zero fees, paid extras and exact cart payload passed');

async function guideReferenceTest() {
  const requests = [];
  global.Image = class {
    set src(url) { this.url = url; requests.push(this); }
    get src() { return this.url; }
  };
  const tick = () => new Promise(resolve => setImmediate(resolve));
  const resolveImage = (url, width, height) => {
    const image = requests.find(image => image.url === url);
    assert.ok(image, `requested ${url}`);
    image.naturalWidth = width; image.naturalHeight = height; image.onload();
  };
  try {
    const canvas = new loaded.exports.CustomStudioComponent();
    canvas.stage = {};
    canvas.bgLayer = { add() {}, batchDraw() {} };
    let artworkClip;
    canvas.drawLayer = { clip(bounds) { artworkClip = { ...bounds }; }, batchDraw() {} };
    canvas.renderGuidesOnKonva = () => {};
    canvas.renderTextBlocks = () => {};
    canvas.renderStickersOnKonva = () => {};
    canvas.activeTemplate.set({ ...product, customConfig: { ...original, blanks: [black],
      printArea: { x: 10, y: 20, width: 60, height: 50 }, safeArea: { x: 15, y: 25, width: 50, height: 40 }
    } });
    canvas.selectedColor.set('Đen');
    canvas.updateKonvaCanvas();
    resolveImage('black-front', 1200, 600);
    await tick();
    assert.equal(canvas.productImgNode, null, 'wait for original dimensions even when opening directly on black');
    resolveImage('original-white-front', 400, 800);
    await tick();
    const guides = canvas.getGuideCoordinates();
    assert.deepEqual(guides.paPx, { x: 145, y: 101, width: 129, height: 215 });
    assert.deepEqual(guides.saPx, { x: 155, y: 123, width: 108, height: 172 });
    assert.deepEqual(artworkClip, guides.saPx, 'clip all artwork to the original blank safe area, not the larger print area');
    assert.equal(canvas.productImgNode.attrs.width, 430);
    assert.equal(canvas.productImgNode.attrs.height, 215, 'color images preserve aspect ratio');
    canvas.setColor('Mặc định');
    await tick();
    assert.deepEqual(canvas.getGuideCoordinates(), guides);
    assert.deepEqual(artworkClip, guides.saPx, 'switching blank colors must preserve the artwork clip');
    canvas.switchFace(false);
    resolveImage('original-white-back', 900, 300);
    await tick();
    assert.deepEqual(canvas.getGuideCoordinates(), guides, 'back face retains the original front reference used in admin');
    canvas.setColor('Đen');
    canvas.switchFace(true);
    await tick();
    resolveImage('black-back', 600, 1000);
    await tick();
    assert.equal(canvas.productImgNode.attrs.image.src, 'black-front', 'late back image cannot overwrite the current front');
    assert.deepEqual(canvas.getGuideCoordinates(), guides);
    canvas.switchFace(false);
    await tick();
    assert.equal(canvas.productImgNode.attrs.image.src, 'black-back');
    assert.deepEqual(canvas.getGuideCoordinates(), guides);
    assert.equal(requests.filter(image => image.url === 'original-white-front').length, 1, 'reuse original geometry across all faces and colors');
    canvas.selectTemplate({ ...product, _id: 'other', customConfig: { frontBlankImage: 'other-front' } });
    resolveImage('other-front', 800, 400);
    await tick();
    assert.notDeepEqual(canvas.getGuideCoordinates(), guides, 'a different product uses its own original geometry');
    assert.deepEqual(artworkClip, canvas.getGuideCoordinates().saPx, 'switching products must refresh the clip');
    canvas.showGuides.set(false);
    canvas.guidesLayer = { hide() {}, batchDraw() {} };
    canvas.currentMockupBounds = { x: 20, y: 30, width: 300, height: 200 };
    loaded.exports.CustomStudioComponent.prototype.renderGuidesOnKonva.call(canvas);
    assert.deepEqual(artworkClip, canvas.getGuideCoordinates().saPx, 'hiding guides must not disable or freeze artwork clipping');
    console.log('Blank guides: original reference, different aspect ratios, both faces, direct black load, caching and image races passed');
  } finally { delete global.Image; }
}
guideReferenceTest().catch(error => { console.error(error); process.exitCode = 1; });
