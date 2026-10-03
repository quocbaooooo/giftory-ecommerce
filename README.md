# GIFTORY — NỀN TẢNG THƯƠNG MẠI ĐIỆN TỬ QUÀ TẶNG & XƯỞNG MAY TÙY BIẾN BESPOKE

> **Dự án khởi tạo Full-Stack dựa trên thiết kế Stitch Project `6741314524921336108` & Tài liệu Phân tích Nghiệp vụ (BA / System Architecture).**

---

## 1. GIỚI THIỆU DỰ ÁN & NGUYÊN TẮC THIẾT KẾ

**Giftory** là nền tảng thương mại điện tử chuyên sâu về quà tặng cao cấp và chế tác cá nhân hóa (Bespoke Studio). Dự án kết hợp:
- **UI/UX 1:1 theo Stitch**: Khung màu tím hoàng gia (`#7C3AED`), nền canvas (`#E9DCF8`), viền tinh xảo (`#DDD6FE`), typography `Plus Jakarta Sans` & `Playfair Display`, các hiệu ứng hoạt ảnh lượn sóng (`wave-item-1..4`), thanh điều hướng 8-icon rail và các thẻ Bento KPI.
- **Nghiệp vụ cốt lõi (Business Analysis)**:
  - **Quy tắc cọc 50% (BR-PAY05)**: Các món quà cá nhân hóa (khắc tên laser, may thêu theo yêu cầu) bắt buộc đặt cọc 50% để xưởng bắt đầu sản xuất. 50% còn lại thanh toán khi nghiệm thu hoặc COD.
  - **Tách biệt trạng thái đơn hàng & tiến độ xưởng**: `orderStatus` (`PENDING` → `CONFIRMED` → `PROCESSING` → `SHIPPING` → `DELIVERED`) song song với `fulfillmentStatus` (`AWAITING_DEPOSIT` → `AT_WORKSHOP` → `QUALITY_INSPECTION` → `PACKAGED` → `SHIPPED` → `DELIVERED`).
  - **Giftory Rewards Club**: Tích lũy 1 điểm cho mỗi 10.000đ, hỗ trợ nhập mã cào nhận điểm tức thì và quy đổi điểm lấy voucher thanh toán.

---

## 2. KIẾN TRÚC CÔNG NGHỆ (TECH STACK)

### Frontend (`/frontend`)
- **Framework**: Angular v21+ (Standalone Components, No NgModules)
- **Styling**: TailwindCSS v3 + Custom Design System Tokens + Google Material Symbols Outlined
- **State Management**: Angular Signals (`signal`, `computed`, `effect`) cho UI/Cart/Auth state kết hợp RxJS cho API streams
- **Architecture**: Feature-based architecture, Lazy-loaded routes, Functional Guards (`authGuard`, `adminGuard`), HTTP Interceptors (JWT token & Auto-bearer)

### Backend (`/backend`)
- **Framework**: NestJS v11 (Modular Monolith, Domain-Driven Design principles)
- **Database**: MongoDB + Mongoose v8
- **Authentication**: JWT Access Token (15m) + Rotating Refresh Token (7d) trong MongoDB + Passport JWT Strategy + Argon2 / Bcrypt password hashing
- **Authorization**: Role-Based Access Control (RBAC) với decorator `@Roles('ADMIN')` và `RolesGuard`
- **Validation**: `class-validator` + `class-transformer` với `ValidationPipe` toàn cục
- **API Documentation**: OpenAPI / Swagger tại `/api/docs`
- **File Storage**: Cloudinary SDK tích hợp sẵn

---

## 3. CẤU TRÚC THƯ MỤC DỰ ÁN

```text
giftory/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/
│   │   │   │   ├── guards/          # authGuard, adminGuard
│   │   │   │   ├── interceptors/    # authInterceptor (JWT inject)
│   │   │   │   ├── models/          # User, Product, Order, Cart, Voucher...
│   │   │   │   └── services/        # Api, Auth, Cart, Product, Studio, Order...
│   │   │   ├── shared/
│   │   │   │   └── components/      # SidebarRail, PillSearch, ProductCard, AiConcierge
│   │   │   ├── features/
│   │   │   │   ├── home/            # Trang chủ Discovery & Hero Marquee
│   │   │   │   ├── products/        # Danh mục quà & Chi tiết sản phẩm
│   │   │   │   ├── custom-studio/   # Custom Studio 2D/3D Bespoke
│   │   │   │   ├── cart/            # Giỏ hàng & tính cọc 50% BR-PAY05
│   │   │   │   ├── checkout/        # Thanh toán VietQR/MoMo/COD
│   │   │   │   ├── orders/          # Theo dõi đơn & timeline xưởng
│   │   │   │   ├── profile/         # Hồ sơ cá nhân & Thẻ VIP
│   │   │   │   ├── loyalty/         # Trung tâm điểm thưởng & đổi voucher
│   │   │   │   ├── wishlist/        # Quà đã thích & Bản thiết kế đã lưu
│   │   │   │   ├── flash-sale/      # Giờ vàng Flash Sale & Countdown
│   │   │   │   ├── shopping-guide/  # Cẩm nang quà & chính sách cọc
│   │   │   │   ├── auth/            # Đăng nhập & Đăng ký
│   │   │   │   └── admin/           # Dashboard KPI, Quản lý Quà, Đơn hàng, Users
│   │   │   ├── app.routes.ts
│   │   │   ├── app.component.ts
│   │   │   └── app.component.html
│   │   └── styles.css
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── common/                  # Enums, Decorators, Guards, Interceptors, Filters
│   │   ├── database/                # DatabaseModule, Schemas, Seed Script
│   │   ├── modules/
│   │   │   ├── auth/                # Register, Login, Refresh, RBAC
│   │   │   ├── products/            # Catalog, Search, Filter, CRUD
│   │   │   ├── categories/          # Category taxonomy
│   │   │   ├── custom-studio/       # Save & load bespoke designs
│   │   │   ├── cart/                # Server cart & deposit math
│   │   │   ├── orders/              # Order lifecycle & timelines
│   │   │   ├── loyalty/             # Rewards & Voucher exchange
│   │   │   ├── wishlist/            # Wishlist toggle & fetch
│   │   │   ├── admin/               # KPI analytics & operations
│   │   │   └── cloudinary/          # Image upload service
│   │   ├── app.module.ts
│   │   └── main.ts
│   └── package.json
│
├── .env.example
└── README.md
```

---

## 4. HƯỚNG DẪN KHỞI CHẠY (QUICK START)

### Bước 1: Khởi động MongoDB
Đảm bảo dịch vụ MongoDB đang chạy cục bộ tại `mongodb://127.0.0.1:27017` hoặc cập nhật chuỗi kết nối trong file `.env`.

### Bước 2: Cài đặt & Khởi động Backend
```bash
cd backend
npm install
npm run seed       # Nạp dữ liệu mẫu ban đầu (Admin, Khách hàng, Quà, Voucher, Đơn hàng)
npm run start:dev  # Khởi chạy máy chủ NestJS tại http://localhost:3000
```
- **Tài liệu Swagger API**: Truy cập [http://localhost:3000/api/docs](http://localhost:3000/api/docs) để xem và test toàn bộ RESTful API.

### Bước 3: Cài đặt & Khởi động Frontend
```bash
cd frontend
npm install
npm start          # Khởi chạy giao diện Angular tại http://localhost:4200
```

---

## 5. TÀI KHOẢN MẪU DÙNG THỬ (DEMO CREDENTIALS)

Hệ thống đã có sẵn 2 nút click tự động điền nhanh tài khoản tại trang `/login`:

| Phân quyền | Email | Mật khẩu | Quyền truy cập |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@giftory.vn` | `Admin@Giftory2026` | Toàn quyền truy cập Cửa hàng + Cổng Quản trị `/admin/*` |
| **Khách hàng (CUSTOMER)** | `customer@giftory.vn` | `Giftory@2026` | Đặt hàng, Custom Studio, Tích điểm thưởng, Tra cứu đơn hàng |

---

## 6. DANH SÁCH MÀN HÌNH STITCH → ANGULAR ROUTES MAPPING

| Mã Màn Hình Stitch | Tên Màn Hình Trong Thiết Kế | Tuyến Đường (Angular Route) | Component Phụ Trách |
| :--- | :--- | :--- | :--- |
| `13324639943564177303` | Giftory — Khám phá & Gợi ý Quà Tặng | `/` | `HomeComponent` |
| `16216447990141696086` | Tất cả sản phẩm & Danh mục quà | `/products` | `ProductsComponent` |
| `14798604711311059530` | Chi tiết sản phẩm & Phân loại hàng | `/products/:slug` | `ProductDetailComponent` |
| `9469502967191240455` | Quà Custom Studio — Cá nhân hóa | `/custom-studio` | `CustomStudioComponent` |
| `5401600908711970906` | Flash Sale — Khung Giờ Vàng | `/flash-sale` | `FlashSaleComponent` |
| `17235541571408856037` | Giỏ Quà Tặng & Phân loại Cọc 50% | `/cart` | `CartComponent` |
| `8579998144247547463` | Thanh Toán & Đặt Cọc VietQR/MoMo | `/checkout` | `CheckoutComponent` |
| `355037913911605635` | Theo Dõi Đơn Hàng & Tiến Độ Xưởng | `/orders` hoặc `/orders/:code` | `OrdersComponent` |
| `8972624848182978481` | Hồ Sơ Cá Nhân & Thẻ Hội Viên VIP | `/profile` | `ProfileComponent` |
| `6413733887367827405` | Trung Tâm Điểm Thưởng & Đổi Voucher | `/loyalty` | `LoyaltyComponent` |
| `92436556303324641` | Món Quà Đã Lưu & Bản Thiết Kế | `/wishlist` & `/saved-designs`| `WishlistComponent` |
| `13609092178183298075`| Cẩm Nang Mua Hàng & Chính Sách Cọc | `/shopping-guide` | `ShoppingGuideComponent`|
| `15677325011445543384`| Đăng Nhập & Đăng Ký Hội Viên | `/login` & `/register` | `LoginComponent` / `RegisterComponent` |
| `3079406608969517755` | Dashboard Quản Trị Hệ Thống | `/admin/dashboard` | `AdminDashboardComponent` |
| Admin Modules | Quản Lý Sản Phẩm, Đơn Hàng, Users | `/admin/products`, `/admin/orders`, `/admin/users` | `AdminProductsComponent`, `AdminOrdersComponent`, `AdminUsersComponent` |

---

## 7. BIẾN MÔI TRƯỜNG CẦN THIẾT (`.env`)

```ini
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/giftory
JWT_ACCESS_SECRET=giftory_jwt_super_access_secret_2026_dev_key
JWT_REFRESH_SECRET=giftory_jwt_super_refresh_secret_2026_dev_key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=giftory-cloud
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz
FRONTEND_URL=http://localhost:4200
```
