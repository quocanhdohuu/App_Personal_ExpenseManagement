# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG QUẢN LÝ CHI TIÊU (EXPENSEPRO)
**Môi trường triển khai**: Cloudflare Pages (Frontend PWA) + Supabase Free (PostgreSQL Database & Auth & RPC)

---

## 1. TỔNG QUAN KIẾN TRÚC MÔI TRƯỜNG PRODUCTION

```mermaid
flowchart LR
    ClientBrowser["Trình duyệt / Thiết bị PWA\n(IndexedDB + Service Worker)"]
    CFPages["Cloudflare Pages (Global CDN Edge)\nStatic Assets + SPA Router"]
    SupabaseDB["Supabase PostgreSQL\n(RLS + RPC + Auth API)"]

    ClientBrowser -- "HTTPS (Vite PWA Assets)" --> CFPages
    ClientBrowser -- "HTTPS REST / RPC / Auth" --> SupabaseDB
    ClientBrowser -. "Offline: Cache-First" .-> ClientBrowser
```

- **Frontend**: Single Page Application (SPA), React 18, TypeScript, Tailwind CSS, Vite PWA, được host trên Cloudflare Pages miễn phí không giới hạn băng thông.
- **Backend / Database**: Supabase Free Tier với PostgreSQL 15+, hệ thống phân quyền Row-Level Security (RLS) bảo vệ tại tầng cơ sở dữ liệu và các hàm stored procedures (RPC) đảm bảo giao dịch nguyên tử (ACID).
- **Offline-First Storage**: Dexie.js (IndexedDB) lưu trữ độc lập trên từng thiết bị, đồng bộ 2 chiều qua Sync Queue và cơ chế chống xung đột Optimistic Concurrency Control (OCC).

---

## 2. TRIỂN KHAI BACKEND & DATABASE TRÊN SUPABASE

### Bước 1: Khởi tạo Project trên Supabase
1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập (hoặc đăng ký tài khoản miễn phí).
2. Bấm nút **"New Project"**.
3. Điền các thông tin:
   - **Name**: `ExpensePro` (hoặc tên tùy chọn).
   - **Database Password**: Đặt mật khẩu an toàn và lưu lại.
   - **Region**: Chọn khu vực gần người dùng nhất (khuyến nghị: `Singapore - ap-southeast-1`).
   - **Pricing Plan**: `Free Plan`.
4. Bấm **"Create new project"** và chờ 1-2 phút để Supabase chuẩn bị cụm database.

### Bước 2: Chạy Migrations và Cấu hình Database
Truy cập vào menu **SQL Editor** trên thanh điều hướng bên trái của Supabase Dashboard, tạo mới một câu truy vấn và lần lượt chạy 4 file theo thứ tự:

1. **File 1: Khởi tạo Bảng, Index và Triggers**
   - Mở file: `supabase/migrations/20261126000001_create_schema_and_tables.sql`
   - Dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
   - *Kết quả*: Tạo thành công 10 bảng lõi, ràng buộc khóa ngoại, triggers cập nhật `updated_at` và triggers kiểm toán `audit_logs`.

2. **File 2: Thiết lập Phân quyền Row-Level Security (RLS)**
   - Mở file: `supabase/migrations/20261126000002_setup_rls_security.sql`
   - Dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
   - *Kết quả*: Bật RLS trên toàn bộ 10 bảng, thiết lập các helper functions `is_wallet_member`, `get_wallet_role`, `is_system_admin` và các policies cho từng bảng.

3. **File 3: Nghiệp vụ Stored Procedures / RPC**
   - Mở file: `supabase/migrations/20261126000003_rpc_and_business_logic.sql`
   - Dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
   - *Kết quả*: Cài đặt các hàm RPC nguyên tử: `create_wallet_with_owner`, `get_wallet_balance_summary`, `transfer_wallet_funds`, `get_suggested_descriptions`, `sync_batch_transactions`.

4. **File 4: Nạp Dữ Liệu Khởi Tạo (Seed Data)**
   - Mở file: `supabase/seed.sql`
   - Dán toàn bộ nội dung vào SQL Editor và nhấn **Run**.
   - *Kết quả*: Tạo sẵn 15 danh mục chuẩn (Ăn uống, Đi lại, Lương, Thưởng...), 3 tài khoản mặc định (Admin, User A, User B), 2 quỹ mẫu và các giao dịch mẫu.

### Bước 3: Lấy API Credentials từ Supabase
1. Trên Supabase Dashboard, vào menu **Project Settings** (biểu tượng bánh răng) -> **API**.
2. Tìm và sao chép 2 giá trị sau:
   - **Project URL**: Ví dụ: `https://xyzcompany.supabase.co`
   - **Project API Keys**: Copy khóa có nhãn **`anon` `public`**.

---

## 3. TRIỂN KHAI FRONTEND LÊN CLOUDFLARE PAGES

### Bước 1: Đẩy mã nguồn lên GitHub / GitLab
Đảm bảo toàn bộ mã nguồn của dự án đã được commit và push lên repository riêng của bạn trên GitHub hoặc GitLab.

```powershell
git add .
git commit -m "feat: complete expense management app with pwa and auth"
git push origin master
```

### Bước 2: Tạo dự án Cloudflare Pages
1. Truy cập [https://dash.cloudflare.com](https://dash.cloudflare.com) và đăng nhập.
2. Vào mục **Workers & Pages** -> Chọn **Create application** -> Chọn tab **Pages** -> Bấm **Connect to Git**.
3. Chọn tài khoản GitHub/GitLab và chọn repository `App_Personal_ExpenseManagement`.
4. Bấm **"Begin setup"**.

### Bước 3: Cấu hình Build Settings trên Cloudflare
Điền các tham số cấu hình:
- **Project name**: `expense-management` (hoặc tên bạn muốn, Cloudflare sẽ cấp subdomain miễn phí: `https://expense-management.pages.dev`).
- **Production branch**: `master` (hoặc `main`).
- **Framework preset**: Chọn **Vite**.
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: Để trống (mặc định thư mục gốc).

### Bước 4: Khai báo Biến Môi Trường (Environment Variables)
Mở rộng phần **Environment variables (advanced)** và thêm 2 biến đã lấy từ Supabase:

| Tên biến | Giá trị | Ghi chú |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | `https://your-project.supabase.co` | URL Project Supabase của bạn |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOi...` | Khóa Public Anon Key từ Supabase |

5. Bấm nút **"Save and Deploy"**.
6. Cloudflare Pages sẽ tự động kéo code, cài đặt dependencies, chạy lệnh build TypeScript + Vite PWA và phát hành website ra mạng lưới CDN toàn cầu (Global Edge Network) trong khoảng 1 phút.

> [!NOTE]
> File `public/_redirects` với nội dung `/* /index.html 200` đã được chuẩn bị sẵn trong mã nguồn. File này đảm bảo tính năng Single Page Application (SPA) của React Router hoạt động mượt mà khi người dùng F5 hoặc truy cập trực tiếp các đường dẫn như `/wallets`, `/transactions`, `/reports`, `/profile`, `/admin`.

---

## 4. HƯỚNG DẪN CÀI ĐẶT PWA VÀ SỬ DỤNG OFFLINE

Ứng dụng đáp ứng đầy đủ tiêu chuẩn Progressive Web App (PWA) với manifest và Service Worker tự động:

### Trên Điện thoại (Android / Chrome)
1. Dùng trình duyệt Chrome mở địa chỉ Cloudflare Pages (`https://your-domain.pages.dev`).
2. Trình duyệt sẽ hiện thanh thông báo hoặc bạn chọn menu `⋮` (Ba chấm) góc trên bên phải -> Chọn **"Cài đặt ứng dụng"** hoặc **"Thêm vào màn hình chính" (Add to Home screen)**.
3. Biểu tượng ứng dụng **ExpensePro** màu xanh ngọc sẽ xuất hiện trên màn hình điện thoại như ứng dụng native (không có thanh URL của trình duyệt).

### Trên Điện thoại (iOS / Safari)
1. Dùng trình duyệt Safari mở đường link ứng dụng.
2. Bấm nút **Chia sẻ (Share)** ở thanh công cụ phía dưới -> Chọn **"Thêm vào MH chính" (Add to Home Screen)**.
3. Ứng dụng sẽ chạy ở chế độ Standalone toàn màn hình.

### Trên Máy tính (Chrome / Edge / Windows / Mac)
1. Mở trang web trên trình duyệt.
2. Nhấp vào biểu tượng máy tính có mũi tên xuống ở cuối thanh địa chỉ URL -> Chọn **"Cài đặt ExpensePro"**.
3. Ứng dụng sẽ mở trong một cửa sổ desktop độc lập.

---

## 5. BẢNG KIỂM TRA BẢO MẬT & VẬN HÀNH (PRODUCTION CHECKLIST)

- [x] **SSL / HTTPS**: Cloudflare Pages tự động cấp chứng chỉ SSL miễn phí, đảm bảo Service Worker và IndexedDB được kích hoạt an toàn.
- [x] **RLS Database Enforcement**: Toàn bộ truy vấn đọc/ghi đều qua PostgreSQL RLS, không thể can thiệp dữ liệu ví quỹ trái phép.
- [x] **Offline Resilience**: Chế độ máy bay (Airplane mode) hoặc mất mạng vẫn tạo giao dịch bình thường, tự động lưu vào Sync Queue và tự động gửi lên máy chủ khi kết nối trở lại.
- [x] **Bảo vệ Tài khoản Admin**: Chống tự khóa hoặc tự xóa tài khoản của chính mình.
- [x] **Tách biệt phân quyền**: Người dùng thường không thể truy cập `/admin`.

---

## 6. CẤU HÌNH HTTPS & BẢO MẬT KẾT NỐI (CLOUDFLARE PAGES)

1. **HTTPS Tự động (Universal SSL)**:
   - Cloudflare Pages mặc định kích hoạt SSL/TLS miễn phí cho tên miền `*.pages.dev` cũng như tên miền riêng (Custom Domain).
   - Đây là điều kiện bắt buộc để **Service Worker (PWA)** và **IndexedDB** hoạt động trên các trình duyệt hiện đại.
2. **Thiết lập bắt buộc HTTPS**:
   - Trong Cloudflare Dashboard -> Chọn tên miền (nếu dùng Custom Domain) -> **SSL/TLS** -> **Overview**: chọn chế độ **Full (strict)**.
   - Vào **SSL/TLS** -> **Edge Certificates**: Bật **Always Use HTTPS** và **Automatic HTTPS Rewrites** để mọi truy cập HTTP tự động chuyển hướng sang HTTPS.

---

## 7. THIẾT LẬP BACKUP & SAO LƯU DỮ LIỆU (SUPABASE)

### A. Sao lưu tự động (Automated Backups)
- Trên gói **Supabase Pro** trở lên: Hệ thống tự động snapshot database hằng ngày (Daily Backups) và hỗ trợ Point-in-Time Recovery (PITR).
- Trên gói **Supabase Free**: Không bật sẵn Daily Backups trên giao diện, do đó cần kết hợp sao lưu định kỳ bằng 1 trong 2 cách sau:

### B. Sao lưu thủ công / Lịch định kỳ qua `pg_dump` hoặc GitHub Actions
1. **Lấy Connection String (URI)**:
   - Vào Supabase Dashboard -> **Project Settings** -> **Database** -> Copy **Connection string (URI)** (chế độ Direct connection hoặc Session pooler).
2. **Chạy lệnh backup PostgreSQL định kỳ**:
   ```powershell
   pg_dump "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" --no-owner --no-acl -F c -f "backup_$(Get-Date -Format 'yyyyMMdd_HHmm').dump"
   ```
3. **Phục hồi dữ liệu khi cần**:
   ```powershell
   pg_restore --no-owner --no-acl -d "postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" backup_file.dump
   ```
4. **Sao lưu dữ liệu người dùng tại thiết bị**:
   - Người dùng cuối có thể kiểm tra và đồng bộ hàng đợi cục bộ tại mục **Hồ sơ cá nhân -> Bộ nhớ & Thiết bị Offline** trước khi đổi thiết bị hoặc xóa trình duyệt.
