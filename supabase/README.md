# HƯỚNG DẪN TRIỂN KHAI VÀ QUẢN LÝ DATABASE (SUPABASE)

Tất cả các tệp di chuyển (migrations) và dữ liệu khởi tạo (seed) đã được tổ chức theo tiêu chuẩn của Supabase CLI.

---

### 1. CẤU TRÚC THƯ MỤC
```
supabase/
├── config.jsonc                  # Cấu hình dự án Supabase
├── migrations/
│   ├── 20261126000001_create_schema_and_tables.sql    # DDL 10 bảng, ràng buộc, chỉ mục & triggers
│   ├── 20261126000002_setup_rls_security.sql          # Kích hoạt RLS, security functions & policies
│   └── 20261126000003_rpc_and_business_logic.sql      # Stored procedures & RPC functions nghiệp vụ
├── seed.sql                      # Danh mục mặc định hệ thống, User A, User B, Quỹ mẫu
tests/
└── database/
    └── test_rls_and_permissions.sql                   # Kịch bản kiểm thử tự động RLS & RPC
```

---

### 2. CÁC CÁCH TRIỂN KHAI LÊN SUPABASE

#### Cách 1: Triển khai trực tiếp lên Supabase Cloud Dashboard (Khuyên dùng)
1. Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard) và chọn/tạo project.
2. Vào mục **SQL Editor**.
3. Chạy lần lượt nội dung các tệp theo thứ tự:
   - `migrations/20261126000001_create_schema_and_tables.sql`
   - `migrations/20261126000002_setup_rls_security.sql`
   - `migrations/20261126000003_rpc_and_business_logic.sql`
   - `seed.sql`
4. Để kiểm thử, chạy tệp `tests/database/test_rls_and_permissions.sql` trong SQL Editor để xác nhận toàn bộ 5 bài test đều `PASS 100%`.

#### Cách 2: Sử dụng Supabase CLI với Project liên kết
```bash
# Đăng nhập vào tài khoản Supabase
npx supabase login

# Liên kết với project Supabase của bạn
npx supabase link --project-ref <project-id>

# Đẩy toàn bộ migrations lên database
npx supabase db push
```

#### Cách 3: Sử dụng Local Supabase (Yêu cầu Docker Desktop)
```bash
# Khởi động cụm local
npx supabase start

# Chạy migrations và nạp seed data
npx supabase db reset
```
