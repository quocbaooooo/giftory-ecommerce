// Complex fields use JSON cells so every image, variant and Studio setting survives a round trip.
export const PRODUCT_COLUMNS = ['_id', 'name', 'slug', 'description', 'sku', 'price', 'salePrice',
  'categoryId', 'categorySlug', 'stock', 'status', 'images', 'variants', 'specs', 'tags', 'audience',
  'occasions', 'supportsCustomization', 'studioSupported', 'isCustomizable', 'isFlashSale',
  'flashSaleDiscountPercent', 'customBaseFee', 'customConfig', 'packagingSize', 'packagingUnits',
  'loyaltyEligible', 'rating', 'reviewCount', 'soldCount'];
const JSON_FIELDS = new Set(['images', 'variants', 'specs', 'tags', 'audience', 'occasions', 'customConfig']);
const BOOLEAN_FIELDS = new Set(['supportsCustomization', 'studioSupported', 'isCustomizable', 'isFlashSale', 'loyaltyEligible']);
const NUMBER_FIELDS = new Set(['price', 'salePrice', 'stock', 'flashSaleDiscountPercent', 'customBaseFee', 'packagingUnits', 'rating', 'reviewCount', 'soldCount']);
const OPTIONAL_ENUM_FIELDS = new Set(['packagingSize', 'status']);

export function productTable(products: any[]): string[][] {
  return [PRODUCT_COLUMNS, ...products.map(product => PRODUCT_COLUMNS.map(key => {
    const value = key === 'categoryId' ? (product.category?._id || product.category)
      : key === 'categorySlug' ? product.category?.slug : product[key];
    if (value === undefined) return '';
    if (JSON_FIELDS.has(key)) return JSON.stringify(value);
    const text = String(value ?? '');
    // Prevent CSV formula execution in Excel; the importer reverses this escape.
    return /^[=+\-@\t\r']/.test(text) && !NUMBER_FIELDS.has(key) ? "'" + text : text;
  }))];
}

export function encodeCsv(table: string[][]): string {
  return '\ufeff' + table.map(row => row.map(cell => '"' + cell.replace(/"/g, '""') + '"').join(',')).join('\r\n');
}

export function excelTable(table: string[][]): string[][] {
  // XML normalizes raw CR/CRLF; use SpreadsheetML escapes and protect literal escape text.
  return table.map(row => row.map(cell => cell.replace(/_x[0-9A-F]{4}_/g, value => '_x005F_' + value.slice(1)).replace(/\r/g, '_x000D_')));
}

export function parseCsv(source: string): string[][] {
  const text = source.replace(/^\ufeff/, '');
  const firstLine = text.split(/\r?\n/)[0];
  const delimiter = firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false, closed = false;
  const finishRow = () => { row.push(cell); if (row.some(value => value.trim())) rows.push(row); row = []; cell = ''; closed = false; };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') { quoted = false; closed = true; }
      else cell += char;
    } else if (char === '"' && cell === '' && !closed) quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ''; closed = false; }
    else if (char === '\r' || char === '\n') { if (char === '\r' && text[i + 1] === '\n') i++; finishRow(); }
    else { if (closed || char === '"') throw new Error('CSV có dấu nháy không hợp lệ.'); cell += char; }
  }
  if (quoted) throw new Error('CSV thiếu dấu nháy đóng.');
  finishRow();
  return rows;
}

export function tableProducts(table: string[][]): Record<string, any>[] {
  if (table.length < 2) throw new Error('Tệp không có sản phẩm.');
  const headers = table[0].map(cell => cell.replace(/^\ufeff/, '').trim());
  if (new Set(headers).size !== headers.length) throw new Error('Tên cột bị trùng.');
  if (!headers.includes('name') || !headers.includes('price')) throw new Error('Cần cột name và price. Hãy sử dụng tệp xuất từ hệ thống.');
  return table.slice(1).map((cells, index) => {
    if (cells.length > headers.length) throw new Error(`Dòng ${index + 2}: thừa cột.`);
    const product: Record<string, any> = {};
    headers.forEach((key, column) => {
      if (!PRODUCT_COLUMNS.includes(key)) return;
      let value = cells[column] ?? '';
      if (value.startsWith("'") && /^[=+\-@\t\r']/.test(value.slice(1))) value = value.slice(1);
      if (OPTIONAL_ENUM_FIELDS.has(key)) value = value.trim();
      if (value === '') return;
      try {
        if (JSON_FIELDS.has(key)) {
          const parsed = JSON.parse(value);
          if (key === 'customConfig' ? (parsed !== null && (typeof parsed !== 'object' || Array.isArray(parsed))) : !Array.isArray(parsed)) throw new Error('Kiểu JSON không hợp lệ');
          product[key] = parsed;
        } else if (NUMBER_FIELDS.has(key)) {
          if (!value.trim() || !Number.isFinite(Number(value))) throw new Error('Cần số hợp lệ');
          product[key] = Number(value);
        } else if (BOOLEAN_FIELDS.has(key)) {
          if (!/^(true|false|1|0)$/i.test(value.trim())) throw new Error('Chỉ chấp nhận true/false hoặc 1/0');
          product[key] = /^(true|1)$/i.test(value.trim());
        } else product[key] = value;
      } catch (error: any) { throw new Error(`Dòng ${index + 2}, cột ${key}: ${error.message}`); }
    });
    // Explicitly preserve empty strings on exported text fields (e.g. clearing SKU/description).
    headers.forEach((key, column) => {
      if (PRODUCT_COLUMNS.includes(key) && !JSON_FIELDS.has(key) && !NUMBER_FIELDS.has(key) && !BOOLEAN_FIELDS.has(key)
        && !OPTIONAL_ENUM_FIELDS.has(key) && !['_id', 'slug', 'categoryId', 'categorySlug'].includes(key) && cells[column] === '') product[key] = '';
    });
    return product;
  });
}
