**3.5.1. BP-01 – Khám phá, tư vấn và lựa chọn sản phẩm**

**3.5.1.1. Process Description and Business Purpose**

| **Thuộc tính** | **Nội dung** |
| --- | --- |
| **Business Purpose** | Hỗ trợ Khách hàng (Customer) nhanh chóng xác định và lựa chọn sản phẩm (Product) phù hợp với nhu cầu quà tặng thông qua hai phương thức: Tìm kiếm/Bộ lọc truyền thống hoặc Tư vấn thông minh qua Trợ lý ảo (Giftory AI Chatbot Interface). |
| **Primary Actor** | Khách hàng (Customer) |
| **Supporting Actors** | Giftory System, Giftory AI Chatbot (Recommendation Service & Support Service), Nhân viên CSKH (Human Agent) |
| **Trigger** | Khách hàng phát sinh nhu cầu mua quà và truy cập vào nền tảng Giftory (sử dụng thanh tìm kiếm, bộ lọc danh mục hoặc mở widget AI Chatbot). |
| **Input** | Từ khóa tìm kiếm (Keyword), tiêu chí lọc (Dịp tặng, Đối tượng, Mức giá, Hình thức custom), hoặc câu thoại tự nhiên cung cấp cho Chatbot (Nhu cầu quà tặng hoặc Tra cứu hỗ trợ dịch vụ). |
| **Output** | Danh sách sản phẩm phù hợp đang mở bán; Khách hàng lựa chọn được sản phẩm mục tiêu (Product Selected) và điều hướng thành công đến trang Chi tiết sản phẩm (Product Detail); hoặc được giải đáp thắc mắc dịch vụ / kết nối Nhân viên CSKH thành công. |
| **Business Value** | Tối ưu hóa trải nghiệm khách hàng bằng giao diện hội thoại hợp nhất (All-in-one Chat Interface), rút ngắn thời gian tìm kiếm, hỗ trợ ra quyết định mua hàng chính xác, giải quyết nhanh các thắc mắc dịch vụ và gia tăng tỷ lệ chuyển đổi đơn hàng. |

Khách hàng có thể khám phá Product Catalog của Giftory thông qua hai phương thức chính:

1. **Search/Filter:** Phù hợp với khách hàng đã có định hướng tương đối rõ ràng về sản phẩm cần tìm. Khách hàng nhập từ khóa hoặc chọn các tiêu chí lọc (khoảng giá, đối tượng, dịp tặng, hình thức cá nhân hóa) để thu hẹp danh sách hiển thị.
2. **Giftory AI Chatbot Interface:** Phù hợp với khách hàng cần tương tác đối thoại tự nhiên để tìm kiếm ý tưởng quà tặng hoặc cần hỗ trợ thông tin nhanh trong quá trình mua sắm.

**Đặc tả Kiến trúc Giao diện Hội thoại Hợp nhất (Giftory AI Chatbot Interface)**

Hệ thống Chatbot AI của Giftory được thiết kế theo mô hình Giao diện hội thoại hợp nhất (Unified Conversational Interface) — chỉ sử dụng duy nhất một cửa sổ chat (Single Chat Widget) trên toàn bộ website nhưng tích hợp bên dưới hai năng lực nghiệp vụ (Capabilities) cốt lõi:

**1. Hai năng lực nghiệp vụ cốt lõi (Core Capabilities)**

- **AI Recommendation Service (Dịch vụ Tư vấn & Gợi ý Quà tặng):**

  - Tiếp nhận các thông tin nhu cầu từ khách hàng bao gồm: Người nhận (Recipient), Dịp tặng (Occasion), Ngân sách (Budget) và Sở thích/Đặc điểm (Preferences).
  - Phân tích ngữ nghĩa bằng NLP và đối chiếu với cơ sở dữ liệu Giftory Catalog để đề xuất các sản phẩm thực tế đang kinh doanh thỏa mãn tiêu chí.

- **Customer Support Service (Dịch vụ Hỗ trợ Khách hàng & Tra cứu):**

  - Giải đáp các câu hỏi thường gặp (FAQ) về chính sách giao hàng, thanh toán, đổi trả, quy trình gia công quà tặng cá nhân hóa.
  - Hỗ trợ tra cứu nhanh tình trạng đơn hàng bằng Mã đơn hàng hoặc Số điện thoại.
  - Tiếp nhận yêu cầu khiếu nại hoặc chuyển tiếp hồ sơ xử lý sang bộ phận Chăm sóc khách hàng (BP-06).

**2. Cơ chế nhận diện ý định thông minh (Intent Recognition & Routing)**

Hệ thống sử dụng Intent Classification Engine để tự động phân tích câu thoại của khách hàng theo thời gian thực và kích hoạt đúng dịch vụ xử lý:

- **Recommendation Intent:** Khi khách hàng thể hiện nhu cầu tìm kiếm, tham khảo quà tặng (ví dụ: *"Mình muốn tìm quà sinh nhật cho mẹ, thích nấu ăn, ngân sách dưới 500k"*), hệ thống tự động kích hoạt **AI Recommendation Service** để bóc tách thực thể và gợi ý sản phẩm.
- **Support Intent:** Khi khách hàng hỏi về trạng thái đơn hàng hoặc thông tin dịch vụ (ví dụ: *"Đơn hàng #1234 của mình đã giao chưa?"* hoặc *"Shop có nhận khắc tên lấy liền trong ngày không?"*), hệ thống tự động định tuyến sang **Customer Support Service** để truy xuất dữ liệu đơn hàng hoặc trả lời chính sách.

**3. Luồng hội thoại thống nhất và chuyển tiếp nhân viên mượt mà (Unified Flow & Seamless Human Handover)**

- **Một cửa sổ duy nhất (Single Window):** Khách hàng không cần phải chuyển đổi qua lại giữa các widget chat khác nhau. Chatbot duy trì một dòng thời gian hội thoại xuyên suốt (Unified Timeline).
- **Phản hồi theo ngữ cảnh:** Chatbot có thể chuyển đổi mượt mà giữa việc gợi ý sản phẩm và giải đáp đơn hàng trong cùng một phiên nói chuyện mà không làm mất dữ liệu đã trao đổi trước đó.
- **Seamless Human Handover:** Khi khách hàng yêu cầu gặp người thật hoặc khi phát sinh khiếu nại phức tạp mà AI không thể giải quyết, Chatbot tự động chuyển tiếp phiên chat sang **Nhân viên CSKH (Live Agent)** trực tiếp ngay trong cửa sổ chat hiện tại. Toàn bộ lịch sử trao đổi và các thực thể đã trích xuất được bàn giao đầy đủ cho nhân viên tiếp quản mà không làm gián đoạn trải nghiệm của khách hàng.

**3.5.1.2. User Stories**

**1. US-PD-01: Tìm kiếm sản phẩm bằng từ khóa (Keyword Search)**

| **Thuộc tính** | **Nội dung đặc tả** |
| --- | --- |
| **User Story ID** | **US-PD-01** |
| **Tên User Story** | **Tìm kiếm sản phẩm bằng từ khóa (Keyword Search)** |
| **Với vai trò là**<br>*(As a)* | Khách hàng (Customer) |
| **Tôi muốn**<br>*(I want)* | Tìm kiếm quà tặng bằng từ khóa (Keyword) trên thanh tìm kiếm của website. |
| **Để**<br>*(So that)* | Tôi có thể nhanh chóng tìm thấy các sản phẩm phù hợp với nhu cầu mà không cần duyệt qua toàn bộ danh mục sản phẩm. |
| **Luồng nghiệp vụ**<br>*(Business Flow)* | **1.** Khách hàng truy cập bất kỳ trang nào trên website và nhấp vào thanh tìm kiếm (Search Bar).<br>**2.** Khách hàng nhập từ khóa (tên sản phẩm, chất liệu, dịp tặng, v.v.).<br>**3.** Hệ thống hiển thị từ khóa/sản phẩm gợi ý trực tiếp (Live Auto-complete Dropdown) khi nhập từ 2 ký tự.<br>**4.** Khách hàng nhấn Enter hoặc nhấp vào nút Tìm kiếm.<br>**5.** Hệ thống hiển thị Trang kết quả tìm kiếm (Search Results Page) kèm tổng số kết quả và bộ lọc bổ sung. |
| **Tiêu chí chấp nhận**<br>*(Acceptance Criteria)* | **1.1. Gợi ý từ khóa và sản phẩm trực tiếp (Live Auto-complete Dropdown)**<br>Khi khách hàng nhập từ khóa từ 2 ký tự trở lên tại thanh tìm kiếm, hệ thống phải hiển thị Dropdown Live Auto-complete tối đa 5 sản phẩm khớp tên và 3 từ khóa phổ biến trong thời gian $\le$ 300ms.<br>**1.2. Tìm kiếm chính xác & Tìm kiếm không dấu** Hệ thống phải hỗ trợ tìm kiếm không dấu, chấp nhận tiếng Việt có dấu/không dấu và tự động loại bỏ các ký tự đặc biệt không hợp lệ, đồng thời trả về danh sách các sản phẩm khớp với tiêu đề, mô tả, tag hoặc thuộc tính custom.<br>**1.3. Xử lý khi không tìm thấy kết quả** Khi từ khóa không khớp với bất kỳ sản phẩm nào trong cơ sở dữ liệu, hệ thống phải thông báo không tìm thấy kết quả, đồng thời hiển thị 4 sản phẩm bán chạy (Best-sellers) kèm nút gợi ý kích hoạt AI Chatbot. |
| **Định nghĩa hoàn thành**<br>*(Definition of Done)* | • Thời gian phản hồi Dropdown Auto-complete $\le$ 300ms; thời gian tải trang kết quả $\le$ 1.0s.<br>• Kiểm tra và ngăn chặn các lỗ hổng bảo mật SQL Injection, XSS trên ô nhập từ khóa.<br>• Giao diện hiển thị chuẩn xác, không bị tràn viền trên Desktop và Mobile Web. |
| **Kịch bản biên & Xử lý ngoại lệ**<br>*(Edge Cases)* | • **Khách hàng nhập toàn khoảng trắng hoặc ký tự đặc biệt:** Hệ thống tự động lọc bỏ ký tự thừa, không kích hoạt truy vấn CSDL và hiển thị thông báo nhắc nhở nhập từ khóa hợp lệ.<br>• **Mạng gián đoạn trong khi gõ:** Hệ thống hủy request tìm kiếm trước đó (debounce 250ms) để tối ưu hiệu năng và tránh sai lệch kết quả hiển thị. |

**2. US-PD-02: Lọc sản phẩm đa tiêu chí (Product Filtering)**

| **Thuộc tính** | **Nội dung đặc tả** |
| --- | --- |
| **User Story ID** | **US-PD-02** |
| **Tên User Story** | **Lọc sản phẩm đa tiêu chí (Product Filtering)** |
| **Với vai trò là**<br>*(As a)* | Khách hàng (Customer) |
| **Tôi muốn**<br>*(I want)* | Lọc sản phẩm (Filter) theo các tiêu chí phù hợp như Dịp tặng, Đối tượng, Hình thức Custom, Khoảng giá và Đánh giá. |
| **Để**<br>*(So that)* | Tôi có thể thu hẹp danh sách và loại bỏ những sản phẩm không phù hợp với nhu cầu và ngân sách. |
| **Luồng nghiệp vụ**<br>*(Business Flow)* | **1.** Khách hàng truy cập Trang danh mục sản phẩm hoặc Trang kết quả tìm kiếm.<br>**2.** Khách hàng chọn một hoặc nhiều tiêu chí lọc tại Sidebar/Modal Filter (ví dụ: Giá từ 200k–500k, Dịp: Sinh nhật, Có khắc tên).<br>**3.** Hệ thống cập nhật danh sách sản phẩm thỏa mãn tất cả tiêu chí được chọn theo thời gian thực.<br>**4.** Khách hàng có thể xóa từng tiêu chí hoặc chọn "Xóa tất cả bộ lọc" để đặt lại trạng thái ban đầu. |
| **Tiêu chí chấp nhận**<br>*(Acceptance Criteria)* | **2.1. Áp dụng đa bộ lọc (Multi-facet Filtering)**<br>Khi khách hàng chọn đồng thời nhiều tiêu chí (ví dụ: Khoảng giá, Hình thức custom, Dịp tặng), hệ thống phải áp dụng logic AND giữa các nhóm bộ lọc và logic OR trong cùng một nhóm, đồng thời chỉ hiển thị các sản phẩm thỏa mãn tất cả tiêu chí kèm tổng số lượng kết quả phù hợp.<br>**2.2. Cập nhật thời gian thực không tải lại trang**<br>Khi khách hàng tích chọn hoặc bỏ chọn một tiêu chí lọc, hệ thống phải cập nhật lưới sản phẩm (Product Grid) theo thời gian thực ($\le$ 300ms) mà không tải lại toàn bộ trang web.<br>**2.3. Hủy bỏ và làm mới bộ lọc (Clear Filters)**<br>Khi khách hàng nhấn nút xóa từng tiêu chí riêng lẻ hoặc chọn "Xóa tất cả bộ lọc", hệ thống phải lập tức hủy bỏ các tiêu chí tương ứng và khôi phục danh sách sản phẩm về trạng thái đầy đủ ban đầu. |
| **Định nghĩa hoàn thành**<br>*(Definition of Done)* | • Đồng bộ URL Parameters (Query String) với trạng thái bộ lọc đang chọn để người dùng có thể lưu bookmark hoặc gửi link cho người khác.<br>• Phân trang (Pagination) tự động làm mới về Trang 1 mỗi khi thay đổi tiêu chí lọc. |
| **Kịch bản biên & Xử lý ngoại lệ**<br>*(Edge Cases)* | • **Không có sản phẩm nào thỏa mãn tổ hợp bộ lọc:** Hệ thống hiển thị thông báo *"Không có sản phẩm nào khớp với bộ lọc đã chọn"* kèm nút bấm *"Xóa tất cả bộ lọc"* để đưa người dùng trở lại danh mục đầy đủ. |

**3. US-PD-03: Tương tác hội thoại thống nhất và nhận diện ý định trên Giftory AI Chatbot**

| **Thuộc tính** | **Nội dung đặc tả** |
| --- | --- |
| **User Story ID** | **US-PD-03** |
| **Tên User Story** | **Tương tác hội thoại thống nhất và nhận diện ý định trên Giftory AI Chatbot** |
| **Với vai trò là**<br>*(As a)* | Khách hàng (Customer) |
| **Tôi muốn**<br>*(I want)* | Tương tác trong một cửa sổ chat duy nhất với Trợ lý AI để vừa nhận tư vấn quà tặng vừa có thể tra cứu đơn hàng hoặc yêu cầu hỗ trợ khi cần. |
| **Để**<br>*(So that)* | Trải nghiệm mua sắm và chăm sóc khách hàng của tôi diễn ra liền mạch, không phải chuyển đổi nhiều kênh liên hệ hoặc mở nhiều cửa sổ chat riêng biệt. |
| **Luồng nghiệp vụ**<br>*(Business Flow)* | **1.** Khách hàng mở cửa sổ Giftory AI Chatbot trên website.<br>**2.** Khách hàng gửi tin nhắn bằng ngôn ngữ tự nhiên (về nhu cầu tìm quà hoặc tra cứu đơn hàng).<br>**3.** Chatbot phân tích ý định (Intent Recognition):<br>• Nếu là ý định tìm quà $\to$ Kích hoạt AI Recommendation Service.<br>• Nếu là ý định tra cứu / hỗ trợ $\to$ Kích hoạt Customer Support Service.<br>**4.** Chatbot phản hồi đúng theo ngữ cảnh và hỗ trợ khách hàng thực hiện các bước tiếp theo.<br>**5.** Nếu vấn đề phức tạp hoặc khách yêu cầu gặp người thật, Chatbot tự động kết nối với Nhân viên CSKH ngay trong cửa sổ chat hiện tại. |
| **Tiêu chí chấp nhận**<br>*(Acceptance Criteria)* | **3.1. Nhận diện ý định hội thoại chính xác (Intent Recognition)**<br>Khi khách hàng gửi tin nhắn bằng ngôn ngữ tự nhiên, hệ thống phải phân tích và phân loại chính xác ý định trong thời gian $\le$ 1.0s:<br>• Nếu là nhu cầu tìm quà (ví dụ: *"Tìm quà sinh nhật cho mẹ dưới 500k"*), hệ thống phải kích hoạt AI Recommendation Service để trích xuất thực thể (Recipient, Occasion, Budget, Preferences).<br>• Nếu là tra cứu hoặc hỏi đáp dịch vụ (ví dụ: *"Đơn hàng #1234 đã giao chưa?"*), hệ thống phải kích hoạt Customer Support Service để truy vấn trạng thái đơn hàng hoặc giải đáp chính sách.<br>**3.2. Cửa sổ chat duy nhất và duy trì bối cảnh (Unified Window & Context Retention)**<br>Giao diện chat chỉ hiển thị duy nhất một cửa sổ hội thoại thống nhất; hệ thống phải duy trì bộ nhớ ngữ cảnh để khách hàng có thể chuyển đổi linh hoạt giữa việc hỏi tìm sản phẩm sang hỏi về đơn hàng/chính sách mà không làm gián đoạn phiên trò chuyện.<br>**3.3. Hỗ trợ tư vấn theo các bước qua Thẻ chọn nhanh (Quick Chips)**<br>Khi khách hàng chưa biết cách mô tả hoặc nhấn "Tư vấn nhanh", Chatbot phải hiển thị các gợi ý dạng Thẻ chọn (Chips: Đối tượng $\to$ Dịp tặng $\to$ Khoảng giá) giúp khách hàng hoàn tất khai báo nhu cầu trong tối đa 3 bước thao tác.<br>**3.4. Chuyển tiếp nhân viên hỗ trợ mượt mà (Seamless Human Handover)**<br>Khi khách hàng gõ yêu cầu gặp nhân viên (ví dụ: *"Cho mình gặp nhân viên tư vấn"*) hoặc khi gặp khiếu nại phức tạp, Chatbot phải thông báo kết nối và chuyển quyền điều phối cho Nhân viên CSKH (Live Agent) trực tiếp trong cửa sổ chat hiện tại kèm toàn bộ lịch sử trao đổi trước đó. |
| **Định nghĩa hoàn thành**<br>*(Definition of Done)* | • Độ chính xác phân loại ý định (Intent Classification Accuracy) đạt $\ge$ 90% đối với các mẫu câu tiếng Việt thông dụng.<br>• Thời gian phản hồi tin nhắn của AI $\le$ 1.5s.<br>• Lưu trữ toàn bộ lịch sử phiên chat vào phiên làm việc của người dùng để phục vụ bàn giao sang nhân viên. |
| **Kịch bản biên & Xử lý ngoại lệ**<br>*(Edge Cases)* | • **Ý định mơ hồ hoặc lẫn lộn cả hai nhu cầu:** Chatbot phản hồi xác nhận lại: *"Bạn đang muốn Giftory tư vấn quà tặng mới hay muốn kiểm tra đơn hàng đã đặt trước đó?"* kèm 2 nút bấm tương ứng.<br>• **Khách gõ từ ngữ nhạy cảm / chửi thề:** Kích hoạt Safety Guardrail, từ chối xử lý và nhắc nhở khách hàng sử dụng ngôn từ lịch sự.<br>• **Không có Nhân viên CSKH trực tuyến (ngoài giờ làm việc):** Chatbot tiếp nhận nội dung, ghi nhận Support Ticket (BP-06) và thông báo thời gian phản hồi dự kiến qua Email/SĐT cho khách hàng. |

**4. US-PD-04: AI Recommendation dựa trên Catalog thực tế (Strict DB Matching)**

| **Thuộc tính** | **Nội dung đặc tả** |
| --- | --- |
| **User Story ID** | **US-PD-04** |
| **Tên User Story** | **AI Recommendation dựa trên Catalog thực tế (Strict DB Matching)** |
| **Với vai trò là**<br>*(As a)* | Khách hàng (Customer) |
| **Tôi muốn**<br>*(I want)* | Nhận được gợi ý sản phẩm thực tế đang kinh doanh tại Giftory từ AI Recommendation. |
| **Để**<br>*(So that)* | Tôi có thể tin tưởng vào kết quả tư vấn và tiếp tục Shopping Journey ngay lập tức mà không gặp sản phẩm ảo. |
| **Luồng nghiệp vụ**<br>*(Business Flow)* | **1.** AI Chatbot phân tích xong thông tin nhu cầu của Khách hàng (từ US-PD-03).<br>**2.** AI tổng hợp cấu trúc truy vấn Structured Query JSON (gồm tag, khoảng giá, category).<br>**3.** Backend Recommendation Service nhận Query JSON, truy vấn vào Database Giftory để lọc sản phẩm thực tế đang Is_Sellable = True và Stock_Quantity > 0.<br>**4.** Backend trả danh sách sản phẩm thật (kèm ID, Tên, Giá, Ảnh, Khả năng Custom) về cho AI Chatbot.<br>**5.** AI Chatbot hiển thị danh sách sản phẩm dưới dạng Card Carousel trực tiếp trong khung chat. |
| **Tiêu chí chấp nhận**<br>*(Acceptance Criteria)* | **4.1. 100% Sản phẩm thật & Đang kinh doanh (Zero Hallucination)**<br>Khi AI đề xuất danh sách gợi ý sản phẩm trong cửa sổ chat, hệ thống phải đảm bảo 100% sản phẩm có Product_ID hợp lệ trong cơ sở dữ liệu, đang ở trạng thái mở bán (Is_Sellable = True), còn hàng khả dụng, cùng thông tin giá bán và hình ảnh khớp chính xác 100% với website.<br>**4.2. Hiển thị dạng Card Carousel tương tác trực tiếp**<br>Khi Backend trả về danh sách từ 3 đến 5 sản phẩm phù hợp nhất, hệ thống phải hiển thị dạng Card Carousel trực tiếp trong khung chat gồm: Hình ảnh sản phẩm, Tên sản phẩm, Giá cơ bản, Badge (Có custom / Khắc tên), Lời giải thích ngắn lý do phù hợp và 2 nút hành động: "Xem chi tiết" / "Tùy chỉnh ngay".<br>**4.3. Cơ chế Fallback khi không tìm thấy sản phẩm khớp 100%**<br>Khi nhu cầu của khách hàng quá hẹp dẫn đến không có sản phẩm nào thỏa mãn tất cả tiêu chí, Backend phải lọc các sản phẩm tiệm cận nhất và AI phải giải thích rõ lý do, gợi ý các lựa chọn thay thế thay vì báo lỗi hệ thống hoặc trả về kết quả rỗng. |
| **Định nghĩa hoàn thành**<br>*(Definition of Done)* | • Đảm bảo kiến trúc luồng dữ liệu chuẩn: Frontend $\to$ Backend $\to$ AI Provider (JSON) $\to$ Recommendation Service $\to$ DB $\to$ UI Card (Không gọi AI trực tiếp từ Frontend).<br>• Đã kiểm thử tự động (Integration Test) đảm bảo mọi ID sản phẩm từ AI response đều tồn tại trong DB.<br>• Thời gian render danh sách Card sản phẩm trong chat $\le$ 2.0s. |
| **Kịch bản biên & Xử lý ngoại lệ**<br>*(Edge Cases)* | • **Sản phẩm gợi ý vừa hết hàng trong khi khách đang chat:** Khi khách click vào Card sản phẩm, hệ thống hiển thị thông báo *"Sản phẩm vừa hết hàng"* và đưa ra sản phẩm thay thế tương đương.<br>• **Kết nối AI Provider bị Timeout hoặc lỗi 500:** Hệ thống tự động chuyển sang cơ chế Fallback sử dụng thuật toán Tag Matching truyền thống từ DB mà không làm đứt đoạn phiên chat. |

**5. US-PD-05: Truy cập Product Detail từ thẻ gợi ý của AI**

| **Thuộc tính** | **Nội dung đặc tả** |
| --- | --- |
| **User Story ID** | **US-PD-05** |
| **Tên User Story** | **Truy cập Product Detail từ thẻ gợi ý của AI** |
| **Với vai trò là**<br>*(As a)* | Khách hàng (Customer) |
| **Tôi muốn**<br>*(I want)* | Truy cập trang Chi tiết sản phẩm (Product Detail) từ kết quả gợi ý của AI Recommendation. |
| **Để**<br>*(So that)* | Tôi có thể đánh giá kỹ sản phẩm, xem hình ảnh/đánh giá thực tế trước khi quyết định mua hoặc thiết kế custom. |
| **Luồng nghiệp vụ**<br>*(Business Flow)* | **1.** Khách hàng xem danh sách Card sản phẩm do AI gợi ý trong cửa sổ Chat.<br>**2.** Khách hàng nhấn vào nút "Xem chi tiết" hoặc nhấp trực tiếp vào Ảnh/Tên sản phẩm trên Card.<br>**3.** Hệ thống chuyển hướng đến trang Product Detail của sản phẩm tương ứng (/products/\[slug]).<br>**4.** Khách hàng xem các thông tin chi tiết (mô tả, chất liệu, kích thước, hình ảnh thực tế, đánh giá từ khách hàng đã mua).<br>**5.** Khách hàng lựa chọn bước tiếp theo: "Thêm vào giỏ hàng" (Hàng có sẵn) hoặc "Bắt đầu tùy chỉnh" (Mở Design Studio). |
| **Tiêu chí chấp nhận**<br>*(Acceptance Criteria)* | **5.1. Điều hướng chính xác và duy trì bối cảnh Chat (Context Retention)**<br>Khi khách hàng bấm "Xem chi tiết" trên Card gợi ý của AI Chatbot, hệ thống phải điều hướng chính xác đến trang /products/\[slug], đồng thời tự động thu nhỏ (minimize) cửa sổ Chat Widget để khách hàng có thể mở lại xem lịch sử đoạn hội thoại bất cứ lúc nào.<br>**5.2. Hiển thị đầy đủ thông tin hỗ trợ quyết định mua hàng**<br>Khi khách hàng truy cập vào trang Product Detail, hệ thống phải hiển thị đầy đủ: Bộ sưu tập ảnh sản phẩm, Mô tả chi tiết, Thông số kỹ thuật (kích thước, chất liệu), Đánh giá thực tế, Thời gian gia công dự kiến và 2 nút hành động CTA chính: "Thêm vào giỏ hàng" & "Tùy chỉnh quà tặng ngay".<br>**5.3. Ghi nhận Tracking Analytics**<br>Khi khách hàng mở trang Product Detail thông qua click từ AI Recommendation Card, hệ thống phải tự động ghi nhận URL Parameter và Event Analytics (?ref=ai_recommendation&session_id=XYZ) phục vụ đo lường tỷ lệ chuyển đổi (Conversion Rate) của AI Assistant. |
| **Định nghĩa hoàn thành**<br>*(Definition of Done)* | • Thời gian tải trang Product Detail $\le$ 1.0s.<br>• Giữ nguyên bối cảnh lịch sử chat khi khách hàng quay lại từ trang chi tiết.<br>• Responsive 100% trên giao diện thiết bị di động (Mobile Web). |
| **Kịch bản biên & Xử lý ngoại lệ**<br>*(Edge Cases)* | • **Đường dẫn sản phẩm bị lỗi (404 Not Found):** Hệ thống chuyển hướng về trang 404 thân thiện kèm nút bấm *"Quay lại cuộc hội thoại AI"*, tuyệt đối không để crash giao diện.<br>• **Khách bấm mở nhiều sản phẩm liên tục từ Chat Carousel:** Hệ thống mở trang trong cùng 1 tab trình duyệt hoặc hỗ trợ Quick View Modal để tránh bị tràn tab trình duyệt của khách hàng. |

**3.5.1.3. Use case description**

| **Thuộc tính** | **Nội dung** |
| --- | --- |
| **UC Name** | **Khám phá, tư vấn và lựa chọn sản phẩm / Product Discovery, Recommendation and Selection** |
| **UC #** | **01** |
| **Primary Actor** | **Khách hàng** |
| **Use Case Story** | Use case này mô tả quá trình Khách hàng tìm kiếm, lọc danh mục hoặc tương tác với Giao diện Giftory AI Chatbot hợp nhất để nhận tư vấn quà tặng hoặc hỗ trợ dịch vụ. Hệ thống nhận diện ý định, xác thực dữ liệu Catalog, hiển thị sản phẩm khả dụng và điều hướng Khách hàng đến trang Chi tiết sản phẩm để tiếp tục hành trình mua sắm. |
| **Trigger** | Khách hàng truy cập vào thanh tìm kiếm, bộ lọc hoặc mở cửa sổ tương tác với Giftory AI Chatbot. |
| **Pre-Condition** | **1.** Nền tảng Giftory đang hoạt động bình thường trên môi trường Web.<br>**2.** Dữ liệu Product Catalog đã được cập nhật, sẵn sàng truy vấn.<br>**3.** Dịch vụ Giftory AI Chatbot (bao gồm Recommendation Service và Support Service) kết nối ổn định.<br>**4.** Các sản phẩm hiển thị đều được cấu hình cờ mở bán và số lượng tồn kho trong cơ sở dữ liệu. |
| **Post-Condition** | **1.** Danh sách sản phẩm phù hợp được hiển thị chính xác theo tiêu chí của Khách hàng.<br>**2.** Khách hàng lựa chọn được sản phẩm mục tiêu (Product Selected).<br>**3.** Hệ thống điều hướng thành công Khách hàng đến trang Product Detail tương ứng.<br>**4.** Ngữ cảnh hội thoại AI được lưu giữ xuyên suốt để hỗ trợ tra cứu hoặc chuyển tiếp nhân viên.<br>**5.** Dữ liệu tương tác và tracking chuyển đổi được ghi nhận trên hệ thống. |

**Primary Flow (PF)**

**Title: Khách hàng tìm kiếm/tư vấn và lựa chọn sản phẩm thành công**

| **Bước** | **Actor Action** | **System Response** |
| --- | --- | --- |
| 1 | Khách hàng truy cập vào nền tảng Giftory. | Giftory System hiển thị trang chủ kèm các công cụ Tìm kiếm (Search), Bộ lọc (Filter) và Widget Giftory AI Chatbot. |
| 2 | Khách hàng lựa chọn phương thức tìm kiếm bằng từ khóa, sử dụng bộ lọc danh mục hoặc gửi tin nhắn vào khung chat AI. | Hệ thống hiển thị giao diện tương ứng: thanh tìm kiếm, Sidebar bộ lọc hoặc mở cửa sổ chat hội thoại duy nhất. |
| 3 | Khách hàng nhập từ khóa/tiêu chí lọc hoặc nhập nhu cầu quà tặng bằng ngôn ngữ tự nhiên vào cửa sổ chat. | Hệ thống tiếp nhận:<br>• Với Search/Filter: Truy vấn trực tiếp CSDL.<br>• Với Chatbot: Intent Engine nhận diện nhu cầu tìm quà và kích hoạt AI Recommendation Service để phân tích thực thể và đối chiếu với Giftory Catalog. |
| 4 | Khách hàng xem danh sách sản phẩm hiển thị trên Lưới sản phẩm (Product Grid) hoặc Thẻ trượt (Card Carousel) trong khung chat. | Hệ thống hiển thị danh sách sản phẩm kèm tên, hình ảnh, mức giá và nhãn tùy biến (Customizable Badge).<br>*(Nếu Khách hàng muốn đổi tiêu chí* $\to$ *chuyển sang AF1; nếu Khách hàng chuyển sang hỏi đơn hàng* $\to$ *chuyển sang AF2).* |
| 5 | Khách hàng nhấn chọn một sản phẩm cụ thể để xem chi tiết. | Hệ thống ghi nhận trạng thái Product Selected và điều hướng Khách hàng đến trang Product Detail. |
| 6 | Khách hàng xem toàn bộ thông tin chi tiết sản phẩm. | Hệ thống hiển thị thông số kỹ thuật, ảnh thực tế, đánh giá và các tùy chọn mua hàng/tùy chỉnh cá nhân hóa, kết thúc thành công Use Case. |

**Alternate Flow 1 (AF1)**

**Title: Thay đổi tiêu chí tìm kiếm hoặc thông tin tư vấn**

| **Bước** | **Actor Action** | **System Response** |
| --- | --- | --- |
| 1 | Khách hàng điều chỉnh từ khóa, thay đổi bộ lọc (giá, dịp, đối tượng) hoặc gửi tin nhắn cập nhật cho Chatbot (ví dụ: *"Đổi ngân sách lên 1 triệu"*). | Giftory System / AI Engine ghi nhận các tiêu chí mới và cập nhật lại bộ nhớ ngữ cảnh. |
| 2 | — | Hệ thống thực hiện truy vấn lại cơ sở dữ liệu Catalog theo tiêu chí mới, làm mới danh sách kết quả hiển thị và quay lại Bước 4 của Primary Flow (PF). |

**Alternate Flow 2 (AF2)**

**Title: Khách hàng yêu cầu hỗ trợ đơn hàng / dịch vụ hoặc chuyển tiếp Nhân viên CSKH**

| **Bước** | **Actor Action** | **System Response** |
| --- | --- | --- |
| 1 | Trong cùng cửa sổ chat, Khách hàng gửi tin nhắn tra cứu đơn hàng (ví dụ: *"Đơn #1234 của mình sao rồi?"*) hoặc yêu cầu gặp người thật. | Intent Classification Engine nhận diện ý định là Support Intent và kích hoạt Customer Support Service. |
| 2 | — | Nếu là tra cứu thông tin đơn hàng / chính sách: Chatbot truy xuất CSDL đơn hàng và phản hồi kết quả trực tiếp trong khung chat.<br>Nếu là yêu cầu gặp nhân viên hoặc khiếu nại phức tạp: Chatbot kích hoạt luồng Seamless Human Handover, kết nối Nhân viên CSKH trực tuyến và chuyển toàn bộ ngữ cảnh hội thoại sang màn hình CSKH (liên kết sang BP-06). |
| 3 | Khách hàng tiếp tục trao đổi với Chatbot hoặc Nhân viên CSKH trực tiếp trong cửa sổ chat hiện tại. | Hệ thống ghi nhận Support Case (nếu phát sinh) mà không làm ngắt quãng trải nghiệm mua sắm của Khách hàng. |

**Lưu ý nghiệp vụ:** Trong BP-01, hệ thống kiểm tra trạng thái mở bán và tồn kho cơ bản để hiển thị danh mục. Các yếu tố có khả năng biến động như Giá bán tại thời điểm đặt hàng, Khuyến mãi áp dụng và Giữ chỗ tồn kho thực tế (Inventory Reservation) sẽ được hệ thống Revalidate toàn diện tại BP-03 trước khi khởi tạo đơn hàng.

**3.5.1.4. BPMN – Tiến trình Khám phá, tư vấn và lựa chọn sản phẩm (BP-01)**

**Hình 3.xx. BPMN – Tiến trình Khám phá, tư vấn và lựa chọn sản phẩm (BP-01)**

**1. Phân định các làn ranh trách nhiệm (Participants & Swimlanes)**

Sơ đồ BPMN của BP-01 được tổ chức thành 04 Làn ranh trách nhiệm (Swimlanes):

- **Làn 1 – Khách hàng (Customer):** Khởi tạo nhu cầu, chọn phương thức tìm kiếm hoặc gửi tin nhắn vào cửa sổ chat duy nhất, duyệt sản phẩm và chọn sản phẩm mục tiêu.

- **Làn 2 – Giftory System:** Điều phối giao diện người dùng, thực thi các truy vấn Search/Filter, kiểm tra trạng thái mở bán (Is_Sellable), kiểm tra tồn kho thời gian thực và điều hướng trang Product Detail.

- **Làn 3 – Giftory AI Chatbot (Intent Engine & Services):**

  - *Intent Engine:* Phân loại ý định khách hàng (Recommendation vs Support).
  - *AI Recommendation Service:* Trích xuất thực thể nhu cầu, đối chiếu Catalog và xuất danh sách gợi ý.
  - *Customer Support Service:* Tra cứu thông tin đơn hàng / chính sách và điều phối chuyển tiếp nhân viên.

- **Làn 4 – Nhân viên CSKH (Live Agent):** Tiếp nhận phiên chat khi có yêu cầu chuyển giao (Handover) để hỗ trợ các tình huống phức tạp.

**2. Diễn giải chi tiết tiến trình BPMN (BPMN Process Execution)**

- **Start Event:** Khách hàng phát sinh nhu cầu và truy cập vào nền tảng Giftory.

- **Task 1 (Giftory System):** Tải và hiển thị giao diện trang chủ kèm công cụ Search/Filter và Widget AI Chatbot hợp nhất.

- **Gateway 1 (Exclusive Gateway – Kênh tương tác?):**

  - **Nhánh Search / Filter:**

    - *Task 2.1 (Khách hàng):* Nhập từ khóa tìm kiếm hoặc đánh dấu các tiêu chí lọc tại Sidebar.
    - *Task 2.2 (Giftory System):* Truy vấn CSDL Giftory Catalog và xuất danh sách sản phẩm lên lưới sản phẩm (Product Grid).

  - **Nhánh Giftory AI Chatbot:**

    - *Task 3.1 (Khách hàng):* Nhập tin nhắn bằng ngôn ngữ tự nhiên trong cửa sổ chat duy nhất.

    - *Task 3.2 (Intent Engine):* Phân tích và phân loại ý định người dùng.

    - **Gateway 2 (Exclusive Gateway – Intent Type?):**

      - *Nhánh Support Intent:* Chuyển sang Customer Support Service để tra cứu đơn hàng hoặc chuyển tiếp Nhân viên CSKH (AF2 / BP-06).

      - *Nhánh Recommendation Intent:* Kích hoạt AI Recommendation Service $\to$ Kiểm tra mức độ đầy đủ của dữ liệu.

      - **Gateway 3 (Exclusive Gateway – Enough Info?):**

        - *Nhánh No:* AI gửi câu hỏi yêu cầu bổ sung thông tin $\to$ Quay lại Task 3.1.
        - *Nhánh Yes:* AI Recommendation Service phân tích ngữ cảnh, ánh xạ với CSDL Catalog thực tế và tạo Thẻ xoay vòng (Card Carousel).

- **Hội tụ luồng:** Danh sách sản phẩm từ nhánh Search/Filter hoặc Thẻ gợi ý của AI được hiển thị cho Khách hàng xem xét.

- **Gateway 4 (Exclusive Gateway – Phù hợp sản phẩm?):**

  - *Nhánh No (Chưa ưng ý):* Chuyển sang luồng AF1, điều chỉnh lại tiêu chí $\to$ Làm mới danh sách.

  - *Nhánh Yes (Đã chọn được sản phẩm):*

    - *Task 4 (Khách hàng):* Nhấn chọn vào một sản phẩm cụ thể.

    - *Task 5 (Giftory System):* Kiểm tra số lượng tồn kho thời gian thực.

      - *Nếu Stock = 0:* Trả về cảnh báo "Product Unavailable" và hiển thị phương án thay thế (EF1).
      - *Nếu Stock > 0:* Ghi nhận trạng thái Product Selected và điều hướng Khách hàng sang trang Chi tiết sản phẩm (Product Detail).

- **End Event:** Tiến trình hoàn tất thành công, Khách hàng sẵn sàng tiếp tục quy trình Tùy biến quà tặng (BP-02) hoặc Đặt hàng trực tiếp (BP-03).

**3.5.1.5. Các quy tắc nghiệp vụ (Business Rules)**

**1. Nhóm Product Availability Rules**

| **Mã BR** | **Tên Quy tắc nghiệp vụ** | **Nội dung Quy tắc nghiệp vụ chi tiết** | **Tác động hệ thống / Cơ chế kiểm soát** |
| --- | --- | --- | --- |
| **BR-REC01** | Trạng thái mở bán (Sellable State) | Tất cả các sản phẩm xuất hiện trong kết quả Tìm kiếm, Bộ lọc hoặc do AI Chatbot đề xuất bắt buộc phải đang ở trạng thái được phép kinh doanh (Is_Sellable = True). | Hệ thống áp dụng bộ lọc ngầm tự động trong mọi truy vấn SQL/API trước khi trả dữ liệu về giao diện người dùng. |
| **BR-REC02** | Kiểm tra tồn kho thời gian thực | Hệ thống bắt buộc phải kiểm tra số lượng tồn kho khả dụng (Stock_Quantity > 0) trước khi cho phép Khách hàng mở trang Chi tiết sản phẩm hoặc thêm vào giỏ hàng. | Vô hiệu hóa nút chọn hoặc hiển thị nhãn cảnh báo "Product Unavailable / Hết hàng" khi sản phẩm có tồn kho bằng 0. |

**2. Nhóm AI Recommendation Rules**

| **Mã BR** | **Tên Quy tắc nghiệp vụ** | **Nội dung Quy tắc nghiệp vụ chi tiết** | **Tác động hệ thống / Cơ chế kiểm soát** |
| --- | --- | --- | --- |
| **BR-REC03** | Ràng buộc Catalog thực tế (Strict DB Matching) | Trợ lý ảo AI tuyệt đối không được tự sáng tạo hoặc đề xuất các sản phẩm không tồn tại trong cơ sở dữ liệu Giftory Catalog (Zero Hallucination). | Thuật toán AI bắt buộc phải ánh xạ (map) kết quả gợi ý với Product_ID hợp lệ đang hoạt động trong CSDL trước khi render Card lên khung chat. |
| **BR-REC04** | Ngưỡng dữ liệu tư vấn AI | Bộ tư vấn AI chỉ tiến hành phân tích và đề xuất khi tiếp nhận tối thiểu **02 tiêu chí ngữ cảnh** hợp lệ (ví dụ: Recipient + Occasion, hoặc Occasion + Budget). | Nếu dữ liệu đầu vào không đủ ngưỡng, AI phải phản hồi bằng câu hỏi lịch sự hoặc hiển thị các Chip gợi ý để yêu cầu Khách hàng bổ sung. |
| **BR-REC05** | Quy tắc Fallback tiệm cận | Khi không tìm thấy sản phẩm khớp 100% tất cả tiêu chí của Khách hàng, AI không được báo lỗi hệ thống mà phải giải thích rõ lý do và đề xuất các sản phẩm có tiêu chí tiệm cận nhất kèm thông báo minh bạch. | Backend Recommendation Service nới lỏng biên độ ngân sách/dịp tặng để trả về danh sách tiệm cận, đi kèm câu giải thích thân thiện trên UI. |

**3. Nhóm Intent Recognition & Handover Rules**

| **Mã BR** | **Tên Quy tắc nghiệp vụ** | **Nội dung Quy tắc nghiệp vụ chi tiết** | **Tác động hệ thống / Cơ chế kiểm soát** |
| --- | --- | --- | --- |
| **BR-REC06** | Nhận diện và phân luồng Intent | Cửa sổ Chatbot phải tự động phân biệt hai nhóm ý định: Recommendation Intent (mua sắm/tư vấn) và Support Intent (hỗ trợ/tra cứu) để định tuyến đến đúng service phụ trách. | Bộ phân loại ý định (Intent Classifier) gán nhãn và gọi API nội bộ tương ứng trong thời gian $\le$ 1.0s. |
| **BR-REC07** | Bàn giao phiên chat mượt mà (Seamless Handover) | Khi khách hàng yêu cầu gặp nhân viên hoặc khiếu nại vượt quá năng lực xử lý của AI, hệ thống phải chuyển giao phiên chat sang Nhân viên CSKH mà không làm đứt đoạn cuộc trò chuyện. | Giữ nguyên cửa sổ chat, gắn tag Handover_Pending và đồng bộ toàn bộ lịch sử trò chuyện sang màn hình CSKH Dashboard. |
