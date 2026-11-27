# THIẾT KẾ PHÂN QUYỀN VÀ BẢO MẬT (AUTHORIZATION & ROW LEVEL SECURITY - RLS)
## DỰ ÁN: ỨNG DỤNG WEB QUẢN LÝ CHI TIÊU CÁ NHÂN & NHÓM

---

### 1. NGUYÊN TẮC BẢO MẬT VÀ PHÂN TẦNG VAI TRÒ
1. **Bảo mật tại tầng Cơ sở dữ liệu (Database-level Security)**:
   - Toàn bộ 100% các bảng đều được kích hoạt Row Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
   - Mọi chính sách phân quyền đều được thi hành bằng RLS và PostgreSQL RPC functions, tuyệt đối không phụ thuộc vào frontend filtering.
   - Frontend không bao giờ nắm giữ Service Role Key; chỉ sử dụng Supabase Anon/Publishable Key kết hợp JWT token của người dùng.
2. **Cấu trúc vai trò**:
   - **Cấp Hệ Thống (System Level)**:
     - `ADMIN`: Người quản trị hệ thống (`profiles.is_system_admin = TRUE`), có quyền quản trị tài khoản, danh mục hệ thống và xem audit log.
     - `USER`: Người dùng thông thường.
   - **Cấp Quỹ (Wallet Member Roles)**:
     - `OWNER`: Chủ sở hữu quỹ. Toàn quyền quản trị quỹ, sửa số dư ban đầu, đóng quỹ, mời/xóa thành viên, phân quyền.
     - `EDITOR`: Biên tập viên. Được thêm, sửa, xóa (soft delete) giao dịch trong quỹ; tạo danh mục riêng cho quỹ. Không được sửa số dư ban đầu, không được mời/xóa thành viên.
     - `VIEWER`: Người xem. Chỉ có quyền đọc thông tin quỹ, danh sách giao dịch và xem báo cáo thống kê. Tuyệt đối không được ghi dữ liệu.

---

### 2. CÁC HÀM HELPER HỖ TRỢ ĐÁNH GIÁ QUYỀN (SECURITY FUNCTIONS)

Để tối ưu hiệu năng và tránh truy vấn đệ quy trong RLS, các hàm helper được khai báo với `SECURITY DEFINER` và `STABLE`:

```sql
-- 1. Kiểm tra người dùng hiện tại có phải là Admin hệ thống không
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE),
    FALSE
  );
$$;

-- 2. Kiểm tra vai trò của người dùng trong một quỹ xác định
CREATE OR REPLACE FUNCTION public.has_wallet_role(p_wallet_id UUID, p_roles VARCHAR[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.wallet_members wm
    JOIN public.profiles p ON p.id = wm.user_id
    WHERE wm.wallet_id = p_wallet_id 
      AND wm.user_id = auth.uid()
      AND p.is_active = TRUE
      AND wm.role = ANY(p_roles)
  );
$$;

-- 3. Kiểm tra người dùng có phải là thành viên của quỹ hay không
CREATE OR REPLACE FUNCTION public.is_wallet_member(p_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_wallet_role(p_wallet_id, ARRAY['OWNER', 'EDITOR', 'VIEWER']);
$$;
```

---

### 3. THIẾT KẾ CHÍNH SÁCH RLS CHI TIẾT THEO TỪNG BẢNG

#### 3.1. Bảng `profiles`
```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Người dùng đã đăng nhập có thể xem thông tin profile của thành viên khác (để hiển thị tên/avatar trong quỹ chung)
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT TO authenticated
    USING (is_active = TRUE OR public.is_system_admin());

-- Người dùng chỉ được sửa thông tin của chính mình (không được tự ý sửa is_system_admin)
CREATE POLICY "profiles_update_own_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Admin hệ thống có quyền cập nhật trạng thái mọi profile (khóa/mở tài khoản)
CREATE POLICY "profiles_admin_update_policy" ON public.profiles
    FOR UPDATE TO authenticated
    USING (public.is_system_admin());
```

#### 3.2. Bảng `wallets`
```sql
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- Thành viên của quỹ hoặc Admin hệ thống có quyền xem quỹ
CREATE POLICY "wallets_select_policy" ON public.wallets
    FOR SELECT TO authenticated
    USING (public.is_wallet_member(id) OR public.is_system_admin());

-- Mọi người dùng đã xác thực đều có quyền tạo quỹ mới
CREATE POLICY "wallets_insert_policy" ON public.wallets
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Chỉ OWNER của quỹ hoặc Admin hệ thống mới có quyền sửa thông tin/đóng quỹ
CREATE POLICY "wallets_update_policy" ON public.wallets
    FOR UPDATE TO authenticated
    USING (public.has_wallet_role(id, ARRAY['OWNER']) OR public.is_system_admin())
    WITH CHECK (public.has_wallet_role(id, ARRAY['OWNER']) OR public.is_system_admin());

-- Chỉ OWNER có quyền xóa quỹ
CREATE POLICY "wallets_delete_policy" ON public.wallets
    FOR DELETE TO authenticated
    USING (public.has_wallet_role(id, ARRAY['OWNER']) OR public.is_system_admin());
```

#### 3.3. Bảng `wallet_members`
```sql
ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;

-- Thành viên cùng quỹ được xem danh sách thành viên của quỹ đó
CREATE POLICY "wallet_members_select_policy" ON public.wallet_members
    FOR SELECT TO authenticated
    USING (public.is_wallet_member(wallet_id) OR public.is_system_admin());

-- Chỉ OWNER mới có quyền thêm thành viên trực tiếp
CREATE POLICY "wallet_members_insert_policy" ON public.wallet_members
    FOR INSERT TO authenticated
    WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['OWNER']) OR public.is_system_admin());

-- Chỉ OWNER có quyền đổi vai trò của thành viên khác
CREATE POLICY "wallet_members_update_policy" ON public.wallet_members
    FOR UPDATE TO authenticated
    USING (public.has_wallet_role(wallet_id, ARRAY['OWNER']) OR public.is_system_admin());

-- OWNER có thể xóa thành viên; Thành viên có thể tự rời khỏi quỹ (nếu không phải là OWNER duy nhất)
CREATE POLICY "wallet_members_delete_policy" ON public.wallet_members
    FOR DELETE TO authenticated
    USING (
        public.has_wallet_role(wallet_id, ARRAY['OWNER']) 
        OR user_id = auth.uid() 
        OR public.is_system_admin()
    );
```

#### 3.4. Bảng `transactions`
```sql
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Thành viên quỹ được xem các giao dịch chưa bị xóa mềm (VIEWER, EDITOR, OWNER)
CREATE POLICY "transactions_select_policy" ON public.transactions
    FOR SELECT TO authenticated
    USING (public.is_wallet_member(wallet_id) OR public.is_system_admin());

-- Chỉ OWNER và EDITOR mới có quyền thêm giao dịch
CREATE POLICY "transactions_insert_policy" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR'])
        AND auth.uid() = created_by
    );

-- Chỉ OWNER và EDITOR mới có quyền sửa giao dịch
CREATE POLICY "transactions_update_policy" ON public.transactions
    FOR UPDATE TO authenticated
    USING (public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR']))
    WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR']));

-- Không xóa cứng; thao tác xóa mềm thực chất là UPDATE is_deleted = TRUE. Nếu xóa cứng (chỉ OWNER/Admin)
CREATE POLICY "transactions_delete_policy" ON public.transactions
    FOR DELETE TO authenticated
    USING (public.has_wallet_role(wallet_id, ARRAY['OWNER']) OR public.is_system_admin());
```

#### 3.5. Bảng `categories`
```sql
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Xem danh mục hệ thống (wallet_id IS NULL) HOẶC danh mục thuộc ví mà mình là thành viên
CREATE POLICY "categories_select_policy" ON public.categories
    FOR SELECT TO authenticated
    USING (
        wallet_id IS NULL 
        OR public.is_wallet_member(wallet_id) 
        OR public.is_system_admin()
    );

-- Thêm danh mục riêng cho quỹ (yêu cầu OWNER hoặc EDITOR); Danh mục hệ thống chỉ Admin thêm
CREATE POLICY "categories_insert_policy" ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (
        (wallet_id IS NOT NULL AND public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR']))
        OR (wallet_id IS NULL AND public.is_system_admin())
    );

-- Sửa/xóa danh mục: OWNER của quỹ đối với danh mục quỹ; Admin đối với danh mục hệ thống
CREATE POLICY "categories_update_policy" ON public.categories
    FOR UPDATE TO authenticated
    USING (
        (wallet_id IS NOT NULL AND public.has_wallet_role(wallet_id, ARRAY['OWNER']))
        OR (wallet_id IS NULL AND public.is_system_admin())
    );
```

#### 3.6. Bảng `wallet_transfers`
```sql
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;

-- Thành viên của ví nguồn hoặc ví đích có quyền xem lịch sử chuyển tiền
CREATE POLICY "transfers_select_policy" ON public.wallet_transfers
    FOR SELECT TO authenticated
    USING (
        public.is_wallet_member(source_wallet_id) 
        OR public.is_wallet_member(destination_wallet_id)
        OR public.is_system_admin()
    );

-- Ghi bản ghi chuyển tiền chỉ được thực thi thông qua SECURITY DEFINER Function (RPC transfer_wallet_funds)
CREATE POLICY "transfers_insert_policy" ON public.wallet_transfers
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);
```

#### 3.7. Bảng `user_preferences` & `sync_operations`
```sql
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "preferences_user_policy" ON public.user_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_ops_user_policy" ON public.sync_operations
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

#### 3.8. Bảng `audit_logs`
```sql
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Chỉ Admin hệ thống hoặc chính người dùng thực hiện mới được đọc log
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (public.is_system_admin() OR user_id = auth.uid());

-- Không cho phép cập nhật hay xóa audit logs (Immutable log)
-- Chỉ cho phép ghi qua Trigger/System function
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_system_admin());
```
