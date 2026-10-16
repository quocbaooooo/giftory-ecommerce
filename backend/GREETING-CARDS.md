# Thiệp chúc mừng

Ở checkout, khách có thể bật “Thêm thiệp chúc mừng”, chọn một trong ba mẫu
phong cách Thanh lịch, Lãng mạn, Tự nhiên và nhập tiêu đề, lời chúc. Có bản xem trước trực tiếp.
Phong cách chỉ quyết định màu sắc và họa tiết; đổi phong cách không thay đổi nội dung đã nhập.
Thiệp là tùy chọn cho cả khách đăng nhập và khách vãng lai; không thêm phụ phí.

`GET /api/orders/greeting-card-templates` trả danh mục mẫu. Khi tạo đơn, gửi
`greetingCard: { templateId, heading, message }`, hoặc bỏ trường này nếu không cần thiệp.
Máy chủ kiểm tra mẫu, tiêu đề không trống và tối đa 80 ký tự, lời chúc không trống, tối đa 300 ký tự và 6 dòng.
Tên phong cách được lấy từ danh mục phía máy chủ, tiêu đề do khách nhập. Nội dung được hiển thị
dạng văn bản, giữ xuống dòng, tách riêng khỏi ghi chú giao hàng.

Đơn hàng lưu snapshot `greetingCard` gồm mã mẫu, tên mẫu, tiêu đề và lời chúc.
Đơn cũ không có trường này vẫn hoạt động. Khách xem lại thiệp trong chi tiết đơn.
Các mã mẫu cũ được giữ nguyên để không đổi màu sắc hoặc nội dung của đơn đã đặt.
Ứng dụng cũ không gửi tiêu đề sẽ nhận tiêu đề mặc định “Gửi bạn thật nhiều yêu thương”.

Trong chi tiết đơn quản trị, xưởng chọn “Mở bản in thiệp” để mở trang
`/admin/orders/:code/greeting-card` (chỉ quản trị viên được truy cập).
Nút “In thiệp” mở hộp thoại in trình duyệt. Khổ A6 ngang 148 × 105 mm,
tỷ lệ 100%, tắt đầu/chân trang trình duyệt; mã đơn chỉ dùng để đối chiếu trên màn hình.
Nhân viên in và đặt thiệp vào hộp trước khi xác nhận đóng gói.
Nhật ký đóng gói ghi rõ mẫu thiệp nếu đơn có yêu cầu.

Kiểm tra: frontend `node test/checkout-recipients.cjs`; backend build rồi chạy
`node test/recipients.integration.cjs` với MongoDB tạm riêng biệt.
