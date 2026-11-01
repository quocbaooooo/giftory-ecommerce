import { BadRequestException } from '@nestjs/common';

export const PACKAGING_UNITS = { SMALL: 1, MEDIUM: 3, LARGE: 6, OVERSIZED: 0 };
const RANK = { SMALL: 1, MEDIUM: 2, LARGE: 3, OVERSIZED: 4, S: 1, M: 2, L: 3 };
export const OVERSIZED_NOTICE =
  'Sản phẩm này có kích thước đặc thù, đã được đóng gói chuyên dụng và không áp dụng hộp quà nắp gập.';
export const DEFAULT_GIFT_BOXES = [
  {
    id: 'NONE',
    name: 'Không lấy hộp',
    fee: 0,
    image: '/gift-boxes/none.svg',
    shortDescription: 'Bao bì tiêu chuẩn của sản phẩm',
    description: 'Không kèm hộp quà.',
    dimensions: 'Không áp dụng',
    available: true,
    size: 'S',
    capacity: 0,
  },
  {
    id: 'STANDARD',
    name: 'Hộp tiêu chuẩn',
    fee: 0,
    image: '/gift-boxes/standard.svg',
    shortDescription: 'Giấy cứng, nơ cơ bản',
    description: 'Hộp giấy cứng tiêu chuẩn với nơ cơ bản.',
    dimensions: '24 × 18 × 12 cm',
    available: true,
    size: 'S',
    capacity: 3,
  },
  {
    id: 'SILK',
    name: 'Hộp lụa cao cấp',
    fee: 45000,
    image: '/gift-boxes/silk.svg',
    shortDescription: 'Hộp lụa, nơ lụa, thiệp',
    description: 'Hộp bọc lụa kèm nơ và thiệp.',
    dimensions: '30 × 22 × 15 cm',
    available: true,
    size: 'M',
    capacity: 6,
  },
  {
    id: 'LUXURY',
    name: 'Hộp quà sang trọng',
    fee: 79000,
    image: '/gift-boxes/luxury.svg',
    shortDescription: 'Hộp cứng cao cấp, nơ lụa',
    description: 'Hộp cứng cao cấp, lòng lót mềm.',
    dimensions: '36 × 28 × 18 cm',
    available: true,
    size: 'L',
    capacity: 12,
  },
];
export function normalizeBoxes(boxes: any[] = DEFAULT_GIFT_BOXES) {
  return boxes.map((box) => {
    const defaults = DEFAULT_GIFT_BOXES.find((b) => b.id === box.id);
    return {
      ...box,
      size: box.size || defaults?.size || 'M',
      capacity: box.capacity ?? defaults?.capacity ?? 6,
    };
  });
}
export function itemPackaging(item: any) {
  const product =
    item.productId && typeof item.productId === 'object'
      ? item.productId
      : item;
  const rawSize = product.packagingSize || item.packagingSize || 'MEDIUM';
  const size = Object.prototype.hasOwnProperty.call(PACKAGING_UNITS, rawSize)
    ? rawSize
    : 'MEDIUM';
  const units = Number(
    product.packagingUnits ?? item.packagingUnits ?? PACKAGING_UNITS[size],
  );
  return {
    size,
    units:
      size === 'OVERSIZED'
        ? 0
        : Number.isFinite(units) && units > 0
          ? units
          : PACKAGING_UNITS[size] || 3,
  };
}
export function legacyPackaging(items: any[]) {
  const allocations = items
    .filter((i) => i.giftBoxStyle && i.giftBoxStyle !== 'NONE')
    .map((i) => ({
      itemId: String(i._id),
      boxStyle: i.giftBoxStyle,
      quantity: i.quantity,
    }));
  return allocations.length
    ? { mode: 'PARTIAL', allocations }
    : { mode: 'NONE', allocations: [] };
}
export function quotePackaging(items: any[], request: any, config: any[]) {
  const fail = (message: string): never => {
    throw new BadRequestException(message);
  };
  const mode = request?.mode || 'NONE';
  if (!['NONE', 'BUNDLED', 'INDIVIDUAL', 'PARTIAL'].includes(mode))
    fail('Cách đóng gói không hợp lệ.');
  const boxes: any[] = [];
  const allocations: any[] = [];
  const eligible = items.filter((i) => itemPackaging(i).size !== 'OVERSIZED');
  const selectBox = (
    id: string,
    members: { item: any; quantity: number }[],
  ) => {
    const box = config.find(
      (b) => b.id === id && b.id !== 'NONE' && b.available,
    );
    if (!box) fail('Mẫu hộp đã hết hoặc không tồn tại. Vui lòng chọn lại.');
    if (
      !['S', 'M', 'L'].includes(box.size) ||
      !Number.isFinite(Number(box.capacity)) ||
      box.capacity <= 0 ||
      !Number.isFinite(Number(box.fee)) ||
      box.fee < 0
    )
      fail('Cấu hình kích thước hoặc phí hộp không hợp lệ.');
    const units = members.reduce(
      (sum, m) => sum + itemPackaging(m.item).units * m.quantity,
      0,
    );
    if (members.some((m) => itemPackaging(m.item).size === 'OVERSIZED'))
      fail(OVERSIZED_NOTICE);
    if (
      members.some((m) => RANK[itemPackaging(m.item).size] > RANK[box.size]) ||
      units > box.capacity
    )
      fail(
        'Hộp đã chọn không đủ kích thước hoặc dung tích. Vui lòng chọn hộp lớn hơn.',
      );
    return box;
  };
  if (mode === 'BUNDLED') {
    if (!eligible.length)
      fail('Giỏ hàng không có sản phẩm phù hợp với hộp quà.');
    const box = selectBox(
      request.boxStyle,
      eligible.map((item) => ({ item, quantity: item.quantity })),
    );
    boxes.push({
      boxId: box.id,
      name: box.name,
      image: box.image,
      size: box.size,
      unitFee: box.fee,
      quantity: 1,
      items: eligible.map((i) => ({
        itemId: String(i._id),
        productName: i.productId?.name || i.name,
        quantity: i.quantity,
      })),
    });
  } else if (mode !== 'NONE') {
    if (!Array.isArray(request.allocations) || !request.allocations.length)
      fail('Vui lòng chọn ít nhất một món cần đóng hộp.');
    const seen = new Set<string>();
    for (const input of request.allocations) {
      if (!input || typeof input.itemId !== 'string')
        fail('Phân bổ sản phẩm đóng gói không hợp lệ.');
      const item = items.find((i) => String(i._id) === input.itemId);
      if (!item || seen.has(input.itemId))
        fail('Sản phẩm đóng gói đã thay đổi. Vui lòng chọn lại.');
      seen.add(input.itemId);
      const quantity = mode === 'INDIVIDUAL' ? item.quantity : input.quantity;
      if (
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > item.quantity
      )
        fail('Số lượng đóng hộp không hợp lệ.');
      const box = selectBox(input.boxStyle, [{ item, quantity: 1 }]);
      allocations.push({ itemId: input.itemId, boxStyle: box.id, quantity });
      boxes.push({
        boxId: box.id,
        name: box.name,
        image: box.image,
        size: box.size,
        unitFee: box.fee,
        quantity,
        items: [
          {
            itemId: String(item._id),
            productName: item.productId?.name || item.name,
            quantity,
          },
        ],
      });
    }
    if (mode === 'INDIVIDUAL' && eligible.some((i) => !seen.has(String(i._id))))
      fail('Chọn hộp riêng cho tất cả các món không quá cỡ.');
  }
  const totalFee = boxes.reduce(
    (sum, box) => sum + box.unitFee * box.quantity,
    0,
  );
  return {
    mode,
    boxStyle: mode === 'BUNDLED' ? request.boxStyle : undefined,
    allocations,
    boxes,
    totalFee,
    boxCount: boxes.reduce((s, b) => s + b.quantity, 0),
    valid: true,
    notice: '',
  };
}
