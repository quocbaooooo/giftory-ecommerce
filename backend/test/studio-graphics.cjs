require('reflect-metadata');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { StudioAssetSchema } = require('../dist/database/schemas/studio-asset.schema');
const { CustomDesignSchema } = require('../dist/database/schemas/custom-design.schema');

const Asset = mongoose.model('StudioGraphicsAssetTest', StudioAssetSchema);
const Design = mongoose.model('StudioGraphicsDesignTest', CustomDesignSchema);
const asset = new Asset({
  name: 'Hoa', icon: 'https://example.com/flower.png', type: 'CLIPART',
  imageUrl: 'https://example.com/flower.png', thumbnailUrl: 'https://example.com/thumb.png', tags: ['hoa', 'flower'],
});
assert.equal(asset.validateSync(), undefined);
assert.equal(asset.toObject().imageUrl, 'https://example.com/flower.png');
assert.deepEqual(asset.toObject().tags, ['hoa', 'flower']);
const graphic = {
  id: 'instance-1', assetId: asset.id, name: 'Hoa', icon: '', type: 'CLIPART', imageUrl: asset.imageUrl,
  face: 'back', coordinateSpace: 'safe-area', x: .25, y: .4, width: .3, height: .2,
  scaleX: -1.5, scaleY: 1.5, rotation: 45, zIndex: 4,
};
const design = new Design({ productId: new mongoose.Types.ObjectId(), stickers: [graphic] });
assert.equal(design.validateSync(), undefined);
assert.deepEqual(design.toObject().stickers[0], graphic);
const legacy = new Design({ productId: new mongoose.Types.ObjectId(), pattern: 'floral', stickers: [{ id: 'old', icon: '❤️', name: 'Tim' }] });
assert.equal(legacy.validateSync(), undefined);
assert.equal(legacy.toObject().pattern, 'floral');
assert.equal(legacy.toObject().stickers[0].icon, '❤️');
console.log('Studio schemas: clipart metadata, both face transforms and legacy designs passed (no database required).');

const { CustomStudioService } = require('../dist/modules/custom-studio/custom-studio.service');
(async () => {
  const queries = [];
  const model = {
    find(query) { queries.push(query); return { sort() { return { exec: async () => [] }; } }; },
    create: async data => data,
  };
  const studio = new CustomStudioService(null, null, null, model);
  await studio.getStudioAssets();
  await studio.getAllStudioAssetsAdmin();
  assert.ok(queries.every(query => query.type === 'CLIPART'));
  assert.equal(queries[0].isActive, true);
  assert.deepEqual(await studio.getStudioAssets('STICKER'), []);
  await assert.rejects(() => studio.createStudioAsset({ name: 'Tim', type: 'STICKER', icon: '❤️' }), error => error.getStatus() === 400);
  await assert.rejects(() => studio.createStudioAsset({ name: 'Tim', type: 'CLIPART', icon: '❤️' }), error => error.getStatus() === 400);
  const created = await studio.createStudioAsset({ name: 'Hoa', imageUrl: 'https://example.com/flower.png' });
  assert.equal(created.type, 'CLIPART');
  assert.equal(created.icon, created.imageUrl);
  assert.ok(new Asset({ name: 'Tim', icon: '❤️', type: 'STICKER' }).validateSync());
  console.log('Studio library: clipart-only listing, no emoji seeding or creation, and legacy schema compatibility passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
