# Giftory

Nền tảng thương mại điện tử quà tặng và cá nhân hóa sản phẩm. Dự án gồm cửa hàng Angular, cổng quản trị và REST API NestJS sử dụng MongoDB.

## Tính năng

- **Mua sắm:** danh mục, tìm kiếm và lọc sản phẩm, biến thể, flash sale, giỏ hàng, hộp quà và voucher.
- **Custom Studio:** thiết kế trên canvas 2D với Konva, thêm chữ và clipart, chọn font hỗ trợ tiếng Việt, lưu và mở lại bản thiết kế.
- **Đặt hàng:** địa chỉ nhận hàng, thiệp chúc mừng, đặt cọc cho sản phẩm cá nhân hóa, theo dõi đơn hàng và tiến độ chế tác.
- **Gửi quà trực tiếp:** tách thông tin người mua và người nhận, quà ẩn danh, trang người nhận qua liên kết có token, phiếu quà và thiệp in cho quản trị viên.
- **Tài khoản:** đăng ký, đăng nhập, làm mới phiên, khôi phục mật khẩu, hồ sơ và sổ địa chỉ.
- **Khách hàng thân thiết:** điểm thưởng, đổi voucher, danh sách yêu thích và thiết kế đã lưu.
- **Chăm sóc khách hàng:** đánh giá sản phẩm, yêu cầu hỗ trợ, đổi trả và hoàn tiền theo quy tắc nghiệp vụ.
- **Quản trị:** dashboard, sản phẩm, danh mục, đơn hàng, người dùng, marketing và chăm sóc khách hàng.
- **Trợ lý tư vấn:** xử lý theo quy tắc nội bộ; có thể sử dụng Gemini khi cấu hình API key.

Thanh toán QR hiện là **mô phỏng phục vụ phát triển/demo**, chưa tích hợp ngân hàng thực. Thông báo trong luồng gửi quà trực tiếp cũng được lưu ở trạng thái mô phỏng. Email khôi phục mật khẩu, SMS OTP và hoàn tiền cần adapter riêng để hoạt động.

## Công nghệ

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | Angular 21, TypeScript, Tailwind CSS 3, RxJS, Angular Signals |
| Thiết kế sản phẩm | Konva 10, font và clipart trong `frontend/public/` |
| Backend | NestJS 11, Mongoose 8, MongoDB |
| Xác thực | JWT access/refresh token, Passport, bcryptjs, phân quyền ADMIN/CUSTOMER |
| Media | Cloudinary |
| Tài liệu API | Swagger tại `/api/docs` |

## Cấu trúc dự án

```text
Giftory_1/
├── backend/
│   ├── src/
│   │   ├── common/          # Guard, decorator, enum, filter và tiện ích
│   │   ├── database/        # Schema, seed và migration
│   │   ├── modules/         # Các module nghiệp vụ
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── test/               # Kiểm tra logic và tích hợp
│   └── package.json
├── frontend/
│   ├── public/             # Logo, ảnh, font, clipart và hình hộp quà
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/       # Model, service, guard và interceptor
│   │   │   ├── features/   # Màn hình cửa hàng và quản trị
│   │   │   └── shared/     # Component và tiện ích dùng chung
│   │   └── environments/   # API URL cho development/production
│   ├── test/               # Kiểm tra logic frontend
│   └── package.json
├── docs/                   # Tài liệu tính năng
├── scripts/                # Công cụ hỗ trợ, tải font
├── .env.example            # Cấu hình môi trường mẫu
├── PERFORMANCE.md          # Cache danh mục và kiểm tra hiệu năng
├── bp*.md                  # Tài liệu phân tích nghiệp vụ
├── vercel.json             # Cấu hình triển khai frontend từ thư mục gốc
└── README.md
```

## Chạy trên máy local

### 1. Chuẩn bị

- Node.js **22.12 trở lên thuộc nhánh 22**, hoặc Node.js 24 trở lên, cùng npm.
- MongoDB đang chạy hoặc một database MongoDB Atlas.
- Các luồng sử dụng transaction, đặc biệt chăm sóc khách hàng/hoàn tiền, cần MongoDB **replica set** hoặc Atlas.

Frontend và backend có `package.json` và lockfile riêng. Chạy lệnh npm trong đúng thư mục tương ứng.

### 2. Cấu hình backend

Từ thư mục gốc, sao chép file mẫu bằng PowerShell:

```powershell
Copy-Item .env.example backend/.env
```

Nếu đã có `backend/.env`, cập nhật file hiện có. Backend đọc `backend/.env`, sau đó `.env` ở thư mục gốc khi chạy từ `backend/`.

Các biến chính:

| Biến | Mục đích |
| --- | --- |
| `NODE_ENV` | `development` khi chạy local; `production` khi triển khai |
| `PORT` | Cổng backend, mặc định `3000` |
| `MONGODB_URI` | Chuỗi kết nối database |
| `FRONTEND_URL` | Địa chỉ cửa hàng, dùng cả cho liên kết khôi phục mật khẩu và QR người nhận |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | Khóa ký token; thay giá trị mẫu bằng khóa riêng |
| `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` | Thời hạn token, mẫu là `15m` và `7d` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Tài khoản lưu trữ media |
| `AUTH_EMAIL_URL`, `AUTH_EMAIL_TOKEN` | Adapter HTTPS gửi email khôi phục mật khẩu |
| `ORDER_OTP_SMS_URL`, `ORDER_OTP_SMS_TOKEN`, `ORDER_OTP_HASH_SECRET` | Gửi và xác minh OTP cho khách đặt COD không đăng nhập |
| `REFUND_GATEWAY_URL`, `REFUND_GATEWAY_TOKEN` | Adapter hoàn tiền |
| `REVIEW_REWARD_POINTS` | Điểm thưởng sau khi đánh giá được duyệt; mặc định `0` |
| `SUPPORT_ZALO_URL` | Liên kết Zalo hỗ trợ |
| `ENABLE_PAYMENT_SIMULATION` | Đặt `false` để tắt thanh toán mô phỏng |
| `GEMINI_API_KEY` | Tùy chọn, bổ sung vào `.env` để bật phân tích bằng Gemini |

Ví dụ kết nối local:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/giftory
```

Nếu MongoDB đã khởi tạo replica set tên `rs0`:

```ini
MONGODB_URI=mongodb://127.0.0.1:27017/giftory?replicaSet=rs0
```

Không commit file `.env` hoặc thông tin xác thực thật.

### 3. Khởi động backend

```powershell
cd backend
npm ci
npm run start:dev
```

- API: [http://localhost:3000/api](http://localhost:3000/api)
- Swagger: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### 4. Nạp dữ liệu mẫu khi cần

**Chỉ dùng trên database demo:** `npm run seed` xóa dữ liệu hiện có trong các collection người dùng, danh mục, sản phẩm, voucher, đơn hàng và giao dịch điểm thưởng trước khi tạo dữ liệu mẫu.

Trong thư mục `backend/`, kiểm tra `MONGODB_URI` rồi chạy:

```powershell
npm run seed
```

Tài khoản sau khi seed:

| Vai trò | Email | Mật khẩu demo |
| --- | --- | --- |
| Quản trị viên | `admin@giftory.vn` | `Admin@Giftory2026` |
| Khách hàng | `customer@giftory.vn` | `Giftory@2026` |

### 5. Khởi động frontend

Mở terminal thứ hai từ thư mục gốc:

```powershell
cd frontend
npm ci
npm start
```

Truy cập [http://localhost:4200](http://localhost:4200). API local được khai báo trong `frontend/src/environments/environment.ts` là `http://localhost:3000/api`.

## Các trang chính

| Nhóm | Đường dẫn |
| --- | --- |
| Cửa hàng | `/`, `/products`, `/products/:slug`, `/flash-sale` |
| Thiết kế | `/custom-studio`, `/custom-studio/:id`, `/saved-designs` |
| Đặt hàng | `/cart`, `/checkout`, `/payment-result/:code` |
| Theo dõi đơn | `/orders`, `/orders/:code` |
| Người nhận quà | `/gift/:code#token` |
| Tài khoản | `/login`, `/register`, `/forgot-password`, `/reset-password`, `/profile` |
| Quyền lợi và hỗ trợ | `/loyalty`, `/wishlist`, `/care`, `/shopping-guide` |
| Quản trị | `/admin/dashboard`, `/admin/products`, `/admin/categories`, `/admin/orders`, `/admin/users`, `/admin/marketing`, `/admin/care` |
| In phiếu/thiệp | `/admin/orders/:code/gift-slip`, `/admin/orders/:code/greeting-card` |

Các trang quản trị yêu cầu tài khoản ADMIN. API kiểm tra quyền riêng cho các thao tác được bảo vệ.

## Thanh toán và gửi quà

- Sản phẩm cá nhân hóa áp dụng quy tắc cọc 50% trước khi chế tác. Trạng thái đơn hàng, thanh toán và tiến độ xưởng được quản lý riêng.
- Gửi quà trực tiếp yêu cầu thiệp chúc mừng và trả trước toàn bộ; không hỗ trợ COD. Thông tin người mua và giá tiền được loại khỏi dữ liệu dành cho người nhận.
- Khi chạy development, màn hình QR có thể tự xác nhận thanh toán mô phỏng sau 4 giây. Backend từ chối mô phỏng khi `NODE_ENV=production`; frontend production không bật bộ hẹn giờ.
- Đặt COD không đăng nhập cần adapter SMS hoạt động. Khi chưa cấu hình hoặc gửi OTP thất bại, hệ thống từ chối luồng này.

## Build và kiểm tra

Các lệnh dưới đây chạy trong thư mục được ghi chú.

### Frontend

```powershell
cd frontend
npm run build
npm run test:auth
npm run test:catalog
npm run test:cart
npm run test:studio
npm run test:cliparts
```

Build production tạo đầu ra tại `frontend/dist/frontend/browser/`. Các kiểm tra logic bổ sung nằm trong `frontend/test/`, ví dụ:

```powershell
node test/checkout-direct-gift.cjs
node test/checkout-recipients.cjs
node test/payment-demo.cjs
```

### Backend

```powershell
cd backend
npm run build
npm run test:care
npm run test:products
npm run test:vouchers
npm run test:cliparts
```

Các script `test:*` trên tự build trước khi chạy. Với kiểm tra gọi trực tiếp, build backend trước:

```powershell
node test/payment-demo.cjs
node test/direct-gift.integration.cjs
```

Các bộ tích hợp như care, products, vouchers và direct gift khởi chạy MongoDB riêng. Nếu `mongod` không ở đường dẫn Windows mặc định trong test runner, đặt `MONGOD_BINARY` đến file thực thi phù hợp trước khi chạy.

### Migration

Trong `backend/` có hai script cập nhật dữ liệu:

```powershell
npm run migrate:bp04
npm run migrate:care
```

Đọc mã migration trong `backend/src/database/`, kiểm tra database đích và sao lưu dữ liệu trước khi áp dụng.

## Triển khai

- Frontend có cấu hình Vercel ở thư mục gốc và trong `frontend/`, tương ứng với thư mục gốc được chọn khi triển khai. Các route SPA được rewrite về `index.html`.
- API production được khai báo trong `frontend/src/environments/environment.prod.ts`. Cập nhật giá trị này trước khi build nếu dùng backend khác.
- Backend chạy `npm run build`, sau đó `npm run start:prod`; cần cấu hình database, JWT, `FRONTEND_URL` và các dịch vụ tích hợp trên môi trường triển khai.
- Đặt `NODE_ENV=production` và sử dụng thông tin xác thực riêng cho môi trường đó.

Backend development/debug dùng `dist-dev/`, tách khỏi `dist/` của build production và kiểm thử để tránh xóa mất module của tiến trình đang chạy khi build đồng thời.

`dist/`, `dist-dev/`, `.angular/` và `*.tsbuildinfo` là đầu ra/cache có thể tạo lại và đã được Git bỏ qua.

## Tài liệu liên quan

- [Xác thực và khôi phục tài khoản](backend/AUTH.md)
- [Thanh toán mô phỏng](backend/PAYMENT-DEMO.md)
- [Voucher](backend/VOUCHERS.md)
- [Thiệp chúc mừng](backend/GREETING-CARDS.md)
- [Địa chỉ và người nhận](backend/src/modules/recipients/README.md)
- [Gửi quà trực tiếp](docs/direct-gifts.md)
- [Cache danh mục và hiệu năng](PERFORMANCE.md)
- [Font trong Custom Studio](frontend/public/fonts/studio/README.md)
- [Font thiệp chúc mừng](frontend/public/fonts/greeting-card/README.md)
