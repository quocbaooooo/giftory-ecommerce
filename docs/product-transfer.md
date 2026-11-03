# Nhập và xuất sản phẩm

Trong **Quản lý sản phẩm**, nút **Nhập CSV / Excel** nằm cạnh **Thêm Mẫu Quà Mới**. Hai nút xuất nằm phía trên bảng sản phẩm.

- **Xuất đầy đủ CSV** hoặc **Xuất Excel (.xlsx)** lấy toàn bộ sản phẩm, bao gồm trạng thái `INACTIVE` và `DRAFT`, không phụ thuộc từ khóa tìm kiếm hay phân trang.
- Tệp có 30 cột: thông tin cơ bản, ID, slug, danh mục, ảnh, biến thể, thông số, giá, tồn kho, thẻ, đối tượng/dịp tặng, cấu hình Studio, đóng gói, điểm thưởng và các chỉ số đánh giá/bán hàng.
- Giữ tên cột khi chỉnh sửa. Các cột `images`, `variants`, `specs`, `tags`, `audience`, `occasions`, `customConfig` chứa JSON. Boolean dùng `true`/`false` hoặc `1`/`0`; giá và tồn kho dùng số thuần, không thêm dấu phân cách hàng nghìn.
- `audience` là người nhận, `occasions` là dịp tặng; hai trường này dùng chung cho bộ lọc cửa hàng và chatbot. `tags` chỉ chứa đặc điểm/từ khóa bổ sung, không cần lặp lại hai trường trên. Các danh sách được bỏ mục rỗng, khoảng trắng thừa và mục trùng khi lưu hoặc nhập. Tìm kiếm tự do và gợi ý tìm kiếm đọc cả ba trường. Sản phẩm chưa có phân loại cần bổ sung `audience`/`occasions` để khớp bộ lọc tương ứng; tên và mô tả không tự xác định phân loại.
- Nhập hỗ trợ `.csv` UTF-8 và `.xlsx`. Với Excel, dùng sheet `Products` hoặc sheet đầu tiên; thay công thức bằng giá trị trước khi nhập. Định dạng `.xls` cũ cần lưu lại thành `.xlsx`.
- Hệ thống ưu tiên tìm sản phẩm theo ID, rồi slug, rồi SKU. Sản phẩm đã có được cập nhật; sản phẩm chưa có được tạo mới. Nhập lại tệp xuất không tạo bản trùng. Khi tạo lại sản phẩm đã xóa, ID trong tệp được giữ nguyên nếu chưa được dùng.
- Danh mục phải tồn tại trước khi nhập. Hệ thống tìm theo `categoryId`, sau đó `categorySlug` nếu ID không tồn tại; không tự chọn danh mục khác.
- Toàn bộ dòng được kiểm tra trước khi ghi. Nếu có lỗi kiểm tra, không dòng nào được lưu và giao diện báo dòng lỗi. Nếu lỗi ghi phát sinh sau bước kiểm tra, giao diện báo chính xác số đã tạo/cập nhật và các dòng thất bại; có thể sửa rồi nhập lại.
- Mỗi lần nhập tối đa 5.000 sản phẩm, tệp tối đa 15 MB. Excel giới hạn 32.767 ký tự mỗi ô; dùng CSV cho dữ liệu dài như ảnh base64. Các URL ảnh trong tệp là tham chiếu, không phải bản sao file ảnh.

Tệp phục vụ khôi phục dữ liệu nghiệp vụ sản phẩm; không thay thế bản sao lưu toàn database hoặc lưu lại lịch sử thời gian tạo/cập nhật. Quyền xuất/nhập chỉ dành cho ADMIN.

Kiểm tra frontend bằng `npm run test:transfer` trong `frontend/`. Kiểm tra backend bằng `npm run test:products` trong `backend/` (khởi chạy MongoDB tạm riêng).
