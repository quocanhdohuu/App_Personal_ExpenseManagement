# TÀI LIỆU YÊU CẦU NGHIỆP VỤ (BUSINESS REQUIREMENTS DOCUMENT - BRD)
## DỰ ÁN: ỨNG DỤNG WEB QUẢN LÝ CHI TIÊU CÁ NHÂN & NHÓM (EXPENSE MANAGEMENT)

---

### 1. TỔNG QUAN VÀ MỤC TIÊU DỰ ÁN
- **Mục tiêu**: Xây dựng hệ thống ứng dụng Web Quản lý chi tiêu cho cá nhân và nhóm nhỏ (ban đầu 2 người dùng: User A & User B, sẵn sàng mở rộng < 10 người dùng).
- **Trải nghiệm người dùng**: Responsive đa nền tảng (Desktop, Tablet, Mobile), hoạt động như PWA (Progressive Web App), hoạt động trơn tru ngay cả khi mất mạng (Offline-first) trên nhiều thiết bị độc lập và tự động đồng bộ hai chiều khi có Internet.
- **Tiêu chuẩn dữ liệu**: Toàn vẹn, nhất quán, bảo mật đa tầng qua RLS (Row Level Security) và RPC của PostgreSQL/Supabase.

---

### 2. MÔ HÌNH NGƯỜI DÙNG & TÀI KHOẢN (USERS & PROFILES)
1. **Định danh người dùng**:
   - Sử dụng Supabase Authentication (Email/Password).
   - Mỗi người dùng liên kết 1-1 với một bản ghi `profiles` (chứa `id` (UUID), `email`, `full_name`, `avatar_url`, `is_system_admin`, `is_active`, `created_at`, `updated_at`).
2. **Khả năng sở hữu & tham gia**:
   - Mỗi người dùng tự động có ít nhất 1 Quỹ cá nhân mặc định khi đăng ký.
   - Một người dùng có thể sở hữu nhiều quỹ cá nhân và tham gia nhiều quỹ chung.
   - Một người dùng có thể đăng nhập trên nhiều thiết bị khác nhau (PC, điện thoại) đồng thời. Dữ liệu offline trên từng thiết bị được đồng bộ an toàn qua Sync Queue.

---

### 3. QUẢN LÝ QUỸ (WALLETS MANAGEMENT)
1. **Phân loại quỹ**:
   - **Quỹ cá nhân (`PERSONAL`)**: Chỉ thuộc về 1 người tạo duy nhất, không chia sẻ cho người khác.
   - **Quỹ chung (`SHARED`)**: Cho phép nhiều thành viên cùng tham gia với các vai trò khác nhau.
2. **Thuộc tính quỹ**:
   - `id` (UUID), `name` (Tên quỹ), `description` (Mô tả), `type` (`PERSONAL` | `SHARED`), `currency` (mặc định VND), `initial_balance` (Số dư ban đầu), `is_archived` (Trạng thái đóng/mở), `created_by` (Người tạo).
3. **Công thức tính số dư (Balance Calculation)**:
   $$\text{Số dư hiện tại} = \text{Số dư ban đầu} + \sum(\text{Thu}) - \sum(\text{Chi}) + \sum(\text{Điều chỉnh tăng}) - \sum(\text{Điều chỉnh giảm})$$
   - **Nguyên tắc bất biến**: Không cho phép ghi đè số dư trực tiếp bằng một con số tùy tiện. Mọi biến động số dư phải xuất phát từ giao dịch (`INCOME`, `EXPENSE`, `ADJUSTMENT`) hoặc thao tác điều chỉnh có lưu vết kiểm toán (`audit_logs`).
4. **Vòng đời & Quản trị quỹ**:
   - Tạo quỹ mới $\rightarrow$ Thiết lập số dư ban đầu $\rightarrow$ Mời thành viên (đối với quỹ chung) $\rightarrow$ Cập nhật thông tin/Đóng quỹ (`is_archived = true`).
   - Quỹ đã đóng (`archived`) sẽ ở trạng thái Read-Only, không thể thêm giao dịch mới trừ khi được mở lại.

---

### 4. PHÂN QUYỀN HỆ THỐNG & TRONG QUỸ (AUTHORIZATION)
1. **Cấp hệ thống (System Level)**:
   - `ADMIN`: Quản trị viên toàn hệ thống, có quyền xem danh sách người dùng, kích hoạt/khóa tài khoản, quản lý danh mục toàn cục, xem audit logs.
   - `USER`: Người dùng tiêu chuẩn.
2. **Cấp quỹ (Wallet Member Roles)**:
   - `OWNER` (Chủ sở hữu): Toàn quyền trên quỹ (sửa tên, cấu hình, nạp/sửa số dư ban đầu, mời/đuổi thành viên, phân quyền thành viên, đóng quỹ, xóa quỹ).
   - `EDITOR` (Biên tập viên): Thêm/sửa/xóa giao dịch, thêm danh mục con cho quỹ, xem báo cáo quỹ.
   - `VIEWER` (Người xem): Chỉ có quyền đọc danh sách giao dịch, số dư và báo cáo; không được phép thêm/sửa/xóa bất kỳ giao dịch nào.
3. **Nguyên tắc bảo mật**:
   - Kiểm tra quyền triệt để tại Database bằng PostgreSQL RLS và PostgreSQL Functions (RPC). Frontend chỉ ẩn/hiện UI tương ứng, không quyết định bảo mật.

---

### 5. QUẢN LÝ GIAO DỊCH (TRANSACTIONS)
1. **Thông tin giao dịch**:
   - `id` (UUID), `wallet_id` (Quỹ phát sinh), `category_id` (Danh mục), `type` (`INCOME`, `EXPENSE`, `ADJUSTMENT`), `amount` (Số tiền, > 0), `transaction_date` (Ngày phát sinh), `description` (Lý do/Nội dung), `notes` (Ghi chú chi tiết), `created_by` (Người thực hiện), `version` (Số hiệu phiên bản chống xung đột), `is_deleted` (Xóa mềm - Soft delete), `deleted_at`, `deleted_by`.
2. **Thao tác hỗ trợ**:
   - **Thêm mới**: Gán UUID ngay tại client để hỗ trợ tạo offline và chống trùng lặp (Idempotent).
   - **Chỉnh sửa**: Cập nhật thông tin, tăng `version` để phát hiện xung đột.
   - **Xóa mềm (Soft delete)**: Đánh dấu `is_deleted = true`, lưu lại thời điểm và người xóa; giao dịch bị ẩn khỏi số dư và báo cáo nhưng được lưu vết đầy đủ.
   - **Tìm kiếm & Bộ lọc**: Tìm kiếm theo lý do, lọc theo loại giao dịch, khoảng ngày, danh mục, khoảng số tiền, người thực hiện.
   - **Gợi ý lý do (Smart Description Suggestion)**: Tự động gợi ý các lý do giao dịch phổ biến dựa trên lịch sử đã nhập của người dùng trong cùng Quỹ và Danh mục.

---

### 6. CHUYỂN TIỀN GIỮA CÁC QUỸ (WALLET TRANSFERS)
1. **Bản chất nghiệp vụ**:
   - Cho phép chuyển số tiền $X$ từ Quỹ nguồn ($A$) sang Quỹ đích ($B$).
   - Người thực hiện phải có quyền tối thiểu: `EDITOR` trên Quỹ $A$ (trừ tiền) và `EDITOR` trên Quỹ $B$ (cộng tiền).
2. **Đảm bảo tính nguyên tử (Atomicity)**:
   - Sử dụng PostgreSQL RPC (Database Function có `BEGIN ... EXCEPTION ... COMMIT/ROLLBACK`).
   - Tạo 1 bản ghi `wallet_transfers` liên kết với 2 giao dịch:
     - 1 giao dịch xuất tiền ở Quỹ $A$ (Loại `TRANSFER_OUT` hoặc liên kết transfer).
     - 1 giao dịch nhập tiền ở Quỹ $B$ (Loại `TRANSFER_IN` hoặc liên kết transfer).
   - Nếu bất kỳ quỹ nào thất bại hoặc thiếu quyền, toàn bộ transaction bị Rollback.
3. **Thống kê báo cáo**:
   - Nghiệp vụ chuyển tiền nội bộ giữa các quỹ **không được tính** vào Tổng thu hoặc Tổng chi trong các báo cáo tài chính tổng hợp chung.

---

### 7. BÁO CÁO & THỐNG KÊ (REPORTS & ANALYTICS)
1. **Phạm vi thời gian**: Theo tuần (Tuần này / Tuần trước), theo tháng, theo năm hoặc tùy chọn (Custom date range).
2. **Các chỉ số tài chính**:
   - Tổng thu thực tế ($\sum \text{Income}$).
   - Tổng chi thực tế ($\sum \text{Expense}$).
   - Chênh lệch ròng (Thu - Chi).
   - Xu hướng số dư theo thời gian.
   - Top danh mục chi tiêu cao nhất (Biểu đồ tròn/cột).
   - Top lý do chi tiêu nhiều nhất.
   - Tỷ trọng chi tiêu theo từng thành viên trong quỹ chung.

---

### 8. QUẢN TRỊ VIÊN (ADMIN PORTAL)
1. Quản lý người dùng: Xem danh sách, trạng thái kích hoạt, khóa/mở khóa tài khoản.
2. Quản lý danh mục hệ thống: Cấu hình danh mục mặc định (Ăn uống, Đi lại, Nhà cửa, Lương, Thưởng,...).
3. Giám sát hệ thống: Xem audit logs (lịch sử đăng nhập, thay đổi quyền, thao tác quan trọng), cấu hình hệ thống.

---

### 9. KIẾN TRÚC OFFLINE & ĐỒNG BỘ DỮ LIỆU (OFFLINE & SYNC REQUIREMENTS)
1. **Lưu trữ cục bộ (Local Storage)**:
   - Sử dụng IndexedDB thông qua thư viện `Dexie.js`.
   - Lưu trữ bản sao của Wallets, Categories, Transactions, Sync Queue và User Profile.
2. **Cơ chế Sync Queue**:
   - Khi offline, mọi thao tác Thêm / Sửa / Xóa được ghi nhận vào bảng `sync_queue` nội bộ IndexedDB kèm theo: `id`, `entity_type`, `entity_id`, `action` (`CREATE`, `UPDATE`, `DELETE`), `payload`, `created_at`, `status` (`PENDING`, `SYNCING`, `FAILED`).
3. **Chống trùng giao dịch (Idempotency)**:
   - Client tạo UUID v4 cho mọi thực thể mới tạo. Khi đồng bộ lên Supabase, Server áp dụng cơ chế `INSERT ... ON CONFLICT (id) DO NOTHING` hoặc xử lý upsert an toàn.
4. **Giải quyết xung đột (Conflict Resolution)**:
   - Áp dụng kỹ thuật **Optimistic Concurrency Control (OCC)** thông qua trường `version` (integer).
   - Nếu bản ghi trên Server có `version > version_cục_bộ`, hệ thống nhận diện xung đột:
     - Client hiển thị cảnh báo xung đột (Conflict resolution dialog) cho phép người dùng chọn: "Giữ dữ liệu máy chủ", "Ghi đè bản sửa cục bộ" hoặc "Tách thành giao dịch mới".
5. **Xử lý thu hồi quyền khi Offline**:
   - Nếu thành viên bị xóa quyền khỏi quỹ trong lúc đang offline: Khi kết nối lại, Server RPC/RLS sẽ từ chối thao tác, Sync Queue chuyển trạng thái `FAILED` kèm thông báo lỗi cụ thể để người dùng nắm rõ.
