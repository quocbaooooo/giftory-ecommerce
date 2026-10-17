export const OPENCLIPART_ORIGIN = 'https://openclipart.org';

export interface OpenClipartItem {
  id: string;
  name: string;
  previewUrl: string;
  sourceUrl: string;
  imported?: boolean;
}

export function plainText(value: string): string {
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return value.replace(/<[^>]*>/g, '').replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity: string) => {
    if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || match;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/\s+/g, ' ').trim();
}

export function translateClipartQuery(query: string): string {
  const normalized = query.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  const translations: Record<string, string> = {
    hoa: 'flower', 'hoa la': 'flower leaves', 'hoa hong': 'rose', 'hoa sen': 'lotus',
    tim: 'heart', 'trai tim': 'heart', 'tinh yeu': 'love', 'sinh nhat': 'birthday',
    'banh sinh nhat': 'birthday cake', 'banh kem': 'birthday cake', 'hop qua': 'gift',
    'qua tang': 'gift', meo: 'cat', cho: 'dog', buom: 'butterfly',
    'dong vat': 'animal', 'ngoi sao': 'star', trang: 'moon', 'la cay': 'leaves',
    'khung trang tri': 'decorative frame', 'giang sinh': 'christmas', 'nam moi': 'new year',
  };
  return translations[normalized] || query.trim();
}

// Parse only the observed public gallery, never remote scripts or arbitrary links.
export function parseOpenClipartSearch(html: string, page: number) {
  const heading = html.match(/(\d+)\s+clipart for[\s\S]*?\(Page\s+(\d+)\s+of\s+(\d+)\)/i);
  if (!heading) throw new Error('OpenClipart search format changed');
  const gallery = html.match(/<div\s+class=["']gallery["']\s*>([\s\S]*?)<\/div>\s*<div\s+class=["']artwork gallery-ads/i)?.[1]
    || html.slice(html.indexOf('class="gallery"'));
  const items: OpenClipartItem[] = [];
  for (const match of gallery.matchAll(/<a\s+[^>]*href=["'](\/detail\/([1-9]\d{0,8})(?:\/[^"']*)?)["'][^>]*>\s*<img\b([^>]+)>/gi)) {
    const image = match[3];
    if (!new RegExp(`\\bsrc=["']/image/\\d+px/${match[2]}["']`).test(image)) continue;
    const name = plainText(image.match(/\balt=(["'])([\s\S]*?)\1/i)?.[2] || `Clipart ${match[2]}`);
    if (items.some(item => item.id === match[2])) continue;
    items.push({ id: match[2], name: name.slice(0, 200), previewUrl: `${OPENCLIPART_ORIGIN}/image/400px/${match[2]}`, sourceUrl: `${OPENCLIPART_ORIGIN}${match[1]}` });
  }
  if (Number(heading[1]) > 0 && page <= Number(heading[3]) && !items.length) throw new Error('OpenClipart gallery format changed');
  return { items, total: Number(heading[1]), page, hasNext: page < Number(heading[3]) };
}

export function parseOpenClipartDetail(html: string, id: string) {
  const name = plainText(html.match(/<h2\b[^>]*>([\s\S]*?)<\/h2>/i)?.[1] || '');
  if (!name || !html.includes(`/download/${id}`)) throw new Error('Không tìm thấy clipart trên OpenClipart.');
  const tags = [...html.matchAll(/<a\b[^>]*href=["']\/tag\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match => plainText(match[1]));
  if (tags.some(tag => /^(pd_issue|need-review)$/i.test(tag))) throw new Error('Clipart đang được OpenClipart xem xét, vui lòng chọn hình khác.');
  if (/Safe for Work\?<\/dt>\s*<dd[^>]*>\s*No\s*<\/dd>/i.test(html)) throw new Error('Clipart không phù hợp với thư viện quà tặng.');
  const author = plainText(html.match(/<a\b[^>]*href=["']\/artist\/[^"']*["'][^>]*>([\s\S]*?)<\/a>/i)?.[1] || '');
  return { name: name.slice(0, 200), author: author.slice(0, 100), tags: tags.slice(0, 30) };
}
