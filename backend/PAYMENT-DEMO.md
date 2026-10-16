# Thanh toán mô phỏng cho đồ án

Chạy frontend bằng `npm start` và backend bằng `npm run start:dev`.
Ở môi trường phát triển, màn hình QR hiển thị nhãn mô phỏng và tự gửi yêu cầu
xác nhận sau 4 giây. Mã QR chứa mã minh họa, không phải lệnh chuyển khoản.
Backend ghi nhận thanh toán 100% hoặc cọc 50% theo giá trị trên đơn,
sau đó frontend chuyển tới `/payment-result/:code` và đọc lại kết quả từ backend.

`POST /api/orders/:orderCode/demo-payment` yêu cầu tài khoản sở hữu đơn hoặc
số điện thoại khớp đơn hàng. Gọi lại không ghi nhận trùng hoặc thêm sự kiện trùng.
Đơn COD không cần cọc không sử dụng luồng này. Endpoint mô phỏng cũ `/pay` đã bỏ.

Đặt `ENABLE_PAYMENT_SIMULATION=false` để tắt mô phỏng. Backend luôn từ chối
mô phỏng khi `NODE_ENV=production`; bản frontend production không kích hoạt bộ hẹn giờ.
Chưa tích hợp ngân hàng thực.

Để trình bày nhánh lỗi, mở màn hình QR và tắt mạng trình duyệt trước khi hết
4 giây. Khi hiện “Thanh toán chưa thành công”, bật mạng và bấm “Thử thanh toán lại”.
Luồng thử lại dùng cùng đơn hàng, không tạo đơn mới.

Kiểm tra logic backend: `npm run build` rồi `node test/payment-demo.cjs`.
