import { signal } from '@angular/core';
import { Product, ProductVariant } from '../../core/models';

export const available = (v: ProductVariant) => v.status !== 'HIDDEN' && v.status !== 'OUT_OF_STOCK' && v.stock > 0;
export const colorName = (v: ProductVariant) => v.color?.trim() || v.name;
export const variantImages = (v: ProductVariant) => [v.image || '', ...(v.images || [])].filter(Boolean);

export class ProductOptions {
  product = signal<Product | null>(null);
  color = signal('');
  size = signal('');
  attempted = signal(false);
  quantity = signal(1);
  activeImage = signal('');
  variants() { return (this.product()?.variants || []).filter(v => v.status !== 'HIDDEN'); }
  colors() { return [...new Set(this.variants().map(colorName))]; }
  sizes() { return [...new Set(this.variants().map(v => v.size || '').filter(Boolean))]; }
  selected() {
    return this.variants().find(v => colorName(v) === this.color() && (v.size || '') === this.size() && available(v));
  }
  price() { return this.selected()?.price ?? (this.product()?.salePrice || this.product()?.price || 0); }
  stock() { return this.selected()?.stock ?? (this.variants().length ? 0 : this.product()?.stock || 0); }
  gallery() {
    const config = this.product()?.customConfig;
    const blankImages = new Set([
      config?.frontBlankImage, config?.backBlankImage,
      ...(config?.blanks || []).flatMap(blank => [blank.frontBlankImage, blank.backBlankImage])
    ].filter(Boolean));
    return [...new Set([
      ...(this.product()?.images || []).filter(image => !blankImages.has(image)), ...this.variants().flatMap(variantImages)
    ])];
  }
  load(p: Product) {
    this.product.set(p); this.color.set(''); this.size.set(''); this.quantity.set(1); this.attempted.set(false);
    const choices = this.variants().filter(available);
    if (choices.length === 1) { this.color.set(colorName(choices[0])); this.size.set(choices[0].size || ''); }
    this.changed();
  }
  colorAvailable(color: string) { return this.variants().some(v => colorName(v) === color && available(v)); }
  sizeAvailable(size: string) { return this.variants().some(v => (!this.color() || colorName(v) === this.color()) && v.size === size && available(v)); }
  hex(color: string) { return this.variants().find(v => colorName(v) === color)?.colorHex || 'transparent'; }
  chooseColor(color: string) {
    if (!this.colorAvailable(color)) return;
    this.color.set(color);
    if (this.size() && !this.sizeAvailable(this.size())) this.size.set('');
    this.changed();
  }
  chooseSize(size: string) { if (this.sizeAvailable(size)) { this.size.set(size); this.changed(); } }
  changed() {
    this.quantity.set(1);
    const selected = this.selected();
    const images = selected ? variantImages(selected)
      : this.variants().filter(v => colorName(v) === this.color()).flatMap(variantImages);
    // Select the matching photo without moving thumbnails out of their saved order.
    this.activeImage.set(images[0] || this.gallery()[0] || '');
  }
  error() {
    this.attempted.set(true);
    if (this.variants().length && !this.color()) return 'Vui lòng chọn màu sắc';
    if (this.sizes().length && !this.size()) return 'Vui lòng chọn kích thước';
    if ((this.product()?.variants?.length && !this.selected()) || this.stock() <= 0) return 'Sản phẩm đã hết hàng';
    if (!Number.isInteger(this.quantity()) || this.quantity() < 1 || this.quantity() > this.stock()) return 'Số lượng vượt quá tồn kho';
    return '';
  }
  moveImage(delta: number) {
    const images = this.gallery();
    if (images.length) this.activeImage.set(images[(images.indexOf(this.activeImage()) + delta + images.length) % images.length]);
  }
}
