import { StudioAsset, StudioGraphic } from '../../core/models';

export function filterGraphics(assets: StudioAsset[], category: string, query: string): StudioAsset[] {
  const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd');
  const needle = normalize(query.trim());
  return assets.filter(asset => asset.type === 'CLIPART'
    && (!category || (asset.category || 'Phổ biến') === category)
    && normalize(`${asset.name} ${asset.category || ''} ${(asset.tags || []).join(' ')}`).includes(needle));
}

export function graphicsForFace(graphics: StudioGraphic[], front: boolean): StudioGraphic[] {
  // Old emoji designs did not store a face and appeared on both sides.
  return graphics.filter(graphic => !graphic.face || graphic.face === (front ? 'front' : 'back'));
}
