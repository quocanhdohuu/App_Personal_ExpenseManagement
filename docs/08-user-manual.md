# HƯỚNG DẪN SỬ DỤNG ỨNG DỤNG QUẢN LÝ CHI TIÊU (EXPENSEPRO)

Tài liệu hướng dẫn sử dụng đầy đủ dành cho **Người dùng (User)** và **Quản trị viên (Admin)** trên cả máy tính và điện thoại.

---

## PHẦN 1: DÀNH CHO NGƯỜI DÙNG (USER)

### 1. Đăng nhập & Bảo mật tài khoản
1. Mở ứng dụng trên trình duyệt hoặc biểu tượng PWA trên màn hình chính.
2. Nhập **Địa chỉ Email** và **Mật khẩu** được cấp để đăng nhập.
3. Sau khi đăng nhập thành công, hệ thống tự động đưa bạn vào màn hình **Giao dịch**.
4. **Đổi mật khẩu / Cập nhật họ tên**:
   - Nhấp vào Avatar ở góc trên bên phải -> Chọn **Hồ sơ cá nhân & Bảo mật**.
   - Tại tab **Thông Tin Cá Nhân**: Sửa họ tên và nhấn **Lưu Thay Đổi**.
   - Tại tab **Đổi Mật Khẩu**: Nhập mật khẩu hiện tại, mật khẩu mới (tối thiểu 6 ký tự) và xác nhận lại.

### 2. Quản lý Giao dịch (`/transactions`)
- **Xem số dư quỹ hiện tại**: Ngay đầu trang hiển thị thẻ **Số Dư Hiện Tại** của quỹ đang lọc hoặc tổng số dư các quỹ bạn tham gia, kèm **Tổng Thu (Bộ lọc)**.
- **Thêm giao dịch mới**:
  1. Nhấn nút **+ Thêm Giao Dịch**.
  2. Chọn loại giao dịch: **Khoản Chi**, **Khoản Thu** hoặc **Điều Chỉnh**.
  3. Chọn **Quỹ phát sinh** (xem ngay số dư hiện tại của quỹ đó bên dưới).
  4. Nhập **Số tiền (VND)** (hệ thống tự động định dạng dấu chấm hàng nghìn, ví dụ `32.000 ₫`).
  5. Chọn **Ngày giao dịch**, **Danh mục** và nhập **Lý do giao dịch** (có thể bấm nhanh vào các **Gợi ý thông minh từ lịch sử**).
  6. Nhấn **Tạo Giao Dịch**.
- **Chuyển tiền giữa các quỹ**:
  1. Nhấn nút **Chuyển tiền giữa các quỹ**.
  2. Chọn **Quỹ nguồn**, **Quỹ đích**, nhập số tiền và nội dung chuyển.
  3. Hệ thống trừ quỹ nguồn và cộng quỹ đích đồng thời (nguyên tử), đồng thời **không tính** khoản này vào doanh số thu/chi trong báo cáo.
- **Sửa / Xóa mềm giao dịch**: Nhấn biểu tượng cây bút để sửa hoặc thùng rác để xóa mềm (lưu vết kiểm toán).
- **Tìm kiếm & Lọc**: Lọc theo quỹ, loại giao dịch, danh mục, từ khóa lý do/ghi chú và sắp xếp theo ngày/số tiền.

### 3. Xem Báo cáo Thống kê (`/reports`)
- Chọn khoảng thời gian: **Tuần này**, **Tháng này**, **Năm nay** hoặc **Tùy chọn ngày**.
- Chọn lọc theo từng quỹ cụ thể hoặc tất cả các quỹ của bạn.
- Theo dõi các chỉ số: **Tổng Thu**, **Tổng Chi**, **Chênh lệch**, **Biểu đồ cột xu hướng**, **Biểu đồ tròn Top 5 danh mục chi nhiều nhất**, **Top lý do chi** và **Chi tiêu theo thành viên**.

### 4. Sử dụng Ngoại tuyến (Offline) & Đồng bộ
- Khi mất mạng, thanh trạng thái trên cùng tự động chuyển sang màu vàng **Ngoại tuyến (Offline)**.
- Bạn vẫn có thể thêm, sửa, xóa giao dịch bình thường; dữ liệu được lưu an toàn vào **IndexedDB** trên thiết bị và xếp vào hàng đợi **Sync Queue**.
- Khi có mạng trở lại, hệ thống tự động đồng bộ lên máy chủ. Nếu có xung đột chỉnh sửa cùng 1 giao dịch từ 2 thiết bị, màn hình sẽ hiện **Hộp thoại giải quyết xung đột** để bạn chọn giữ bản Máy chủ hoặc Thiết bị.

---

## PHẦN 2: DÀNH CHO QUẢN TRỊ VIÊN (ADMIN)

Khi đăng nhập bằng tài khoản có quyền **System Admin**, thanh điều hướng hiển thị đầy đủ 5 mục: `Quản lý Quỹ`, `Giao dịch`, `Báo cáo`, `Danh mục` và `Quản trị Admin`.

### 1. Quản trị Người dùng & Hệ thống (`/admin`)
- **Thêm người dùng mới**: Nhấn **+ Thêm Người Dùng**, nhập Họ tên, Email, Mật khẩu khởi tạo, chọn quyền Admin/User và trạng thái kích hoạt. Hệ thống tự động tạo cho người dùng mới một **Ví cá nhân mặc định**.
- **Sửa / Đặt lại mật khẩu**: Nhấn nút **Sửa** tại dòng người dùng cần chỉnh sửa.
- **Khóa / Mở khóa tài khoản**: Nhấn nút **Khóa** để vô hiệu hóa quyền đăng nhập ngay lập tức (Admin không thể tự khóa hoặc tự xóa chính mình).
- **Lịch sử kiểm toán (Audit Logs)**: Xem toàn bộ nhật ký thao tác hệ thống theo thời gian thực.
- **Cấu hình hệ thống**: Chỉnh sửa các tham số toàn cục (`DEFAULT_CURRENCY`, `MAX_WALLETS_PER_USER`,...).

### 2. Quản lý Quỹ & Thành viên (`/wallets`)
- Tạo quỹ cá nhân hoặc quỹ chung mới, điều chỉnh số dư ban đầu (có lưu vết kiểm toán), mời thành viên bằng email và phân quyền (`OWNER`, `EDITOR`, `VIEWER`), hoặc đóng/lưu trữ quỹ.

### 3. Quản lý Danh mục (`/categories`)
- Tạo và quản lý các danh mục Thu / Chi dùng chung toàn hệ thống hoặc riêng cho từng quỹ.
