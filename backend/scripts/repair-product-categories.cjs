const { Types, createConnection } = require('mongoose');

// Use the raw collection: Mongoose casts string IDs before querying, which
// otherwise hides the legacy BSON type mismatch this repair must detect.
async function repairProductCategories(connection, apply = false) {
  const products = connection.collection('products');
  const categories = connection.collection('categories');
  const report = { candidates: 0, repaired: 0, skipped: 0 };
  for await (const product of products.find({ category: { $type: 'string' } }, { projection: { category: 1 } })) {
    if (!/^[a-f\d]{24}$/i.test(product.category)) { report.skipped++; continue; }
    const category = new Types.ObjectId(product.category);
    if (!await categories.findOne({ _id: category }, { projection: { _id: 1 } })) {
      report.skipped++;
      continue;
    }
    report.candidates++;
    if (apply) {
      const result = await products.updateOne(
        { _id: product._id, category: product.category },
        { $set: { category } },
      );
      report.repaired += result.modifiedCount;
    }
  }
  return report;
}

module.exports = { repairProductCategories };

if (require.main === module) {
  require('dotenv').config({ path: ['.env', '../.env'], quiet: true });
  (async () => {
    const connection = await createConnection(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/giftory_db', {
      serverSelectionTimeoutMS: 5000,
    }).asPromise();
    try {
      const apply = process.argv.includes('--apply');
      console.log(JSON.stringify({ apply, ...await repairProductCategories(connection, apply) }));
    } finally { await connection.close(); }
  })().catch(error => { console.error(error.name); process.exitCode = 1; });
}
