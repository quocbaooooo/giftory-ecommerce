const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { randomInt } = require('node:crypto');
require('reflect-metadata');
const mongoose = require('mongoose');
const { ProductsService } = require('../dist/modules/products/products.service');
const { ProductSchema } = require('../dist/database/schemas/product.schema');
const { CategorySchema } = require('../dist/database/schemas/category.schema');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'giftory-price-test-'));
const port = randomInt(35000, 45000);
const proc = spawn(process.env.MONGOD_BINARY || 'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe', [
  '--dbpath', directory, '--port', String(port), '--bind_ip', '127.0.0.1', '--logpath', path.join(directory, 'mongo.log'),
], { windowsHide: true, stdio: 'ignore' });
let spawnError, connection, count = 0;
proc.on('error', error => { spawnError = error; });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function test(name, run) { await run(); count++; console.log(`PASS ${name}`); }
const prices = items => items.map(item => item.salePrice > 0 ? item.salePrice : item.price);

(async () => {
  for (let i = 0; i < 40; i++) {
    if (spawnError) throw spawnError;
    const candidate = mongoose.createConnection(`mongodb://127.0.0.1:${port}/price_test`, { serverSelectionTimeoutMS: 300 });
    try { connection = await candidate.asPromise(); break; }
    catch { await candidate.close(); await sleep(100); }
  }
  assert.ok(connection, 'Isolated MongoDB did not start');
  const Product = connection.model('Product', ProductSchema);
  const Category = connection.model('Category', CategorySchema);
  const service = new ProductsService(Product, Category);
  const category = await Category.create({ name: 'Quà tặng', slug: 'qua-tang' });
  const other = await Category.create({ name: 'Khác', slug: 'khac' });
  const examples = [
    { slug: 'gift-179', price: 180000, salePrice: 179000 },
    { slug: 'apron-175', price: 210000, salePrice: 175000 },
    { slug: 'gift-215', price: 250000, salePrice: 215000 },
    { slug: 'gift-199', price: 300000, salePrice: 199000 },
    { slug: 'no-discount-190', price: 190000 },
    { slug: 'zero-discount-180', price: 180000, salePrice: 0 },
    { slug: 'null-discount-165', price: 165000, salePrice: null },
    { slug: 'missing-discount-170', price: 170000 },
    { slug: 'boundary-200', price: 200000 },
    { slug: 'tie-175', price: 280000, salePrice: 175000 },
  ];
  await Product.create(examples.map(item => ({ ...item, name: `Quà ${item.slug}`, description: 'Quà sinh nhật cho mẹ', category: category._id, tags: ['Sinh nhật', 'Mẹ'], rating: 4.8 })));
  await Product.updateOne({ slug: 'missing-discount-170' }, { $unset: { salePrice: 1 } });
  await Product.create({ name: 'Ẩn', slug: 'inactive', description: 'Không hiển thị', category: category._id, price: 100, status: 'INACTIVE' });
  const expected = [165000, 170000, 175000, 175000, 179000, 180000, 190000, 199000, 200000, 215000];

  await test('ascending and descending sort use displayed selling prices', async () => {
    const asc = await service.findAll({ sort: 'price_asc', limit: 100 });
    const desc = await service.findAll({ sort: 'price_desc', limit: 100 });
    assert.deepEqual(prices(asc.items), expected);
    assert.deepEqual(prices(desc.items), [...expected].reverse());
    assert.equal(asc.meta.total, examples.length);
    assert.equal(asc.items[0].category.slug, category.slug);
    assert.ok(asc.items.every(item => !('__sellingPrice' in item)));
  });
  await test('sorting happens before pagination and equal-price products stay stable', async () => {
    const pages = await Promise.all([1, 2, 3, 4].map(page => service.findAll({ sort: 'price_asc', page, limit: 3 })));
    const items = pages.flatMap(page => page.items);
    assert.deepEqual(prices(items), expected);
    assert.equal(new Set(items.map(item => String(item._id))).size, examples.length);
    assert.ok(pages.every(page => page.meta.total === examples.length && page.meta.totalPages === 4));
    const again = await service.findAll({ sort: 'price_asc', page: 2, limit: 3 });
    assert.deepEqual(again.items.map(item => String(item._id)), pages[1].items.map(item => String(item._id)));
  });
  await test('under-200k filter includes the 175k apron and 199k discounted gift', async () => {
    for (const sort of ['price_asc', 'popular', 'newest']) {
      const result = await service.findAll({ maxPrice: 199999, sort, limit: 100 });
      assert.equal(result.meta.total, 8);
      assert.ok(result.items.some(item => item.slug === 'apron-175'));
      assert.ok(result.items.some(item => item.slug === 'gift-199'));
      assert.ok(prices(result.items).every(price => price < 200000));
    }
  });
  await test('200k–500k uses selling price with inclusive API bounds', async () => {
    const result = await service.findAll({ minPrice: 200000, maxPrice: 500000, sort: 'price_asc' });
    assert.deepEqual(prices(result.items), [200000, 215000]);
    assert.equal(result.meta.total, 2);
    const exact = await service.findAll({ minPrice: 175000, maxPrice: 175000, sort: 'price_desc' });
    assert.equal(exact.meta.total, 2);
    assert.deepEqual(prices(exact.items), [175000, 175000]);
  });
  await test('price ranges compose with category, search, occasion, recipient and rating filters', async () => {
    const result = await service.findAll({ minPrice: 170000, maxPrice: 199999, category: category.slug, search: 'qua', occasion: 'sinh nhat', recipient: 'me', minRating: 4, sort: 'price_asc' });
    assert.equal(result.meta.total, 7);
    assert.ok(result.items.every(item => String(item.category._id) === String(category._id)));
    const empty = await service.findAll({ category: String(other._id), maxPrice: 199999, sort: 'price_asc' });
    assert.equal(empty.meta.total, 0);
    assert.deepEqual(empty.items, []);
  });
  await test('compact catalog preserves prices and filters while excluding heavy Studio and category payloads', async () => {
    const heavy = 'data:image/png;base64,' + 'A'.repeat(300000);
    await Category.updateOne({ _id: category._id }, { $set: { emoji: heavy } });
    await Product.updateOne({ slug: 'gift-179' }, { $set: {
      customConfig: { frontBlankImage: heavy }, images: ['first-image', 'extra-image'],
      variants: [{ name: 'Style', price: 180000, stock: 2, image: heavy }], isFlashSale: true
    } });
    const full = await service.findAll({ sort: 'popular', limit: 100 });
    for (const sort of ['popular', 'price_asc', 'price_desc']) {
      const compact = await service.findAll({ sort, view: 'catalog', limit: 100 });
      assert.equal(compact.meta.total, full.meta.total);
      const gift = compact.items.find(item => item.slug === 'gift-179');
      assert.equal(gift.salePrice, 179000);
      assert.equal(gift.customConfig, undefined);
      assert.equal(gift.variants, undefined);
      assert.equal(gift.category.emoji, undefined);
      assert.deepEqual(gift.images, ['first-image']);
      assert.ok(JSON.stringify(compact).length < JSON.stringify(full).length / 10);
      if (sort === 'price_asc') assert.deepEqual(prices(compact.items), expected);
    }
    const fullGift = full.items.find(item => item.slug === 'gift-179');
    assert.equal(fullGift.customConfig.frontBlankImage, heavy, 'admin lists still include blank configuration');
    const flash = await service.getFlashSaleProducts(true);
    assert.equal(flash[0].customConfig, undefined);
    assert.equal(flash[0].category.emoji, undefined);
    const best = await service.getBestSellers(4, true);
    assert.ok(best.every(item => item.customConfig === undefined && item.category.emoji === undefined));
  });
  console.log(`${count} product price integration checks passed`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (connection) await connection.close();
  proc.kill();
  if (proc.exitCode === null && !spawnError) await new Promise(resolve => proc.once('exit', resolve));
  const resolved = fs.realpathSync(directory);
  const parent = fs.realpathSync(os.tmpdir());
  if (path.dirname(resolved) === parent && path.basename(resolved).startsWith('giftory-price-test-')) fs.rmSync(resolved, { recursive: true, force: true });
});
