import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LoyaltyService } from '../../core/services/loyalty.service';
import { AuthService } from '../../core/services/auth.service';
import { Voucher } from '../../core/models';

@Component({
  selector: 'app-loyalty',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <!-- Loyalty Header & Points Banner (Stitch Screen 6413733887367827405) -->
      <div class="bg-gradient-to-r from-[#2A0845] via-[#6441A5] to-giftory-primary rounded-3xl p-8 text-white relative overflow-hidden shadow-xl">
        <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="space-y-2 max-w-xl">
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider backdrop-blur">
              <span class="material-symbols-outlined text-sm text-yellow-300">stars</span>
              Giftory Rewards Club
            </div>
            <h1 class="text-3xl md:text-4xl font-display font-black">Trung Tâm Đặc Quyền & Điểm Thưởng</h1>
            <p class="text-sm text-white/80">
              Tích lũy 1 điểm cho mỗi 10.000đ khi đặt quà hoặc tham gia các sự kiện đặc biệt. Đổi ngay voucher giảm giá trực tiếp và quà tặng phiên bản giới hạn!
            </p>
          </div>

          <!-- Points Display Card -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20 text-center min-w-[220px]">
            <span class="text-xs text-white/70 block uppercase font-bold tracking-wider">Số Dư Điểm Hiện Tại</span>
            <div class="text-4xl font-display font-black text-yellow-300 my-1">
              {{ currentPoints() | number }}
            </div>
            <span class="text-[11px] text-white/60">Tương đương {{ (currentPoints() * 1000) | number }} đ quy đổi voucher</span>
          </div>
        </div>
      </div>

      <!-- Quick Claim Code Card -->
      <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-2xl bg-giftory-amber/10 text-giftory-amber flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-2xl">confirmation_number</span>
          </div>
          <div>
            <h3 class="text-sm font-bold text-giftory-ink">Nhập Mã Tích Điểm Quà Tặng</h3>
            <p class="text-xs text-giftory-ink/60">Tìm mã cào dưới đáy hộp quà hoặc trên thiệp mừng cá nhân hóa để nhận thêm 50–200 điểm</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <input
            type="text"
            [(ngModel)]="claimCode"
            (keyup.enter)="handleClaimCode()"
            placeholder="Nhập mã bí mật (VD: GIFTORY2026)"
            class="px-4 py-2.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-sm font-mono uppercase"
          />
          <button
            (click)="handleClaimCode()"
            [disabled]="isClaiming()"
            class="px-5 py-2.5 bg-giftory-primary hover:bg-giftory-primary-dark text-white text-xs font-bold rounded-xl transition shadow flex items-center gap-2"
          >
            <span *ngIf="isClaiming()" class="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            Nhận Điểm
          </button>
        </div>
      </div>

      <!-- Redeemable Vouchers Grid -->
      <div class="space-y-6">
        <div class="flex items-center justify-between border-b border-giftory-border/60 pb-4">
          <div>
            <h2 class="text-xl font-display font-black text-giftory-ink">Kho Voucher Có Thể Đổi Bằng Điểm</h2>
            <p class="text-xs text-giftory-ink/60 mt-0.5">Dùng điểm thưởng để đổi lấy voucher giảm giá áp dụng ngay khi thanh toán</p>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            *ngFor="let voucher of vouchers()"
            class="bg-white rounded-3xl p-6 border border-giftory-border shadow-sm flex flex-col justify-between hover:shadow-md hover:border-giftory-primary/40 transition group"
          >
            <div class="space-y-4">
              <div class="flex items-center justify-between">
                <span class="px-3 py-1 bg-giftory-primary/10 text-giftory-primary font-mono text-xs font-black rounded-lg">
                  {{ voucher.code }}
                </span>
                <span class="text-xs font-bold text-giftory-amber flex items-center gap-1">
                  <span class="material-symbols-outlined text-sm">stars</span>
                  {{ voucher.pointsCost }} pts
                </span>
              </div>

              <div>
                <h4 class="text-base font-bold text-giftory-ink group-hover:text-giftory-primary transition">{{ voucher.title }}</h4>
                <p class="text-xs text-giftory-ink/60 mt-1">{{ voucher.description }}</p>
              </div>

              <div class="text-[11px] text-giftory-ink/50 space-y-0.5 pt-2 border-t border-giftory-border/40">
                <p>Đơn tối thiểu: <span class="font-bold text-giftory-ink">{{ voucher.minOrderValue | number }} đ</span></p>
                <p>Hạn dùng: <span class="font-bold text-giftory-ink">{{ voucher.validUntil | date:'dd/MM/yyyy' }}</span></p>
              </div>
            </div>

            <div class="pt-6">
              <button
                (click)="redeemVoucher(voucher)"
                [disabled]="currentPoints() < voucher.pointsCost"
                [ngClass]="currentPoints() >= voucher.pointsCost ? 'bg-giftory-primary hover:bg-giftory-primary-dark text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
                class="w-full py-2.5 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
              >
                <span class="material-symbols-outlined text-base">redeem</span>
                {{ currentPoints() >= voucher.pointsCost ? 'Đổi Voucher Ngay' : 'Chưa Đủ Điểm' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loyalty History Table -->
      <div class="bg-white rounded-3xl p-6 md:p-8 border border-giftory-border shadow-sm space-y-6">
        <h3 class="text-lg font-bold text-giftory-ink flex items-center gap-2">
          <span class="material-symbols-outlined text-giftory-primary">history</span>
          Lịch Sử Tích Lũy & Sử Dụng Điểm
        </h3>

        <div *ngIf="history().length > 0; else emptyHistory" class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-giftory-border text-giftory-ink/50 font-bold uppercase tracking-wider">
                <th class="py-3 px-4">Thời gian</th>
                <th class="py-3 px-4">Nội dung</th>
                <th class="py-3 px-4">Loại giao dịch</th>
                <th class="py-3 px-4 text-right">Biến động</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-giftory-border/40">
              <tr *ngFor="let item of history()" class="hover:bg-giftory-canvas/60 transition">
                <td class="py-3 px-4 text-giftory-ink/60 font-mono">{{ item.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
                <td class="py-3 px-4 font-medium text-giftory-ink">{{ item.description }}</td>
                <td class="py-3 px-4">
                  <span [ngClass]="item.type === 'EARN' ? 'text-giftory-emerald bg-giftory-emerald/10' : 'text-giftory-primary bg-giftory-primary/10'" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                    {{ item.type === 'EARN' ? 'Cộng điểm' : 'Đổi thưởng' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right font-mono font-bold" [ngClass]="item.type === 'EARN' ? 'text-giftory-emerald' : 'text-giftory-sale'">
                  {{ item.type === 'EARN' ? '+' : '-' }}{{ item.points }} pts
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <ng-template #emptyHistory>
          <div class="text-center py-8 text-giftory-ink/50 text-xs">
            Chưa có lịch sử giao dịch điểm nào. Hãy mua sắm hoặc nhập mã quà tặng để tích điểm ngay hôm nay!
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class LoyaltyComponent implements OnInit {
  private loyaltyService = inject(LoyaltyService);
  private authService = inject(AuthService);

  currentPoints = signal<number>(150);
  claimCode = '';
  isClaiming = signal<boolean>(false);
  vouchers = signal<Voucher[]>([]);
  history = signal<any[]>([]);

  ngOnInit() {
    const user = this.authService.currentUser();
    if (user) {
      this.currentPoints.set(user.loyaltyPoints || 150);
    }

    this.loadVouchers();
    this.loadHistory();
  }

  loadVouchers() {
    this.loyaltyService.getAvailableVouchers().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.vouchers.set(list);
      }
    });
  }

  loadHistory() {
    this.loyaltyService.getHistory().subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || []);
        this.history.set(list);
      }
    });
  }

  handleClaimCode() {
    if (!this.claimCode.trim()) return;
    this.isClaiming.set(true);

    this.loyaltyService.claimCode(this.claimCode.trim()).subscribe({
      next: (res) => {
        this.isClaiming.set(false);
        const earned = res.data?.pointsEarned || 100;
        this.currentPoints.update(p => p + earned);
        alert(`Chúc mừng! Bạn đã nhận được +${earned} điểm thưởng vào tài khoản Giftory.`);
        this.claimCode = '';
        this.loadHistory();
      },
      error: () => {
        this.isClaiming.set(false);
        alert('Mã tích điểm không hợp lệ hoặc đã qua sử dụng.');
      }
    });
  }

  redeemVoucher(voucher: Voucher) {
    if (this.currentPoints() < voucher.pointsCost) return;

    if (confirm(`Bạn có chắc muốn dùng ${voucher.pointsCost} điểm để đổi mã voucher "${voucher.code}"?`)) {
      this.loyaltyService.redeemVoucher(voucher.code).subscribe({
        next: () => {
          this.currentPoints.update(p => p - voucher.pointsCost);
          alert(`Đổi thành công mã "${voucher.code}"! Bạn có thể nhập mã này tại bước Checkout để được giảm giá.`);
          this.loadHistory();
        },
        error: (err) => {
          alert(err.error?.message || 'Có lỗi xảy ra khi đổi voucher.');
        }
      });
    }
  }
}
