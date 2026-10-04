/**
 * Helper xử lý tiếng Việt có dấu/không dấu và tạo biểu thức Regex tìm kiếm linh hoạt (US-PD-01.2)
 */

export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .trim();
}

/**
 * Tạo regex tìm kiếm tiếng Việt không phụ thuộc dấu
 * Ví dụ: "binh" -> "[bB][iIíìỉĩị][nN][hH]" để khớp cả "Bình", "bình", "binh"
 */
export function buildVietnameseRegex(keyword: string): RegExp {
  const clean = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const accentMap: Record<string, string> = {
    a: '[aàáảãạăằắẳẵặâầấẩẫậAÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬ]',
    e: '[eèéẻẽẹêềếểễệEÈÉẺẼẸÊỀẾỂỄỆ]',
    i: '[iìíỉĩịIÌÍỈĨỊ]',
    o: '[oòóỏõọôồốổỗộơờớởỡợOÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢ]',
    u: '[uùúủũụưừứửữựUÙÚỦŨỤƯỪỨỬỮỰ]',
    y: '[yỳýỷỹỵYỲÝỶỸỴ]',
    d: '[dđDĐ]',
  };

  let pattern = '';
  for (const char of clean.toLowerCase()) {
    if (accentMap[char]) {
      pattern += accentMap[char];
    } else {
      pattern += char;
    }
  }

  return new RegExp(pattern, 'i');
}
