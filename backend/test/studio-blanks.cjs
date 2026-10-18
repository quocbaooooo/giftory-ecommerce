require('reflect-metadata');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { ProductSchema } = require('../dist/database/schemas/product.schema');
const { ProductsService } = require('../dist/modules/products/products.service');
const Product = mongoose.model('StudioBlankTest', ProductSchema);
const config = { supportedColors: ['Independent blank'], blanks: [{ name: 'Independent blank', colorHex: '#123456', frontBlankImage: 'blank-front', backBlankImage: 'blank-back' }] };
const document = new Product({ name: 'Gift', slug: 'gift', description: 'Gift', price: 100, category: new mongoose.Types.ObjectId(), customConfig: config });
assert.equal(document.validateSync(), undefined);
assert.equal(document.toObject().customConfig.blanks[0].backBlankImage, 'blank-back');
const model = {
  create: async payload => payload,
  findByIdAndUpdate: (_id, payload) => ({ exec: async () => payload }),
  findOne: async () => null
};
const categoryId = new mongoose.Types.ObjectId().toString();
const service = new ProductsService(model, {});
(async () => {
  for (const action of ['create', 'update']) {
    const payload = { name: 'Gift', slug: 'gift', category: categoryId, price: 100, isCustomizable: true,
      variants: [{ name: 'Sales style', price: 200, stock: 2 }], customConfig: structuredClone(config) };
    const result = action === 'create' ? await service.create(payload) : await service.update(categoryId, payload);
    assert.deepEqual(result.customConfig.supportedColors, ['Independent blank']);
    assert.equal(result.customConfig.blanks[0].name, 'Independent blank');
    assert.equal(result.variants[0].name, 'Sales style');
  }
  console.log('Studio blank schema and create/update preserve independent configuration');
})().catch(error => { console.error(error); process.exitCode = 1; });
