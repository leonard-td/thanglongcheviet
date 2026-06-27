## Tính năng core
### Xác thực & Quản lý tài khoản
* Đăng nhập (email + mật khẩu)
* Đăng ký tài khoản mới
* Quên mật khẩu – gửi link đặt lại qua email
* Đặt lại mật khẩu – tạo mật khẩu mới
* Đổi mật khẩu – trong trang hồ sơ
* Xác minh email – yêu cầu xác thực địa chỉ
* Hồ sơ người dùng – xem và cập nhật tên, email, avatar
* Xóa tài khoản – tự xóa vĩnh viễn
* Xác thực đa yếu tố (MFA/2FA) – qua ứng dụng (Google Authenticator) hoặc email
* Mã dự phòng – dùng khi mất quyền truy cập MFA
* Xác thực bằng Passkey – đăng nhập không mật khẩu với sinh trắc học
* Quản lý phiên đăng nhập – xem và đăng xuất các thiết bị khác
* Đăng xuất

### Điều hướng & Giao diện
* Bảng điều khiển (Dashboard) – trang tổng quan với widget
* Menu người dùng – menu thả xuống (hồ sơ, đăng xuất, …)
* Chế độ tối / sáng – chuyển đổi theo sở thích
* Tìm kiếm toàn cục – tìm kiếm nhanh trên toàn hệ thống
* Hỗ trợ đa ngôn ngữ – giao diện hiển thị bằng nhiều ngôn ngữ
* Bố cục không thanh tiêu đề – tối đa không gian (menu, thông báo, tìm kiếm chuyển vào thanh bên)
* Tùy chỉnh giao diện (Theming) – thay đổi phông chữ, bảng màu (thường dành cho admin nhưng người dùng có thể thấy hiệu ứng)

### Quản lý & Tương tác dữ liệu
#### Bảng dữ liệu (Tables)
* Xem danh sách – hiển thị bảng có phân trang
* Sắp xếp – nhấp tiêu đề cột để sắp xếp
* Tìm kiếm – lọc theo từ khóa
* Bộ lọc (Filters) – lọc theo tiêu chí định sẵn
* Hành động trên hàng (Row Actions) – sửa, xóa, xem chi tiết từng dòng
* Hành động hàng loạt (Bulk Actions) – chọn nhiều dòng và thao tác đồng loạt
#### Biểu mẫu (Forms)
* Đa dạng trường nhập – Text, Select, Checkbox, Toggle, Date Picker, File Upload, Rich Editor, Code Editor, Slider, …
* Xác thực dữ liệu – kiểm tra tính hợp lệ tự động
* Trình lặp (Repeater) – thêm nhiều mục giống nhau linh hoạt (dạng bảng thu gọn)
* Trình soạn thảo giàu tính năng (Rich Editor) – định dạng văn bản, chèn bố cục lưới (12 cột), chọn màu chữ, chèn ảnh
#### Trang chi tiết (Infolists)
* Hiển thị thông tin bản ghi ở dạng chỉ đọc, có cấu trúc
#### Hành động & Cửa sổ bật lên
* Hành động (Actions) – nút bấm để thực hiện tác vụ (Tạo mới, Lưu, …)
* Cửa sổ bật lên (Modals) – xuất hiện để xác nhận hoặc nhập thêm dữ liệu

#### Thông báo
* Thông báo tức thời (Flash) – xuất hiện ngay sau hành động
* Thông báo lưu trữ (Database) – lưu trong CSDL và hiển thị trong cửa sổ riêng
* Thông báo thời gian thực (Broadcast) – gửi qua WebSocket
* Thông báo đẩy trình duyệt (Push) – người dùng đăng ký nhận

#### Bảng điều khiển & Tiện ích (Dashboard Widgets)
* Widget thống kê – hiển thị số liệu dạng số
* Widget biểu đồ – biểu đồ trực quan
* Widget lịch (Calendar) – từ plugin, hiển thị sự kiện từ nhiều model
* Widget tùy chỉnh – người dùng có thể thấy các widget do admin tạo

#### Quản lý người dùng (dành cho quản trị viên)
* Quản lý người dùng – CRUD tài khoản người dùng khác
* Phân quyền dựa trên vai trò (RBAC) – gán vai trò, quyền hạn
* Quyền hạn chi tiết (Granular Permissions) – kiểm soát truy cập chi tiết
* Tính năng "Đóng giả" (User Impersonation) – admin đăng nhập vào tài khoản người khác để hỗ trợ

### Các tính năng bổ sung khác
* Nhắn tin thời gian thực (Filament Messages)
* Quản lý nhóm / Teams (thường có trong starter kit)
* Quản lý API Tokens – tạo và quản lý token xác thực API
* Hỗ trợ Đa khách hàng (Multi-tenancy) – cho ứng dụng SaaS với nhiều tenant
* Trường động (Custom Fields) – người dùng cuối có thể thêm trường vào model mà không cần migration
* Bảng tính nhúng (Univer Sheet) – chỉnh sửa bảng tính ngay trong biểu mẫu
* Cột hiển thị logo công ty (Company Logo Column) trên bảng
————————————————————————————————

### Tính năng quản trị cửa hàng (dành cho chủ shop, nhân viên)
1. Quản lý sản phẩm (Product Management)
* Danh sách sản phẩm – bảng lọc, tìm kiếm, sắp xếp, phân trang
* Thêm / Sửa / Xóa sản phẩm – với các trường nhập: tên, mô tả (Rich Editor), giá, số lượng tồn kho, SKU, ảnh đại diện (File Upload)
* Phân loại sản phẩm – gán danh mục, thương hiệu, nhà cung cấp (quan hệ)
* Biến thể sản phẩm – quản lý các biến thể (màu sắc, kích thước) với giá và tồn kho riêng (dùng Repeater hoặc plugin)
* Trạng thái sản phẩm – công khai / nháp / hết hàng
* Hình ảnh sản phẩm – tải nhiều ảnh, sắp xếp thứ tự
* Đánh giá / xếp hạng – hiển thị và quản lý đánh giá từ khách hàng (có thể tích hợp)
2. Quản lý danh mục & thuộc tính (Categories & Attributes)
* Danh mục đa cấp – tạo cây danh mục (cha – con)
* Thuộc tính sản phẩm – định nghĩa các thuộc tính (màu, size, chất liệu) và gán cho sản phẩm
* Nhãn / tag – gắn thẻ cho sản phẩm để lọc hoặc tìm kiếm dễ dàng
3. Quản lý đơn hàng (Order Management)
* Danh sách đơn hàng – xem tất cả đơn hàng, lọc theo trạng thái (mới, đang xử lý, đã giao, hủy)
* Chi tiết đơn hàng – xem thông tin khách hàng, các sản phẩm đã mua, số lượng, giá, tổng tiền, phí vận chuyển, thuế
* Cập nhật trạng thái đơn hàng – thay đổi trạng thái (xác nhận, đóng gói, giao hàng, hoàn thành)
* Ghi chú đơn hàng – thêm ghi chú nội bộ hoặc ghi chú cho khách hàng
* Hủy đơn hàng – hủy và hoàn tiền (nếu có cổng thanh toán)
* Lịch sử đơn hàng – xem nhật ký thay đổi trạng thái và thao tác
4. Quản lý khách hàng (Customer Management)
* Danh sách khách hàng – xem tất cả người dùng đã đăng ký
* Hồ sơ khách hàng – xem thông tin cá nhân, lịch sử mua hàng, số tiền đã chi
* Phân nhóm khách hàng – gán nhóm (VIP, thường, …) để áp dụng giá đặc biệt
* Quản lý địa chỉ giao hàng – xem và chỉnh sửa địa chỉ của khách hàng (nếu lưu)
5. Quản lý tồn kho (Inventory Management)
* Theo dõi tồn kho – hiển thị số lượng tồn cho từng sản phẩm và biến thể
* Cảnh báo tồn kho thấp – thông báo khi sản phẩm sắp hết hàng
* Nhập kho / xuất kho – ghi nhận số lượng nhập, xuất (có thể dùng plugin)
* Quản lý kho hàng – hỗ trợ nhiều kho (nếu cần)
6. Thanh toán & Vận chuyển (Payment & Shipping)
* Cổng thanh toán – tích hợp các cổng thanh toán phổ biến qua plugin (ví dụ: Stripe, PayPal, VNPay, Momo) hoặc tự viết
* Quản lý phương thức thanh toán – bật/tắt các cổng thanh toán
* Quản lý phí vận chuyển – thiết lập bảng giá vận chuyển theo khu vực, cân nặng, hoặc giá trị đơn hàng
* Đơn vị vận chuyển – quản lý các hãng vận chuyển (GHTK, Viettel Post, …) và mã vận đơn
* In hóa đơn / phiếu giao hàng – tạo và in chứng từ
7. Báo cáo & Thống kê (Reports & Analytics)
* Báo cáo doanh thu – theo ngày, tuần, tháng, năm – dạng biểu đồ và số liệu
* Báo cáo sản phẩm bán chạy – top sản phẩm bán nhiều nhất
* Báo cáo khách hàng thân thiết – khách hàng có tổng chi tiêu cao
* Thống kê đơn hàng – số đơn, tỷ lệ hoàn thành, hủy, …
* Thống kê tồn kho – giá trị tồn kho, số lượng sản phẩm tồn
8. Quản lý khuyến mãi (Promotions)
* Mã giảm giá (Coupon) – tạo mã, loại giảm (theo % hoặc số tiền cố định), áp dụng cho sản phẩm / danh mục cụ thể
* Chương trình khuyến mãi – tạo sự kiện giảm giá theo ngày
* Quà tặng / mua 1 tặng 1 – thiết lập các quy tắc khuyến mãi
9. Quản lý nội dung (CMS)
* Trang thông tin – quản lý các trang tĩnh (Giới thiệu, Liên hệ, Chính sách, …)
* Bài viết blog – thêm, sửa, xóa bài viết để SEO
* Menu – quản lý menu điều hướng trên website
* Slide banner – quản lý hình ảnh quảng cáo trên trang chủ
10. Hỗ trợ khách hàng (Customer Support)
* Hệ thống ticket – cho phép khách hàng gửi yêu cầu hỗ trợ và nhân viên trả lời (có plugin)
* Live chat – tích hợp chat trực tuyến (có plugin Filament Messages)
11. Đa ngôn ngữ & Đa tiền tệ (nếu cần)
* Quản lý bản dịch – dịch giao diện quản trị và nội dung sản phẩm
* Chuyển đổi tiền tệ – hiển thị giá bằng nhiều loại tiền (tỷ giá có thể cập nhật thủ công hoặc qua API)
12. Phân quyền & Bảo mật (RBAC)
* Phân quyền người dùng – tạo nhiều vai trò (Admin, Nhân viên bán hàng, Kho, CSKH) với quyền hạn khác nhau
* Quản lý nhân viên – thêm/sửa nhân viên, gán vai trò

### Tính năng Bài viết
* Quản lý danh sách bài viết (Table):
    * Xem danh sách bài viết dạng bảng, phân trang.
    * Sắp xếp theo tiêu đề, ngày tạo, trạng thái.
    * Tìm kiếm bài viết theo tiêu đề hoặc nội dung.
    * Lọc bài viết theo danh mục, tác giả, trạng thái (Xuất bản/Nháp).
    * Hành động hàng loạt: Chọn nhiều bài để duyệt, xóa, hoặc thay đổi trạng thái hàng loạt.
* Tạo / Sửa bài viết (Form):
    * Nhập tiêu đề, mô tả ngắn.
    * Trình soạn thảo văn bản giàu tính năng (Rich Editor): Định dạng chữ, chèn bảng, chèn bố cục lưới, chọn màu chữ.
    * Chọn trạng thái: Nháp, Xuất bản, Chờ duyệt (dùng Toggle hoặc Select).
    * Hẹn giờ xuất bản: Chọn ngày/giờ để bài viết tự động được đăng lên (dùng DateTimePicker).
    * Chọn danh mục cha/con (dùng Select quan hệ).
    * Nhập thẻ (Tags) cho bài viết.
    * Tải ảnh đại diện (Featured Image) lên (dùng File Upload).
    * Tùy chỉnh đường dẫn tĩnh (Slug) hoặc để tự động sinh.
* Trang chi tiết (Infolist):
    * Hiển thị bài viết ở dạng chỉ đọc, đẹp mắt để nhân viên xem nhanh mà không sợ sửa nhầm.
* Quản lý Tác giả:
    * Tự động lưu người dùng nào đang tạo bài viết
    * Cho phép quản trị viên gán bài viết cho một tác giả khác.

Tính năng Bài viết nâng cao
1. Quản lý Hình ảnh & Media
* Thư viện Media tập trung: Quản lý tất cả ảnh trong một kho duy nhất, không bị trùng lặp.
* Cắt ảnh (Cropper): Cho phép người dùng cắt ảnh ngay khi tải lên để vừa khung hình mong muốn.
* Chọn ảnh từ thư viện: Khi viết bài, người dùng có thể chọn ảnh đã có sẵn thay vì tải lại.
2. Quản lý Danh mục & Thẻ chuyên sâu
* Danh mục đa cấp (Hierarchical Categories): Tạo danh mục cha – con không giới hạn.
* Giao diện quản lý danh mục riêng: Có bảng lọc, tìm kiếm danh mục riêng biệt.
3. Quản lý SEO
* Mặc dù chưa có plugin SEO chuyên sâu miễn phí, nhưng có thể dễ dàng thêm các trường nhập vào form bài viết:
    * Meta Title (Tiêu đề SEO)
    * Meta Description (Mô tả hiển thị trên Google)
    * Focus Keyword (Từ khóa chính)
 4. Quản lý Bình luận (Comment Management)
* Dùng plugin Filament Comments (miễn phí) hoặc tự xây:
    * Duyệt bình luận (Phê duyệt / Từ chối).
    * Trả lời bình luận ngay trong trang quản trị.
    * Hiển thị số lượng bình luận trên danh sách bài viết.
5. Quản lý thành phần tĩnh (Pages & Menus)
* Quản lý Trang tĩnh (Pages): Tạo các trang như "Giới thiệu", "Liên hệ", "Chính sách" với trình soạn thảo kéo thả (Drag-and-drop).
* Quản lý Menu (Menus): Tạo menu điều hướng cho website (thanh header, footer) mà không cần code.
* Quản lý Banner/Slider: Cho phép người dùng thêm ảnh quảng cáo, kèm link và thứ tự hiển thị.
 6. Lịch sử & Bản nháp (Revisions)
    * Lưu lại toàn bộ lịch sử chỉnh sửa bài viết.
    * So sánh các phiên bản cũ và mới (Ai đã sửa, sửa lúc nào, sửa gì).
    * Khôi phục (Rollback) về phiên bản cũ nếu cần.