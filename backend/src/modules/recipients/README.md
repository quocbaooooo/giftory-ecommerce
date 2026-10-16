# Danh bạ người nhận và địa chỉ

- `GET /api/locations/provinces`, `GET /api/locations/provinces/:code/wards`: danh mục công khai.
- `GET`, `POST /api/recipients`, `DELETE /api/recipients/:id`: yêu cầu đăng nhập; chỉ thao tác danh bạ tài khoản hiện tại.
- Tối đa 50 người nhận mỗi tài khoản. Các lần lưu trùng tên, số điện thoại và địa chỉ được gộp, kể cả yêu cầu đồng thời.
- Lưu danh bạ là thao tác riêng trên trang checkout. Không tự lưu khi đặt hàng. Chỉnh thông tin rồi lưu sẽ tạo người nhận mới; có thể xóa bản cũ.
- Đơn hàng lưu mã tỉnh/thành, mã phường/xã, tên tương ứng và số nhà/tên đường; địa chỉ đầy đủ được ghép ở máy chủ. Xóa danh bạ không làm thay đổi địa chỉ của đơn đã đặt.
- API đặt hàng vẫn tiếp nhận địa chỉ chuỗi từ ứng dụng cũ. Với địa chỉ có cấu trúc, máy chủ kiểm tra quan hệ tỉnh/thành và phường/xã.

`locations.data.ts` là snapshot danh mục hai cấp từ [Province Open API v2](https://provinces.open-api.vn/api/v2/redoc), tải ngày 16/10/2026: 34 tỉnh/thành, 3.321 phường/xã/đặc khu. Dùng snapshot để tránh phụ thuộc API ngoài khi checkout. Cập nhật snapshot khi danh mục hành chính thay đổi; tên địa chỉ do máy chủ suy ra từ mã, không tin tên do trình duyệt gửi lên.

Kiểm tra: `npm run build` và `node test/recipients.integration.cjs`. Bài kiểm tra dùng MongoDB độc lập trong thư mục tạm, không đọc hay ghi dữ liệu ứng dụng đang dùng. Có thể chỉ định `MONGOD_BINARY` nếu MongoDB không được cài tại đường dẫn mặc định của Windows.
