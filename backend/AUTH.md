# Đăng nhập và khôi phục tài khoản

Các trang `/login`, `/register`, `/forgot-password`, `/reset-password` sử dụng API thật. Đăng ký luôn tạo vai trò CUSTOMER. Email được chuẩn hóa; mật khẩu giữ nguyên ký tự, tối thiểu 8 ký tự và tối đa 72 byte UTF-8. Đăng nhập vẫn hỗ trợ mật khẩu cũ ngắn hơn 8 ký tự.

Access token có thời hạn ngắn; refresh token được lưu dạng SHA-256 và chỉ sử dụng một lần khi đổi phiên. Đăng xuất hoặc đặt lại mật khẩu thu hồi tất cả phiên của tài khoản. Client gộp các yêu cầu refresh đồng thời và không khôi phục phiên sau khi người dùng đã đăng xuất. Đường dẫn quay lại chỉ chấp nhận URL nội bộ và kiểm tra quyền admin.

## Gửi email đặt lại mật khẩu

Cấu hình `FRONTEND_URL` là địa chỉ website khách hàng, `AUTH_EMAIL_URL` là endpoint HTTPS của adapter email và `AUTH_EMAIL_TOKEN` là thông tin xác thực phía server. API gọi POST JSON `{ "to": "...", "subject": "...", "text": "..." }` với header `Authorization: Bearer <token>`; adapter trả mã 2xx khi nhận gửi thành công. Không có cấu hình thì API trả 503, không giả lập gửi thư.

Liên kết có dạng `/reset-password#token=...`, hết hạn sau 30 phút, chỉ dùng một lần. Database chỉ lưu hash token. Câu trả lời không tiết lộ email có tài khoản hay không. Mỗi tài khoản có khoảng nghỉ 60 giây; endpoint có giới hạn theo IP. Giới hạn hiện lưu trong bộ nhớ từng tiến trình; triển khai nhiều instance cần giới hạn dùng chung ở gateway hoặc Redis.

Không có email thực nào được gửi trong kiểm thử. Kiểm thử dùng adapter giả và MongoDB replica set riêng, không sử dụng dữ liệu ứng dụng.

## Kiểm tra

- Backend: `npm run test:care` (27 kiểm tra tích hợp, bao gồm 7 nhóm kiểm tra auth).
- Frontend: `npm run test:auth` và `npm run build`.
