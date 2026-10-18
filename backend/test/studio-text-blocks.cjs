require('reflect-metadata');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { validate } = require('class-validator');
const { CustomDesignSchema } = require('../dist/database/schemas/custom-design.schema');
const { SaveDesignDto } = require('../dist/modules/custom-studio/dto/save-design.dto');
const { CustomStudioService } = require('../dist/modules/custom-studio/custom-studio.service');
const Model = mongoose.model('TextBlockTest', CustomDesignSchema);
const textBlocks = [
  { id: 'title', text: 'MINH ANH & HOÀNG', face: 'front', color: '#123ABC', align: 'right', bold: true, italic: true, lineHeight: 1.8, letterSpacing: 3, fontFamily: 'Serif Elegant', fontSize: 28, x: 0.2, y: 0.1, width: 0.8, rotation: 30, scaleX: 1.5, scaleY: 1.5, visible: true },
  { id: 'message', text: 'Hành trình 5 năm\nCảm ơn vì luôn bên anh', face: 'back', fontFamily: 'Sans Minimal', fontSize: 12, lineHeight: 1.4, letterSpacing: 2.5, visible: false }
];
(async () => {
  const dto = Object.assign(new SaveDesignDto(), { productId: new mongoose.Types.ObjectId().toString(), textBlocks });
  assert.deepEqual(await validate(dto, { whitelist: true }), []);
  assert.deepEqual(dto.textBlocks, textBlocks, 'validation whitelist retains all text blocks');
  const service = new CustomStudioService({ create: async payload => new Model(payload) }, { findById: async () => ({ name: 'Gift', images: [] }) }, {}, {});
  const design = await service.saveDesign(dto);
  assert.deepEqual(design.toObject().textBlocks, textBlocks);
  assert.equal(design.validateSync(), undefined);
  const empty = await service.saveDesign({ ...dto, textBlocks: [] });
  assert.deepEqual(empty.toObject().textBlocks, []);
  const legacy = await service.saveDesign({ productId: dto.productId, frontMessage: 'Old design' });
  assert.equal(legacy.toObject().textBlocks, undefined, 'legacy messages remain distinguishable from deleted layers');
  assert.equal(legacy.frontMessage, 'Old design');
  console.log('Cloud text blocks: DTO whitelist, schema persistence, independent styles, transforms, empty and legacy designs passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
