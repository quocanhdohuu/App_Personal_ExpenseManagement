# BIÊN BẢN CHỐT THIẾT KẾ KIẾN TRÚC & HỆ THỐNG (PHASE 1 DESIGN SIGN-OFF)
## DỰ ÁN: ỨNG DỤNG WEB QUẢN LÝ CHI TIÊU CÁ NHÂN & NHÓM

---

### 1. TỔNG HỢP CÁC TÀI LIỆU THIẾT KẾ ĐÃ HOÀN THÀNH

| STT | Tài liệu | Đường dẫn | Nội dung chính |
|---|---|---|---|
| 1 | **Tài liệu yêu cầu nghiệp vụ** | [`docs/01-business-requirements.md`](file:///d:/Personal%20Projects/App_Personal_ExpenseManagement/docs/01-business-requirements.md) | Chuẩn hóa toàn bộ nghiệp vụ Quỹ (Cá nhân/Chung), Phân quyền, Giao dịch, Chuyển tiền nguyên tử, Báo cáo loại trừ chuyển tiền, Admin và yêu cầu Offline. |
| 2 | **Thiết kế ERD** | [`docs/02-erd.md`](file:///d:/Personal%20Projects/App_Personal_ExpenseManagement/docs/02-erd.md) | Sơ đồ Mermaid ERD chi tiết mô tả 10 thực thể, quan hệ 1-N, N-N, ràng buộc toàn vẹn, và luồng dữ liệu. |
| 3 | **Thiết kế Database & RPC** | [`docs/03-database-design.md`](file:///d:/Personal%20Projects/App_Personal_ExpenseManagement/docs/03-database-design.md) | Cấu trúc DDL chi tiết cho 10 bảng, hệ thống Index tối ưu, RPC functions: tính số dư động, tạo quỹ nguyên tử, chuyển tiền nguyên tử và gợi ý lý do thông minh. |
| 4 | **Thiết kế Phân quyền & RLS** | [`docs/04-authorization-security.md`](file:///d:/Personal%20Projects/App_Personal_ExpenseManagement/docs/04-authorization-security.md) | Ma trận phân quyền System Admin & Wallet Roles (OWNER, EDITOR, VIEWER), bảo mật 100% bằng PostgreSQL RLS policies cho cả 10 bảng, các hàm kiểm tra quyền. |
| 5 | **Thiết kế Offline & Đồng bộ** | [`docs/05-offline-architecture.md`](file:///d:/Personal%20Projects/App_Personal_ExpenseManagement/docs/05-offline-architecture.md) | Thiết kế Dexie.js schema cho IndexedDB, cơ chế Sync Queue FIFO, chống trùng lặp bằng UUID v4, kiểm soát phiên bản OCC (`version`), ma trận xử lý xung đột và thu hồi quyền. |

---

### 2. ĐỐI CHIẾU TIÊU CHUẨN MASTER PROMPT

| Yêu cầu bắt buộc từ Master Prompt | Trạng thái thiết kế | Giải pháp kỹ thuật áp dụng |
|---|---|---|
| **Công thức số dư không bị ghi đè tùy tiện** | Đạt chuẩn 100% | Sử dụng hàm RPC `get_wallet_balance_summary` tính toán động: $\text{Số dư} = \text{Initial} + \text{Income} - \text{Expense} \pm \text{Adjustment}$. Mọi biến động đều lưu giao dịch. |
| **Phân quyền tại Database (không chỉ Frontend)** | Đạt chuẩn 100% | Kích hoạt RLS trên cả 10 bảng, sử dụng các Security Definer functions (`has_wallet_role`, `is_wallet_member`, `is_system_admin`). |
| **Chuyển tiền giữa các quỹ nguyên tử** | Đạt chuẩn 100% | Hàm RPC `transfer_wallet_funds` đảm bảo giao dịch nguồn và giao dịch đích được ghi trong 1 PostgreSQL transaction duy nhất. |
| **Chuyển tiền không tính vào thu/chi báo cáo tổng** | Đạt chuẩn 100% | Đánh dấu phân loại hoặc liên kết qua `wallet_transfers`, bộ lọc báo cáo tự động loại bỏ các giao dịch chuyển tiền nội bộ. |
| **Hỗ trợ Offline nhiều thiết bị độc lập** | Đạt chuẩn 100% | IndexedDB thông qua Dexie.js lưu trữ cục bộ, Client sinh UUID v4 cho bản ghi và Idempotency Key, hàng đợi `sync_queue` lưu thao tác khi mất mạng. |
| **Chống trùng lặp & Xử lý xung đột** | Đạt chuẩn 100% | Ràng buộc `UNIQUE (idempotency_key)` và Optimistic Concurrency Control thông qua trường `version` tăng dần. |
| **Xử lý thu hồi quyền khi offline** | Đạt chuẩn 100% | Khi đồng bộ, Server RPC kiểm tra lại quyền thực tế tại thời điểm gửi. Nếu bị thu hồi quyền, server từ chối ghi và báo lỗi để client giữ lại bản ghi cục bộ an toàn. |

---

### 3. KẾ HOẠCH TRIỂN KHAI CHO GIAI ĐOẠN 2 (DATABASE & AUTHENTICATION)
Sau khi thiết kế được nghiệm thu, Giai đoạn 2 sẽ thực thi tuần tự:
1. Thiết lập cấu trúc thư mục Supabase (`supabase/migrations`, `supabase/seed.sql`).
2. Viết các migration scripts SQL chuẩn hóa (DDL, Constraints, Indexes, Triggers).
3. Triển khai các chính sách RLS cho 10 bảng.
4. Triển khai các hàm nghiệp vụ Stored Procedures / RPC Functions.
5. Cấu hình xác thực và script seed dữ liệu mẫu an toàn (tài khoản mẫu User A, User B, quỹ mẫu, danh mục mặc định).
6. Kiểm thử phân quyền và toàn vẹn dữ liệu.
