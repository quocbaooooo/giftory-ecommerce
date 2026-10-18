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
class Text {
  constructor(attrs) { this.attrs = { height: 25, scaleX: 1, scaleY: 1, rotation: 0, ...attrs }; this.events = {}; }
  getAttr(key) { return this.attrs[key]; }
  setAttrs(attrs) { Object.assign(this.attrs, attrs); }
  on(names, callback) { names.split(' ').forEach(name => { this.events[name] = callback; }); }
  destroy() { this.destroyed = true; }
  moveToTop() {}
  isVisible() { return this.attrs.visible; }
  zIndex() { return 7; }
}
for (const key of ['x', 'y', 'width', 'height', 'scaleX', 'scaleY', 'rotation']) {
  Text.prototype[key] = function(value) { if (value !== undefined) this.attrs[key] = value; return this.attrs[key]; };
}
const core = { signal, computed: fn => fn, effect() {}, inject: () => ({}), Component: decorator, ViewChild: decorator, HostListener: decorator };
const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/app/features/custom-studio/custom-studio.component.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
}).outputText;
const loaded = { exports: {} };
new Function('require', 'module', 'exports', code)(name => name === '@angular/core' ? core : name === 'konva' ? { default: { Text } } : {}, loaded, loaded.exports);
function fixture() {
  const studio = new loaded.exports.CustomStudioComponent();
  studio.activeTemplate.set({ _id: 'text-product', price: 220000 });
  let selected = [];
  studio.drawLayer = { add() {}, batchDraw() {} };
  studio.uiLayer = { batchDraw() {} };
  studio.transformer = { nodes(value) { if (value) selected = value; return selected; }, keepRatio() {}, forceUpdate() {} };
  studio.getGuideCoordinates = () => ({ saPx: { x: 50, y: 80, width: 200, height: 300 } });
  studio.syncSafeAreaClip = () => {};
  studio.updateKonvaCanvas = () => studio.renderTextBlocks();
  return studio;
}
const studio = fixture();
studio.addTextBlock();
const first = studio.selectedTextBlockId();
studio.updateSelectedTextBlock({ text: 'MINH ANH & HOÀNG', fontFamily: 'Serif Elegant', fontSize: 28, bold: true, color: '#F59E0B' });
studio.addTextBlock();
const second = studio.selectedTextBlockId();
studio.updateSelectedTextBlock({ text: 'Hành trình 5 năm\nCảm ơn vì đã luôn bên anh', fontFamily: 'Vintage Typewriter', fontSize: 12, lineHeight: 1.4, letterSpacing: 2.5 });
assert.equal(studio.textBlocks()[0].fontFamily, 'Serif Elegant');
assert.equal(studio.textBlocks()[0].fontSize, 28);
assert.equal(studio.textNodes.get(second).getAttr('lineHeight'), 1.4);
assert.equal(studio.textNodes.get(second).getAttr('letterSpacing'), 2.5);
assert.equal(studio.textNodes.get(second).getAttr('text').split('\n').length, 2);
assert.ok(studio.textBlocks()[1].y > studio.textBlocks()[0].y);
studio.selectTextBlock(first);
assert.equal(studio.selectedFont(), 'Serif Elegant');
studio.setFont('Royal Calligraphy');
assert.equal(studio.textBlocks()[1].fontFamily, 'Vintage Typewriter');
studio.setBlockFont(second, 'Romantic Script');
studio.setBlockFontSize(second, 17);
assert.equal(studio.selectedTextBlockId(), second);
assert.equal(studio.textBlocks()[0].fontFamily, 'Royal Calligraphy');
assert.equal(studio.textBlocks()[1].fontFamily, 'Romantic Script');
assert.equal(studio.textBlocks()[1].fontSize, 17);
studio.editTextBlock(first, { color: '#123abc', align: 'right', bold: true, italic: true, letterSpacing: 3, lineHeight: 1.8 });
assert.equal(studio.selectedTextBlockId(), first);
assert.equal(studio.textBlocks()[0].color, '#123ABC');
assert.equal(studio.textBlocks()[1].color, '#0F172A');
assert.equal(studio.textBlocks()[1].letterSpacing, 2.5);
assert.equal(studio.textNodes.get(first).getAttr('fill'), '#123ABC');
assert.equal(studio.textNodes.get(first).getAttr('align'), 'right');
assert.equal(studio.textNodes.get(first).getAttr('fontStyle'), 'bold italic');
assert.equal(studio.textNodes.get(first).getAttr('letterSpacing'), 3);
assert.equal(studio.textNodes.get(first).getAttr('lineHeight'), 1.8);
studio.setBlockFontSize(second, null);
studio.setBlockFontSize(second, NaN);
assert.equal(studio.textBlocks()[1].fontSize, 17);
const node = studio.textNodes.get(first);
node.x(150); node.y(170); node.scaleX(1.5); node.scaleY(1.2); node.rotation(45);
node.events.dragend();
assert.equal(studio.textBlocks()[0].x, 0.5);
assert.equal(studio.textBlocks()[0].rotation, 45);
studio.duplicateTextBlock(first);
const clone = studio.selectedTextBlockId();
studio.setTextSize(18);
assert.equal(studio.textBlocks().find(b => b.id === first).fontSize, 28);
assert.equal(studio.textBlocks().find(b => b.id === clone).fontSize, 18);
assert.equal(studio.textBlocks().find(b => b.id === clone).color, '#123ABC');
studio.removeTextBlock(clone);
studio.switchFace(false);
assert.equal(studio.textNodes.size, 0);
studio.addTextBlock();
studio.updateSelectedTextBlock({ text: 'Ngày kỷ niệm', color: '#F59E0B' });
assert.ok(studio.surchargeList().some(item => item.label === 'Khắc laser mặt sau'));
assert.equal(studio.surchargeList().filter(item => item.label.startsWith('Phủ ánh kim')).length, 0, 'text color carries no coating surcharge');
const backId = studio.selectedTextBlockId();
studio.updateTextBlock(backId, { visible: false });
assert.ok(!studio.surchargeList().some(item => item.label === 'Khắc laser mặt sau'));
assert.equal(studio.textNodes.get(backId).isVisible(), false);
assert.equal(studio.transformer.nodes().length, 0);
const saved = JSON.parse(JSON.stringify(studio.textBlocks()));
assert.deepEqual(studio.getConfirmedCustomDetails().textBlocks, saved);
assert.equal(studio.getConfirmedCustomDetails().backMessage, '', 'hidden text is not sent as an engraving summary');
const restored = fixture();
restored.restoreTextBlocks({ textBlocks: saved });
assert.deepEqual(restored.textBlocks(), saved);
assert.equal(restored.textNodes.get(first).x(), 150);
assert.equal(restored.textNodes.get(first).rotation(), 45);
restored.textNodes.get(first).events.click();
assert.equal(restored.selectedTextBlockId(), first);
assert.equal(restored.selectedFont(), 'Royal Calligraphy');
restored.switchFace(false);
assert.equal(restored.textNodes.get(backId).isVisible(), false);
restored.restoreTextBlocks({ frontMessage: 'Legacy front', backMessage: 'Legacy back', fontFamily: 'Signature', engraveColor: 'Đỏ Ruby' });
assert.equal(restored.textBlocks().length, 2);
assert.equal(restored.textBlocks()[0].fontFamily, 'Signature');
assert.equal(restored.textBlocks()[1].face, 'back');
assert.equal(restored.textBlocks()[0].color, '#DC2626');
restored.restoreTextBlocks({ textBlocks: [{ id: 'old', text: 'Màu cũ', engraveColor: 'Vàng Hồng (Rose Gold)' }] });
assert.equal(restored.textBlocks()[0].color, '#FB7185');
restored.editTextBlock('old', { color: '#0af' });
assert.equal(restored.textBlocks()[0].color, '#00AAFF');
assert.equal(restored.surchargeList().filter(item => item.label.includes('ánh kim')).length, 0);
restored.restoreTextBlocks({ textBlocks: [], frontMessage: 'Must stay deleted' });
assert.equal(restored.textBlocks().length, 0);
for (let i = 0; i < 101; i++) restored.addTextBlock();
assert.equal(restored.textBlocks().length, 101, 'no application limit on independent blocks');
assert.equal(restored.validateInputs(), true);
console.log('Text blocks: independent styles, multiline, unlimited layers, transforms, faces, visibility, pricing, duplication and restore passed');

async function fontLoadingTest() {
  const studio = fixture();
  let resolveFont, failFont, requests = 0;
  global.document = { fonts: { load(spec, sample) {
    requests++;
    assert.ok(sample.includes('ỸỴ') && sample.includes('ẵặ'));
    return new Promise((resolve, reject) => { resolveFont = resolve; failFont = reject; });
  } } };
  try {
    studio.addTextBlock();
    studio.updateSelectedTextBlock({ text: 'Thương gửi Hoàng', fontFamily: 'Signature' });
    const id = studio.selectedTextBlockId();
    assert.equal(studio.textNodes.get(id).getAttr('text'), 'Thương gửi Hoàng');
    assert.equal(studio.textNodes.get(id).isVisible(), false);
    assert.equal(studio.validateInputs(), false, 'cannot save before the real Vietnamese font is ready');
    studio.setBlockFontSize(id, 18);
    assert.equal(requests, 1, 'size changes reuse the pending font request');
    resolveFont([{}]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(studio.pendingTextFonts(), 0);
    assert.equal(studio.textNodes.get(id).isVisible(), true);
    assert.equal(studio.validateInputs(), true);
    studio.setBlockFont(id, 'Romantic Script');
    failFont(new Error('Test download failure'));
    await new Promise(resolve => setImmediate(resolve));
    assert.ok(studio.textFontNotice());
    assert.equal(studio.validateInputs(), false);
    studio.retryTextFonts();
    resolveFont([{}]);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(studio.textFontNotice(), '');
    assert.equal(studio.validateInputs(), true);
    console.log('Vietnamese fonts: NFC text, loading barrier, request deduplication, failed loads and retry passed');
  } finally { delete global.document; }
}
fontLoadingTest().catch(error => { console.error(error); process.exitCode = 1; });
