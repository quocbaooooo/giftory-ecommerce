import { StudioAsset, StudioGraphic } from '../../core/models';

// Local, editable vector assets; no dependency on third-party image hosts.
export const CLIPART_LIBRARY: StudioAsset[] = [
  ['heart', 'Trái tim', 'Tình yêu', 'tim love'],
  ['flower', 'Hoa năm cánh', 'Hoa cỏ', 'hoa flower'],
  ['leaf', 'Cành lá', 'Hoa cỏ', 'lá thiên nhiên'],
  ['star', 'Ngôi sao', 'Phổ biến', 'sao star'],
  ['moon', 'Trăng khuyết', 'Phổ biến', 'trăng moon'],
  ['gift', 'Hộp quà', 'Sinh nhật', 'quà gift'],
  ['cake', 'Bánh sinh nhật', 'Sinh nhật', 'bánh cake'],
  ['balloons', 'Bóng bay', 'Sinh nhật', 'bóng tiệc'],
  ['bow', 'Nơ xinh', 'Tình yêu', 'nơ bow'],
  ['butterfly', 'Bươm bướm', 'Hoa cỏ', 'bướm butterfly'],
  ['cat', 'Mèo nhỏ', 'Động vật', 'mèo cat'],
  ['frame', 'Khung kỷ niệm', 'Khung trang trí', 'khung frame'],
].map(([id, name, category, tags]) => ({
  _id: `builtin-${id}`, name, category, tags: tags.split(' '), icon: '',
  type: 'CLIPART', imageUrl: `/cliparts/${id}.svg`, surcharge: 0,
}));

export function filterGraphics(assets: StudioAsset[], category: string, query: string): StudioAsset[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  const needle = normalize(query.trim());
  return assets.filter(asset => asset.type === 'CLIPART'
    && (!category || asset.category === category)
    && normalize(`${asset.name} ${asset.category || ''} ${(asset.tags || []).join(' ')}`).includes(needle));
}

export function graphicsForFace(graphics: StudioGraphic[], front: boolean): StudioGraphic[] {
  // Old emoji designs did not store a face and appeared on both sides.
  return graphics.filter(graphic => !graphic.face || graphic.face === (front ? 'front' : 'back'));
}
