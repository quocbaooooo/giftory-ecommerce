require('reflect-metadata');
const assert = require('node:assert/strict');
const { validate } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { GUARDS_METADATA } = require('@nestjs/common/constants');
const { OpenClipartService } = require('../dist/modules/custom-studio/openclipart.service');
const { OpenClipartController } = require('../dist/modules/custom-studio/openclipart.controller');
const { SearchOpenClipartDto, ImportOpenClipartDto } = require('../dist/modules/custom-studio/dto/openclipart.dto');
const { parseOpenClipartSearch, parseOpenClipartDetail, translateClipartQuery } = require('../dist/modules/custom-studio/openclipart.parser');

const gallery = (name = 'Flowers &amp; Hearts') => `<h2>2 clipart for "flower" <small>(Page 1 of 2)</small></h2><div class="gallery"><div class="artwork"><a href="/detail/123/flower"><img src="/image/800px/123" alt="${name}" /></a></div><div class="artwork"><a href="/detail/456/heart"><img src="/image/800px/456" alt="Heart" /></a></div></div><div class="artwork gallery-ads">`;
const detail = id => `<h2>Flower &amp; Heart</h2><a href="/artist/Alice">Alice</a><a href="/tag/flower">flower</a><dt>Safe for Work?</dt><dd>Yes</dd><a href="/download/${id}">Download SVG</a>`;
const png = Buffer.alloc(32);
Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
png.write('IHDR', 12); png.writeUInt32BE(800, 16); png.writeUInt32BE(600, 20);
const originalFetch = global.fetch;
let count = 0;
async function test(name, fn) { await fn(); count++; console.log(`PASS ${name}`); }
function fixture() {
  const records = [], uploads = [], requests = [];
  const model = {
    find(filter) { return { select() { return { lean() { return { exec: async () => records.filter(record => filter.sourceId.$in.includes(record.sourceId)) }; } }; } }; },
    exists: async filter => records.some(record => record.sourceId === filter.sourceId),
    create: async data => { records.push(data); return data; },
  };
  global.fetch = async (url, options) => {
    const parsed = new URL(url); requests.push({ url: parsed, options });
    return parsed.pathname.startsWith('/image/') ? new Response(png, { headers: { 'content-type': 'image/png' } })
      : new Response(parsed.pathname.startsWith('/detail/') ? detail(parsed.pathname.split('/')[2]) : gallery(), { headers: { 'content-type': 'text/html' } });
  };
  const service = new OpenClipartService(model, { uploadImage: async (...args) => { uploads.push(args); return 'data:image/png;base64,' + png.toString('base64'); } });
  return { service, records, uploads, requests, model };
}

(async () => {
  await test('Vietnamese examples translate while arbitrary English is preserved', () => {
    assert.equal(translateClipartQuery(' Hoa '), 'flower');
    assert.equal(translateClipartQuery('trái tim'), 'heart');
    assert.equal(translateClipartQuery('Động vật'), 'animal');
    assert.equal(translateClipartQuery('birthday cake'), 'birthday cake');
  });
  await test('public search parser decodes names, pagination and same-origin results', () => {
    const result = parseOpenClipartSearch(gallery("Mother's flowers &amp; hearts"), 1);
    assert.equal(result.items[0].name, "Mother's flowers & hearts");
    assert.equal(result.items[0].previewUrl, 'https://openclipart.org/image/400px/123');
    assert.equal(result.hasNext, true);
    assert.equal(parseOpenClipartSearch('<h2>0 clipart for "none" (Page 1 of 1)</h2>', 1).items.length, 0);
    assert.throws(() => parseOpenClipartSearch('<html>Service unavailable</html>', 1));
    assert.throws(() => parseOpenClipartSearch('<h2>2 clipart for "flower" (Page 1 of 1)</h2>', 1));
  });
  await test('detail metadata uses the selected clipart and rejects reviewed or mismatched sources', () => {
    assert.deepEqual(parseOpenClipartDetail(detail('123'), '123'), { name: 'Flower & Heart', author: 'Alice', tags: ['flower'] });
    assert.throws(() => parseOpenClipartDetail(detail('456'), '123'));
    assert.throws(() => parseOpenClipartDetail(detail('123') + '<a href="/tag/pd_issue">pd_issue</a>', '123'));
    assert.throws(() => parseOpenClipartDetail(detail('123').replace('<dd>Yes</dd>', '<dd>No</dd>'), '123'));
  });
  await test('search caches upstream pages but refreshes already-imported badges', async () => {
    const { service, records, requests } = fixture();
    const first = await service.search('hoa');
    assert.equal(first.searchQuery, 'flower');
    assert.equal(requests[0].url.searchParams.get('query'), 'flower');
    records.push({ sourceId: '123' });
    const next = await service.search('hoa');
    assert.equal(requests.length, 1);
    assert.equal(first.items[0].imported, false);
    assert.equal(next.items[0].imported, true);
    await assert.rejects(() => service.search(' '), error => error.getStatus() === 400);
  });
  await test('import copies PNG, stores provenance and category, and skips duplicates', async () => {
    const { service, records, uploads } = fixture();
    const result = await service.import({ ids: ['123', '123'], category: 'Hoa cỏ', query: 'hoa' });
    assert.equal(result.imported, 1);
    assert.equal(uploads.length, 1);
    assert.ok(uploads[0][0].equals(png));
    assert.equal(records[0].type, 'CLIPART');
    assert.equal(records[0].sourceProvider, 'OPENCLIPART');
    assert.equal(records[0].sourceId, '123');
    assert.equal(records[0].author, 'Alice');
    assert.equal(records[0].license, 'CC0-1.0');
    assert.equal(records[0].category, 'Hoa cỏ');
    assert.ok(records[0].tags.includes('hoa'));
    assert.ok(records[0].imageUrl.startsWith('data:image/png;'));
    const again = await service.import({ ids: ['123'] });
    assert.equal(again.skipped, 1);
    assert.equal(uploads.length, 1);
  });
  await test('partial failures preserve successful imports and retryable item IDs', async () => {
    const { service, records } = fixture();
    const upstream = global.fetch;
    global.fetch = (url, options) => new URL(url).pathname === '/detail/456' ? Promise.resolve(new Response('unavailable', { status: 503 })) : upstream(url, options);
    const result = await service.import({ ids: ['123', '456'] });
    assert.equal(result.imported, 1); assert.equal(result.failed, 1);
    assert.equal(result.results[1].id, '456'); assert.equal(records.length, 1);
  });
  await test('invalid IDs and redirects cannot fetch arbitrary hosts', async () => {
    const { service, requests, uploads } = fixture();
    const badId = await service.import({ ids: ['http://127.0.0.1/private'] });
    assert.equal(badId.failed, 1); assert.equal(requests.length, 0);
    let fetched = 0;
    global.fetch = async () => { fetched++; return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }); };
    const redirect = await service.import({ ids: ['123'] });
    assert.equal(redirect.failed, 1); assert.equal(fetched, 1); assert.equal(uploads.length, 0);
  });
  await test('invalid images, oversized responses and duplicate races are handled', async () => {
    const { service, uploads, model } = fixture();
    const upstream = global.fetch;
    global.fetch = (url, options) => new URL(url).pathname.startsWith('/image/') ? Promise.resolve(new Response('<svg/>', { headers: { 'content-type': 'image/png' } })) : upstream(url, options);
    assert.equal((await service.import({ ids: ['123'] })).failed, 1);
    assert.equal(uploads.length, 0);
    global.fetch = (url, options) => new URL(url).pathname.startsWith('/image/') ? Promise.resolve(new Response(png, { headers: { 'content-type': 'image/png', 'content-length': String(6 * 1024 * 1024) } })) : upstream(url, options);
    assert.equal((await service.import({ ids: ['123'] })).failed, 1);
    global.fetch = upstream;
    model.create = async () => { throw { code: 11000 }; };
    assert.equal((await service.import({ ids: ['123'] })).skipped, 1);
  });
  await test('upstream outages produce a retryable 503 instead of empty fake results', async () => {
    const { service } = fixture();
    global.fetch = async () => { throw new Error('network down'); };
    await assert.rejects(() => service.search('birthday'), error => error.getStatus() === 503);
  });
  await test('DTOs enforce batch size, IDs and pagination; endpoints require admin guards', async () => {
    assert.equal((await validate(plainToInstance(ImportOpenClipartDto, { ids: ['123'], category: 'Hoa' }))).length, 0);
    for (const ids of [[], ['123', '123'], ['https://evil.test'], Array.from({ length: 21 }, (_, i) => String(i + 1))]) {
      assert.ok((await validate(plainToInstance(ImportOpenClipartDto, { ids }))).length);
    }
    for (const page of [0, -1, 1.5, 1001]) assert.ok((await validate(plainToInstance(SearchOpenClipartDto, { query: 'hoa', page }))).length);
    assert.equal(Reflect.getMetadata('roles', OpenClipartController)[0], 'ADMIN');
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, OpenClipartController).map(guard => guard.name), ['JwtAuthGuard', 'RolesGuard']);
  });
  console.log(`${count} OpenClipart checks passed.`);
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => { global.fetch = originalFetch; });
