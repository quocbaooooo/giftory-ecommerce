// Read-only benchmark against the configured database. Never creates collections or indexes.
require('reflect-metadata');
require('dotenv').config({ path: ['.env', '../.env'], quiet: true });
const mongoose = require('mongoose');
const { performance } = require('node:perf_hooks');
const { ProductSchema } = require('../dist/database/schemas/product.schema');
const { CategorySchema } = require('../dist/database/schemas/category.schema');
const { ProductsService } = require('../dist/modules/products/products.service');
let connection;
async function connect(uri) {
  connection = mongoose.createConnection(uri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 3000 });
  await connection.asPromise();
}
(async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/giftory_db';
  try { await connect(uri); }
  catch (error) {
    await connection?.close();
    if (!uri.includes('mongodb.net') && !uri.includes('mongodb+srv')) throw error;
    await connect('mongodb://127.0.0.1:27017/giftory_db');
  }
  const Product = connection.model('Product', ProductSchema);
  const Category = connection.model('Category', CategorySchema);
  const service = new ProductsService(Product, Category);
  const results = [];
  for (const view of [undefined, 'catalog']) {
    const start = performance.now();
    const result = await service.findAll({ limit: 12, ...(view ? { view } : {}) });
    const bytes = Buffer.byteLength(JSON.stringify({ success: true, statusCode: 200, message: 'Success', data: result.items, meta: result.meta }));
    results.push({ view: view || 'full', products: result.items.length, bytes, queryAndSerializeMs: Math.round(performance.now() - start) });
  }
  console.log(JSON.stringify({ results, payloadReductionPercent: +(100 * (1 - results[1].bytes / results[0].bytes)).toFixed(2) }, null, 2));
})().catch(() => { console.error('Benchmark could not connect to the configured database. No data was changed.'); process.exitCode = 1; })
  .finally(async () => { await connection?.close(); });
