const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function compile(file, dependencies = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', code)(name => dependencies[name] || {}, module, module.exports);
  return module.exports;
}
const signal = value => {
  const read = () => value;
  read.set = next => { value = next; };
  read.update = fn => { value = fn(value); };
  return read;
};
const library = compile('src/app/features/custom-studio/graphics-library.ts');
const { CLIPART_LIBRARY, filterGraphics, graphicsForFace } = library;
assert.equal(CLIPART_LIBRARY.length, 12);
assert.equal(filterGraphics(CLIPART_LIBRARY, '', 'dong vat').length, 1);
for (const asset of CLIPART_LIBRARY) {
  assert.ok(fs.existsSync(path.join(root, 'public', asset.imageUrl)));
}
assert.ok(filterGraphics(CLIPART_LIBRARY, '', 'trai tim').some(a => a.name === 'Trái tim'));
assert.equal(filterGraphics([{ _id: 'old', type: 'STICKER', icon: '❤️', name: 'Tim' }, ...CLIPART_LIBRARY], '', '').length, CLIPART_LIBRARY.length);
assert.ok(filterGraphics(CLIPART_LIBRARY, 'Sinh nhật', '').every(a => a.category === 'Sinh nhật'));
assert.equal(filterGraphics(CLIPART_LIBRARY, '', 'missing').length, 0);
const legacy = { id: 'legacy', icon: '❤️', name: 'Tim' };
const front = { ...legacy, id: 'front', face: 'front' };
const back = { ...legacy, id: 'back', face: 'back' };
assert.deepEqual(graphicsForFace([legacy, front, back], true).map(i => i.id), ['legacy', 'front']);
assert.deepEqual(graphicsForFace([legacy, front, back], false).map(i => i.id), ['legacy', 'back']);

class Shape {
  constructor(attrs) { this.attrs = { width: 32, height: 32, ...attrs }; }
  getAttr(key) { return this.attrs[key]; }
  on() {}
  moveToTop() {}
  destroy() { this.destroyed = true; }
  fontSize(value) { this.attrs.fontSize = value; }
  zIndex() { return 3; }
}
for (const key of ['x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'rotation']) {
  Shape.prototype[key] = function(value) {
    if (value !== undefined) this.attrs[key] = value;
    return this.attrs[key] ?? (key.startsWith('scale') ? 1 : 0);
  };
}
const decorator = () => () => {};
const { CustomStudioComponent } = compile('src/app/features/custom-studio/custom-studio.component.ts', {
  '@angular/core': { Component: decorator, ViewChild: decorator, HostListener: decorator },
  'konva': { default: { Text: Shape, Image: Shape } },
  './graphics-library': library,
});
function fixture(items) {
  const studio = Object.create(CustomStudioComponent.prototype);
  let selected = [];
  Object.assign(studio, {
    activeStickers: signal(items), isFrontFace: signal(true), graphicsNotice: signal(''),
    pendingGraphicAdds: signal(0), graphicsRenderVersion: 0, stickerNodes: [], graphicImages: new Map(), graphicLoads: new Map(),
    drawLayer: { add() {}, batchDraw() {} }, uiLayer: { batchDraw() {} },
    transformer: { nodes(value) { if (value) selected = value; return selected; } },
    getGuideCoordinates: () => ({ saPx: { x: 50, y: 80, width: 200, height: 300 } }),
    makeDraggableAndSelectable() {}, checkOverflowWarning() {},
  });
  return studio;
}
async function run() {
  const item = { ...front, coordinateSpace: 'safe-area', x: .2, y: .3, width: .25, height: .1, scaleX: 1.5, scaleY: 1.5, rotation: 45, zIndex: 20 };
  const studio = fixture([item, back]);
  studio.renderStickersOnKonva();
  assert.equal(studio.stickerNodes.length, 1);
  const node = studio.stickerNodes[0];
  assert.equal(node.x(), 90);
  assert.equal(node.y(), 170);
  node.x(150); node.rotation(90); node.scaleX(2);
  studio.persistGraphic(node);
  const saved = JSON.parse(JSON.stringify(studio.activeStickers()));
  assert.equal(saved[0].x, .5);
  assert.equal(saved[0].rotation, 90);
  assert.equal(saved[0].zIndex, 20, 'moving or scaling must preserve saved stacking order');
  const restored = fixture(saved);
  restored.renderStickersOnKonva();
  assert.equal(restored.stickerNodes[0].x(), 150);
  assert.equal(restored.stickerNodes[0].scaleX(), 2);
  assert.equal(restored.stickerNodes[0].rotation(), 90);
  restored.isFrontFace.set(false);
  restored.renderStickersOnKonva();
  assert.equal(restored.stickerNodes[0].getAttr('graphicId'), 'back');

  const added = fixture([]);
  await added.addGraphic({ _id: 'legacy', name: 'Tim', icon: '❤️', type: 'STICKER' });
  assert.equal(added.activeStickers().length, 0, 'new designs only accept clipart images');
  added.graphicImages.set('/cliparts/heart.svg', { naturalWidth: 128, naturalHeight: 128 });
  await added.addGraphic({ _id: 'heart', name: 'Tim', icon: '', imageUrl: '/cliparts/heart.svg', type: 'CLIPART' });
  await added.addGraphic({ _id: 'heart', name: 'Tim', icon: '', imageUrl: '/cliparts/heart.svg', type: 'CLIPART' });
  assert.equal(added.activeStickers().length, 2);
  assert.notEqual(added.activeStickers()[0].id, added.activeStickers()[1].id);
  added.transformer.nodes([added.stickerNodes[0]]);
  added.duplicateGraphic();
  assert.equal(added.activeStickers().length, 3);
  added.transformer.nodes([added.stickerNodes[0]]);
  added.flipGraphic();
  assert.equal(added.activeStickers()[0].scaleX, -1);
  added.removeGraphic(added.activeStickers()[1].id);
  assert.equal(added.activeStickers().length, 2);
  assert.equal(added.pendingGraphicAdds(), 0);
  const full = fixture(Array.from({ length: 30 }, (_, i) => ({ ...front, id: String(i) })));
  await full.addGraphic({ _id: 'x', name: 'Tim', icon: '', imageUrl: '/cliparts/heart.svg', type: 'CLIPART' });
  assert.equal(full.activeStickers()[0].id, '0');
  assert.equal(full.activeStickers().length, 30);

  // A late image response must never redraw a graphic from the previous face.
  let resolveImage;
  const loading = fixture([{ ...front, type: 'CLIPART', imageUrl: '/heart.svg' }, back]);
  loading.loadGraphicImage = () => new Promise(resolve => { resolveImage = resolve; });
  loading.renderStickersOnKonva();
  loading.isFrontFace.set(false);
  loading.renderStickersOnKonva();
  resolveImage({ naturalWidth: 128, naturalHeight: 128 });
  await Promise.resolve();
  assert.deepEqual(loading.stickerNodes.map(n => n.getAttr('graphicId')), ['back']);

  const failed = fixture([]);
  failed.loadGraphicImage = async () => { throw new Error('Offline'); };
  await failed.addGraphic(CLIPART_LIBRARY[0]);
  assert.equal(failed.activeStickers().length, 0);
  assert.ok(failed.graphicsNotice());
  assert.equal(failed.pendingGraphicAdds(), 0);
  console.log('Studio graphics: filtering, legacy designs, face isolation, transform round-trip, duplicates, limits, flip, removal and image races passed.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
