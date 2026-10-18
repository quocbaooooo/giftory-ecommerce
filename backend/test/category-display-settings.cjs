require('reflect-metadata');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { plainToInstance } = require('class-transformer');
const { validate } = require('class-validator');
const { CategoriesService } = require('../dist/modules/categories/categories.service');
const { CategoriesController } = require('../dist/modules/categories/categories.controller');
const { CategoryDisplaySettingsDto } = require('../dist/modules/categories/dto/category-display-settings.dto');
const { CategoryDisplaySettingsSchema } = require('../dist/database/schemas/category-display-settings.schema');

(async () => {
  let saved;
  const settingsModel = {
    findOne: query => ({ lean: () => ({ exec: async () => { assert.equal(query.key, 'storefront'); return saved; } }) }),
    findOneAndUpdate: (query, update, options) => ({ lean: () => ({ exec: async () => {
      assert.equal(query.key, 'storefront');
      assert.equal(options.upsert, true);
      assert.equal(options.runValidators, true);
      saved = { ...saved, ...update.$set };
      return saved;
    } }) }),
  };
  const service = new CategoriesService(null, null, settingsModel);
  assert.deepEqual(await service.getDisplaySettings(), { allCategoriesIcon: '🎁' });
  for (const icon of ['✨', '/icons/all-categories.png', 'https://example.com/icon.png', 'data:image/png;base64,aGVsbG8=']) {
    const dto = plainToInstance(CategoryDisplaySettingsDto, { allCategoriesIcon: ` ${icon} ` });
    assert.deepEqual(await validate(dto), []);
    assert.deepEqual(await service.updateDisplaySettings(dto), { allCategoriesIcon: icon });
    const reopened = new CategoriesService(null, null, settingsModel);
    assert.deepEqual(await reopened.getDisplaySettings(), { allCategoriesIcon: icon });
  }
  for (const input of [{}, { allCategoriesIcon: '' }, { allCategoriesIcon: '  ' }, { allCategoriesIcon: 123 }]) {
    assert.ok((await validate(plainToInstance(CategoryDisplaySettingsDto, input))).length);
  }
  const write = CategoriesController.prototype.updateDisplaySettings;
  assert.deepEqual(Reflect.getMetadata('roles', write), ['ADMIN']);
  assert.equal(Reflect.getMetadata('__guards__', write).length, 2);
  const Model = mongoose.model('CategoryDisplaySettingsTest', CategoryDisplaySettingsSchema);
  const document = new Model({ allCategoriesIcon: '✨' });
  assert.equal(document.validateSync(), undefined);
  assert.equal(document.key, 'storefront');
  assert.equal(CategoryDisplaySettingsSchema.indexes().filter(([key, options]) => key.key === 1 && options.unique).length, 1);
  console.log('Category display settings: defaults, persistent emoji/image updates, validation, admin guards and unique singleton passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
