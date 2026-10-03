import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-8 animate-fade-in">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-giftory-border/60 pb-6">
        <div>
          <span class="text-xs font-bold tracking-widest text-giftory-primary uppercase">Cộng Đồng Hội Viên</span>
          <h1 class="text-2xl md:text-3xl font-display font-black text-giftory-ink mt-1">Quản Trị Người Dùng & Điểm Thưởng</h1>
          <p class="text-xs text-giftory-ink/60 mt-1">Theo dõi danh sách khách hàng, điểm tích lũy Giftory Rewards và phân quyền tài khoản</p>
        </div>
      </div>

      <!-- Users Table -->
      <div class="bg-white rounded-3xl p-6 border border-giftory-border shadow-xs space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div class="text-xs font-bold text-giftory-ink">
            Tổng cộng: <span class="text-giftory-primary">{{ users().length }} tài khoản</span>
          </div>

          <div class="relative max-w-xs w-full">
            <span class="material-symbols-outlined absolute left-3 top-2 text-giftory-ink/40 text-lg">search</span>
            <input
              type="text"
              [(ngModel)]="searchQuery"
              placeholder="Tìm theo tên hoặc email..."
              class="w-full pl-9 pr-4 py-1.5 bg-giftory-canvas rounded-xl border border-giftory-border focus:outline-none focus:border-giftory-primary text-xs"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead>
              <tr class="border-b border-giftory-border text-giftory-ink/50 font-bold uppercase tracking-wider">
                <th class="py-3 px-4">Họ và Tên</th>
                <th class="py-3 px-4">Email & Số Điện Thoại</th>
                <th class="py-3 px-4">Vai Trò (Role)</th>
                <th class="py-3 px-4">Điểm Thưởng</th>
                <th class="py-3 px-4">Trạng Thái</th>
                <th class="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-giftory-border/40">
              <tr *ngFor="let u of filteredUsers()" class="hover:bg-giftory-canvas/60 transition">
                <td class="py-3 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-xl bg-giftory-primary/10 text-giftory-primary flex items-center justify-center font-bold">
                      {{ (u.fullName || u.name || 'U').charAt(0) }}
                    </div>
                    <div>
                      <span class="font-bold text-giftory-ink block">{{ u.fullName || u.name }}</span>
                      <span class="text-[10px] text-giftory-ink/40">Tham gia: {{ u.createdAt | date:'dd/MM/yyyy' }}</span>
                    </div>
                  </div>
                </td>
                <td class="py-3 px-4">
                  <span class="font-mono text-giftory-ink block">{{ u.email }}</span>
                  <span class="text-[10px] text-giftory-ink/60 font-mono">{{ u.phone || 'Chưa cập nhật SĐT' }}</span>
                </td>
                <td class="py-3 px-4">
                  <span [ngClass]="u.role === 'ADMIN' ? 'bg-purple-100 text-giftory-primary font-bold' : 'bg-gray-100 text-gray-700'" class="px-2.5 py-0.5 rounded-full text-[10px] font-mono">
                    {{ u.role }}
                  </span>
                </td>
                <td class="py-3 px-4 font-mono font-bold text-giftory-amber">
                  {{ u.loyaltyPoints || 0 }} pts
                </td>
                <td class="py-3 px-4">
                  <span [ngClass]="u.isActive ? 'bg-giftory-emerald/10 text-giftory-emerald' : 'bg-giftory-sale/10 text-giftory-sale'" class="px-2 py-0.5 rounded-full text-[10px] font-bold">
                    {{ u.isActive ? 'HOẠT ĐỘNG' : 'KHÓA' }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right">
                  <button (click)="toggleActive(u)" class="text-xs font-bold" [ngClass]="u.isActive ? 'text-giftory-sale hover:underline' : 'text-giftory-emerald hover:underline'">
                    {{ u.isActive ? 'Khóa' : 'Kích hoạt' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminUsersComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<User[]>([]);
  searchQuery = '';

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.adminService.getAdminUsers({ limit: 100 }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : (res?.data || res?.items || []);
        this.users.set(list);
      }
    });
  }

  filteredUsers(): User[] {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.users();
    return this.users().filter(u =>
      (u.fullName || u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }

  toggleActive(user: User) {
    user.isActive = !user.isActive;
    alert(`Đã cập nhật trạng thái tài khoản ${user.email} thành ${user.isActive ? 'Hoạt động' : 'Tạm khóa'}.`);
  }
}
