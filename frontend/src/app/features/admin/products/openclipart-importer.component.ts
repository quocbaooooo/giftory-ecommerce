import { Component, EventEmitter, OnDestroy, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { CustomStudioService } from '../../../core/services/custom-studio.service';
import { OpenClipartItem } from '../../../core/models';
import { DialogFocusDirective } from '../../../shared/components/dialog-focus.directive';

@Component({
  selector: 'app-openclipart-importer',
  standalone: true,
  imports: [CommonModule, FormsModule, DialogFocusDirective],
  template: `
    <section class="bg-white rounded-3xl border border-giftory-border p-4 sm:p-6 space-y-5" aria-labelledby="clipart-import-title">
      <div>
        <h2 id="clipart-import-title" class="text-lg font-bold text-[#1E1B4B]">Nhập clipart từ OpenClipart</h2>
        <p class="text-xs text-slate-500 mt-1">Tìm hình, xem preview và tick chọn để thêm vào thư viện Đồ họa của Design Studio.</p>
        <a href="https://openclipart.org/share" target="_blank" rel="noopener noreferrer" class="text-[11px] text-purple-600 underline">Nguồn OpenClipart · CC0</a>
      </div>

      <form (ngSubmit)="search(1, true)" class="flex flex-col sm:flex-row gap-2">
        <label class="flex-1">
          <span class="sr-only">Từ khóa clipart</span>
          <input name="clipartQuery" [(ngModel)]="query" maxlength="100" [disabled]="importing()" placeholder="birthday, hoa, trái tim…"
            class="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-purple-500">
        </label>
        <button type="submit" [disabled]="!query.trim() || searching() || importing()"
          class="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">
          {{ searching() ? 'Đang tìm…' : 'Tìm clipart' }}
        </button>
      </form>
      <div class="flex flex-wrap gap-2">
        @for (term of suggestions; track term) {
          <button (click)="useSuggestion(term)" [disabled]="importing()" class="text-xs px-3 py-1.5 rounded-full bg-purple-50 text-purple-700 hover:bg-purple-100 disabled:opacity-40 cursor-pointer">{{ term }}</button>
        }
      </div>

      @if (error()) { <p role="alert" class="p-3 bg-red-50 text-red-700 text-xs rounded-xl">{{ error() }}</p> }
      @if (summary()) { <p role="status" class="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl">{{ summary() }}</p> }
      @if (failures().length) {
        <ul class="text-xs text-amber-800 space-y-1" aria-label="Các clipart nhập chưa thành công">
          @for (failure of failures(); track failure.id) { <li>{{ failure.name }}: {{ failure.message }}</li> }
        </ul>
      }

      <div class="sticky top-16 md:top-0 z-20 rounded-2xl border border-purple-200 bg-purple-50 p-3 sm:p-4 space-y-3 shadow-sm">
        <div class="flex flex-wrap items-end gap-3">
          <label class="flex-1 min-w-[160px] text-xs font-bold text-slate-700">Chủ đề lưu vào thư viện
            <input [(ngModel)]="category" maxlength="60" [disabled]="importing()" placeholder="Ví dụ: Sinh nhật" list="clipart-categories"
              class="block w-full mt-1 px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-normal">
            <datalist id="clipart-categories"><option value="Phổ biến"></option><option value="Sinh nhật"></option><option value="Hoa cỏ"></option><option value="Tình yêu"></option><option value="Động vật"></option><option value="Khung trang trí"></option></datalist>
          </label>
          <button (click)="importSelected()" [disabled]="!selectedCount() || importing() || searching()"
            class="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-sm disabled:opacity-40 cursor-pointer">
            {{ importing() ? 'Đang import…' : 'Import (' + selectedCount() + ')' }}
          </button>
        </div>
        <div class="flex flex-wrap items-center gap-3 text-xs">
          <span class="font-bold text-purple-800">Đã chọn {{ selectedCount() }}/20 hình</span>
          <button (click)="selectPage()" [disabled]="importing() || searching() || !items().length" class="text-purple-700 underline disabled:opacity-40 cursor-pointer">Chọn trang này</button>
          <button (click)="clearSelection()" [disabled]="importing() || !selectedCount()" class="text-slate-500 underline disabled:opacity-40 cursor-pointer">Bỏ chọn tất cả</button>
        </div>
        @if (selectedCount()) {
          <div class="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto" aria-label="Clipart đã chọn">
            @for (item of selectedItems(); track item.id) {
              <button (click)="toggle(item)" [disabled]="importing()" [attr.aria-label]="'Bỏ chọn ' + item.name" class="max-w-[180px] truncate bg-white rounded-lg border border-purple-200 px-2 py-1 text-[11px] text-purple-700 cursor-pointer">{{ item.name }} ×</button>
            }
          </div>
        }
        @if (importing()) { <p role="status" class="text-xs text-purple-700">Đang tải và lưu ảnh đã chọn. Vui lòng chờ hoàn tất.</p> }
      </div>

      @if (searching()) {
        <p role="status" class="py-10 text-center text-sm text-slate-500">Đang tìm trên OpenClipart…</p>
      } @else if (hasSearched()) {
        <div class="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
          <span>{{ total() }} kết quả · Trang {{ page() }} @if (searchQuery() !== lastQuery) { · Tìm theo “{{ searchQuery() }}” }</span>
          <span>Hình đã nhập sẽ được đánh dấu.</span>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          @for (item of items(); track item.id) {
            <article class="border rounded-2xl overflow-hidden" [ngClass]="selected().has(item.id) ? 'border-purple-500 ring-2 ring-purple-100' : 'border-slate-200'">
              <label class="block cursor-pointer p-2">
                <div class="flex justify-between items-center mb-2 gap-2">
                  <input type="checkbox" [checked]="selected().has(item.id)" (change)="toggle(item)" [attr.aria-label]="'Chọn ' + item.name"
                    [disabled]="importing() || item.imported || brokenPreviews().has(item.id) || (!selected().has(item.id) && selectedCount() >= 20)" class="rounded text-purple-600">
                  @if (item.imported) { <span class="text-[10px] text-emerald-700 font-bold">Đã nhập</span> }
                </div>
                <div class="h-32 sm:h-36 flex items-center justify-center rounded-xl bg-slate-50">
                  @if (brokenPreviews().has(item.id)) { <span class="text-xs text-slate-400">Preview không tải được</span> }
                  @else { <img [src]="item.previewUrl" [alt]="item.name" loading="lazy" referrerpolicy="no-referrer" (error)="markPreviewFailed(item.id)" class="max-h-full max-w-full object-contain p-2"> }
                </div>
                <p class="text-xs font-semibold text-slate-700 mt-2 truncate" [title]="item.name">{{ item.name }}</p>
              </label>
              <div class="flex justify-between px-2 pb-3 gap-2 text-[11px]">
                <button (click)="preview.set(item)" class="text-purple-700 underline cursor-pointer">Xem lớn</button>
                <a [href]="item.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-slate-500 underline">Nguồn ↗</a>
              </div>
            </article>
          } @empty { <p class="col-span-full text-sm text-slate-500 text-center py-10">Không có kết quả. Thử từ khóa tiếng Anh hoặc chọn gợi ý phía trên.</p> }
        </div>
        <div class="flex items-center justify-center gap-4">
          <button (click)="search(page() - 1)" [disabled]="page() <= 1 || importing()" class="px-4 py-2 text-xs rounded-xl border border-slate-200 disabled:opacity-40 cursor-pointer">Trang trước</button>
          <span class="text-xs text-slate-500">{{ page() }}</span>
          <button (click)="search(page() + 1)" [disabled]="!hasNext() || importing()" class="px-4 py-2 text-xs rounded-xl border border-slate-200 disabled:opacity-40 cursor-pointer">Trang sau</button>
        </div>
      } @else {
        <p class="text-sm text-slate-400 text-center py-10">Nhập từ khóa hoặc chọn một chủ đề để bắt đầu.</p>
      }
    </section>

    @if (preview(); as item) {
      <div class="fixed inset-0 z-50 bg-black/60 p-4 flex items-center justify-center" (click)="preview.set(null)" (keydown.escape)="preview.set(null)">
        <section appDialogFocus role="dialog" aria-modal="true" aria-label="Xem trước clipart" class="bg-white rounded-3xl p-5 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-3" (click)="$event.stopPropagation()">
          <div class="flex items-center justify-between gap-3"><h3 class="font-bold text-sm">{{ item.name }}</h3><button (click)="preview.set(null)" aria-label="Đóng preview" class="text-xl px-2 cursor-pointer">×</button></div>
          <img [src]="item.previewUrl.replace('/400px/', '/800px/')" [alt]="item.name" referrerpolicy="no-referrer" class="w-full max-h-[60vh] object-contain bg-slate-50 rounded-xl">
          <div class="flex justify-between items-center gap-3 text-xs">
            <a [href]="item.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-purple-600 underline">Xem trên OpenClipart ↗</a>
            <button (click)="toggle(item)" [disabled]="item.imported || importing() || (!selected().has(item.id) && selectedCount() >= 20)" class="px-4 py-2 bg-purple-600 text-white rounded-xl disabled:opacity-40 cursor-pointer">{{ item.imported ? 'Đã nhập' : selected().has(item.id) ? 'Bỏ chọn' : 'Chọn hình này' }}</button>
          </div>
        </section>
      </div>
    }
  `,
})
export class OpenClipartImporterComponent implements OnDestroy {
  private readonly service = inject(CustomStudioService);
  @Output() imported = new EventEmitter<void>();
  query = '';
  category = 'Phổ biến';
  lastQuery = '';
  suggestions = ['birthday', 'hoa', 'trái tim', 'động vật', 'khung trang trí'];
  items = signal<OpenClipartItem[]>([]);
  selected = signal(new Map<string, OpenClipartItem>());
  selectedItems = computed(() => [...this.selected().values()]);
  selectedCount = computed(() => this.selected().size);
  searching = signal(false);
  importing = signal(false);
  hasSearched = signal(false);
  page = signal(1);
  total = signal(0);
  hasNext = signal(false);
  searchQuery = signal('');
  error = signal('');
  summary = signal('');
  failures = signal<Array<{ id: string; name: string; message: string }>>([]);
  brokenPreviews = signal(new Set<string>());
  preview = signal<OpenClipartItem | null>(null);
  private searchSubscription?: Subscription;
  private importSubscription?: Subscription;

  useSuggestion(term: string): void { this.query = term; this.search(1, true); }

  search(page: number, newQuery = false): void {
    const query = newQuery ? this.query.trim() : this.lastQuery;
    if (!query || this.importing()) return;
    this.searchSubscription?.unsubscribe();
    if (newQuery && query !== this.lastQuery) this.clearSelection();
    this.searching.set(true);
    this.error.set('');
    this.summary.set('');
    this.searchSubscription = this.service.searchOpenClipart(query, page).subscribe({
      next: result => {
        this.lastQuery = result.query;
        this.items.set(result.items);
        // Keep selections across pages, but never select a clipart already imported elsewhere.
        this.selected.update(selected => {
          const next = new Map(selected);
          result.items.filter(item => item.imported).forEach(item => next.delete(item.id));
          return next;
        });
        this.page.set(result.page); this.total.set(result.total); this.hasNext.set(result.hasNext);
        this.searchQuery.set(result.searchQuery); this.brokenPreviews.set(new Set());
        this.hasSearched.set(true); this.searching.set(false);
      },
      error: error => { this.error.set(this.errorMessage(error, 'Không tìm được clipart. Vui lòng thử lại.')); this.searching.set(false); },
    });
  }

  toggle(item: OpenClipartItem): void {
    if (this.importing() || item.imported || this.brokenPreviews().has(item.id)) return;
    this.selected.update(selected => {
      const next = new Map(selected);
      if (next.has(item.id)) next.delete(item.id);
      else if (next.size < 20) next.set(item.id, item);
      return next;
    });
  }

  selectPage(): void {
    if (this.importing() || this.searching()) return;
    this.selected.update(selected => {
      const next = new Map(selected);
      this.items().filter(item => !item.imported && !this.brokenPreviews().has(item.id)).forEach(item => { if (next.size < 20) next.set(item.id, item); });
      return next;
    });
  }

  clearSelection(): void { this.selected.set(new Map()); this.failures.set([]); }
  markPreviewFailed(id: string): void {
    this.brokenPreviews.update(ids => new Set([...ids, id]));
    this.selected.update(selected => { const next = new Map(selected); next.delete(id); return next; });
  }

  importSelected(): void {
    if (!this.selectedCount() || this.importing() || this.searching()) return;
    const selected = new Map(this.selected());
    this.importing.set(true); this.error.set(''); this.summary.set(''); this.failures.set([]);
    this.importSubscription = this.service.importOpenClipart([...selected.keys()], this.category.trim() || 'Phổ biến', this.lastQuery).subscribe({
      next: result => {
        const done = new Set(result.results.filter(item => item.status !== 'failed').map(item => item.id));
        this.items.update(items => items.map(item => done.has(item.id) ? { ...item, imported: true } : item));
        this.selected.update(items => new Map([...items].filter(([id]) => !done.has(id))));
        this.failures.set(result.results.filter(item => item.status === 'failed').map(item => ({ id: item.id, name: selected.get(item.id)?.name || item.id, message: item.message || 'Vui lòng thử lại.' })));
        this.summary.set(`Đã nhập ${result.imported} hình · Bỏ qua ${result.skipped} hình đã có · ${result.failed} hình chưa thành công.`);
        this.importing.set(false);
        this.preview.set(null);
        this.imported.emit();
      },
      error: error => { this.importing.set(false); this.error.set(this.errorMessage(error, 'Không import được clipart. Các hình đã chọn vẫn được giữ để thử lại.')); },
    });
  }

  private errorMessage(error: any, fallback: string): string {
    const message = error?.error?.message;
    return typeof message === 'string' ? message : Array.isArray(message) ? message.join(' · ') : fallback;
  }

  ngOnDestroy(): void { this.searchSubscription?.unsubscribe(); this.importSubscription?.unsubscribe(); }
}
