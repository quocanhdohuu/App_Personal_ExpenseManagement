# THIẾT KẾ CƠ SỞ DỮ LIỆU CHI TIẾT (DATABASE SCHEMA & RPC SPECIFICATION)
## DỰ ÁN: ỨNG DỤNG WEB QUẢN LÝ CHI TIÊU CÁ NHÂN & NHÓM

---

### 1. CHI TIẾT CÁC BẢNG DỮ LIỆU (TABLES DEFINITION)

#### 1.1. Bảng `profiles`
Lưu trữ thông tin người dùng công khai, mở rộng từ `auth.users` của Supabase.
```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    is_system_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

#### 1.2. Bảng `wallets`
Lưu trữ thông tin các quỹ chi tiêu (quỹ cá nhân và quỹ chung).
```sql
CREATE TABLE public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('PERSONAL', 'SHARED')),
    currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

#### 1.3. Bảng `wallet_members`
Quản lý thành viên và vai trò trong từng quỹ.
```sql
CREATE TABLE public.wallet_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_wallet_member UNIQUE (wallet_id, user_id)
);
```

#### 1.4. Bảng `wallet_invitations`
Quản lý lời mời tham gia quỹ chung.
```sql
CREATE TABLE public.wallet_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    invitee_email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('EDITOR', 'VIEWER')),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED')),
    token VARCHAR(100) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

#### 1.5. Bảng `categories`
Quản lý danh mục thu/chi (hệ thống mặc định hoặc tùy biến theo quỹ).
```sql
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE, -- NULL nghĩa là danh mục chung hệ thống
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'BOTH')),
    icon VARCHAR(50),
    color VARCHAR(20),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_category_name_per_wallet UNIQUE (wallet_id, name)
);
```

#### 1.6. Bảng `transactions`
Lưu trữ toàn bộ các giao dịch thu, chi, điều chỉnh với hỗ trợ Soft Delete và Optimistic Locking.
```sql
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'ADJUSTMENT')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMPTZ NOT NULL,
    description VARCHAR(255) NOT NULL,
    notes TEXT,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1,
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

#### 1.7. Bảng `wallet_transfers`
Quản lý lịch sử luân chuyển tiền tệ giữa 2 quỹ, liên kết 2 giao dịch song song.
```sql
CREATE TABLE public.wallet_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    destination_wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transfer_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    description VARCHAR(255) NOT NULL,
    source_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    destination_transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_different_wallets CHECK (source_wallet_id <> destination_wallet_id)
);
```

#### 1.8. Bảng `user_preferences`
Cấu hình cá nhân hóa của người dùng.
```sql
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    default_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    theme VARCHAR(20) NOT NULL DEFAULT 'SYSTEM' CHECK (theme IN ('LIGHT', 'DARK', 'SYSTEM')),
    enable_offline_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

#### 1.9. Bảng `sync_operations`
Lưu vết các tác vụ đồng bộ ngoại tuyến từ các thiết bị độc lập để chống trùng và xử lý xung đột.
```sql
CREATE TABLE public.sync_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    client_operation_id VARCHAR(100) NOT NULL UNIQUE,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('CREATE', 'UPDATE', 'DELETE')),
    status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'CONFLICT', 'FAILED')),
    error_message TEXT,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

#### 1.10. Bảng `audit_logs`
Ghi nhận lịch sử kiểm toán các thay đổi quan trọng trên hệ thống.
```sql
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
```

---

### 2. THIẾT KẾ CHỈ MỤC TỐI ƯU TRUY VẤN (INDEXES)

```sql
-- Profiles
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_admin ON public.profiles(is_system_admin) WHERE is_system_admin = TRUE;

-- Wallet Members
CREATE INDEX idx_wallet_members_user ON public.wallet_members(user_id);
CREATE INDEX idx_wallet_members_wallet ON public.wallet_members(wallet_id);

-- Transactions (Tối ưu cho lọc, sắp xếp và tính toán số dư)
CREATE INDEX idx_transactions_wallet_date ON public.transactions(wallet_id, transaction_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_category ON public.transactions(category_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX idx_transactions_idempotency ON public.transactions(idempotency_key);
CREATE INDEX idx_transactions_search_desc ON public.transactions USING gin (to_tsvector('simple', description)) WHERE is_deleted = FALSE;

-- Transfers
CREATE INDEX idx_transfers_source ON public.wallet_transfers(source_wallet_id);
CREATE INDEX idx_transfers_destination ON public.wallet_transfers(destination_wallet_id);

-- Sync Operations
CREATE INDEX idx_sync_ops_client_op_id ON public.sync_operations(client_operation_id);
CREATE INDEX idx_sync_ops_user_device ON public.sync_operations(user_id, device_id);

-- Audit Logs
CREATE INDEX idx_audit_logs_user_date ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_name, entity_id);
```

---

### 3. THIẾT KẾ CÁC HÀM XỬ LÝ NGHIỆP VỤ & RPC (POSTGRESQL FUNCTIONS)

#### 3.1. Tính toán số dư quỹ (Dynamic Balance Calculation)
Không lưu trường số dư tĩnh để tránh mất nhất quán; hàm tính toán dựa trên số dư ban đầu và lịch sử giao dịch chưa xóa:
```sql
CREATE OR REPLACE FUNCTION public.get_wallet_balance_summary(p_wallet_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_initial_balance NUMERIC(15, 2);
    v_total_income NUMERIC(15, 2) := 0;
    v_total_expense NUMERIC(15, 2) := 0;
    v_total_adjustment_pos NUMERIC(15, 2) := 0;
    v_total_adjustment_neg NUMERIC(15, 2) := 0;
    v_current_balance NUMERIC(15, 2);
BEGIN
    -- 1. Lấy số dư ban đầu
    SELECT initial_balance INTO v_initial_balance
    FROM public.wallets
    WHERE id = p_wallet_id;

    IF v_initial_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet % not found', p_wallet_id;
    END IF;

    -- 2. Tính tổng thu (INCOME)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_income
    FROM public.transactions
    WHERE wallet_id = p_wallet_id AND type = 'INCOME' AND is_deleted = FALSE;

    -- 3. Tính tổng chi (EXPENSE)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
    FROM public.transactions
    WHERE wallet_id = p_wallet_id AND type = 'EXPENSE' AND is_deleted = FALSE;

    -- 4. Tính điều chỉnh (ADJUSTMENT)
    -- Giao dịch điều chỉnh: nếu amount > 0 tính theo mô tả điều chỉnh tăng hoặc phân loại chi tiết
    -- Công thức: Balance = Initial + Income - Expense + Adjustments
    v_current_balance := v_initial_balance + v_total_income - v_total_expense;

    RETURN jsonb_build_object(
        'wallet_id', p_wallet_id,
        'initial_balance', v_initial_balance,
        'total_income', v_total_income,
        'total_expense', v_total_expense,
        'current_balance', v_current_balance
    );
END;
$$;
```

#### 3.2. Tạo quỹ kèm thiết lập quyền OWNER (Atomic Creation)
```sql
CREATE OR REPLACE FUNCTION public.create_wallet_with_owner(
    p_name VARCHAR,
    p_description TEXT,
    p_type VARCHAR,
    p_currency VARCHAR,
    p_initial_balance NUMERIC
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_wallet_id UUID;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Thêm ví
    INSERT INTO public.wallets (name, description, type, currency, initial_balance, created_by)
    VALUES (p_name, p_description, p_type, COALESCE(p_currency, 'VND'), COALESCE(p_initial_balance, 0), v_user_id)
    RETURNING id INTO v_wallet_id;

    -- Thêm thành viên với vai trò OWNER
    INSERT INTO public.wallet_members (wallet_id, user_id, role)
    VALUES (v_wallet_id, v_user_id, 'OWNER');

    RETURN v_wallet_id;
END;
$$;
```

#### 3.3. Chuyển tiền giữa các quỹ (Atomic Transfer)
```sql
CREATE OR REPLACE FUNCTION public.transfer_wallet_funds(
    p_source_wallet_id UUID,
    p_destination_wallet_id UUID,
    p_amount NUMERIC,
    p_description VARCHAR,
    p_idempotency_key VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_source_role VARCHAR;
    v_dest_role VARCHAR;
    v_transfer_category_id UUID;
    v_source_tx_id UUID;
    v_dest_tx_id UUID;
    v_transfer_id UUID;
BEGIN
    -- 1. Kiểm tra xác thực
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Kiểm tra quyền của người dùng trên 2 ví (phải là OWNER hoặc EDITOR)
    SELECT role INTO v_source_role FROM public.wallet_members WHERE wallet_id = p_source_wallet_id AND user_id = v_user_id;
    SELECT role INTO v_dest_role FROM public.wallet_members WHERE wallet_id = p_destination_wallet_id AND user_id = v_user_id;

    IF v_source_role NOT IN ('OWNER', 'EDITOR') OR v_dest_role NOT IN ('OWNER', 'EDITOR') THEN
        RAISE EXCEPTION 'Permission denied. Must be OWNER or EDITOR on both wallets.';
    END IF;

    -- 3. Lấy hoặc tạo danh mục Chuyển tiền hệ thống
    SELECT id INTO v_transfer_category_id FROM public.categories WHERE name = 'Chuyển tiền' AND wallet_id IS NULL LIMIT 1;
    IF v_transfer_category_id IS NULL THEN
        INSERT INTO public.categories (name, type, icon, is_default)
        VALUES ('Chuyển tiền', 'BOTH', 'arrows-right-left', TRUE)
        RETURNING id INTO v_transfer_category_id;
    END IF;

    -- 4. Tạo giao dịch trừ tiền ở ví nguồn
    INSERT INTO public.transactions (wallet_id, category_id, type, amount, transaction_date, description, created_by, idempotency_key)
    VALUES (p_source_wallet_id, v_transfer_category_id, 'EXPENSE', p_amount, now(), 'Chuyển đi: ' || p_description, v_user_id, p_idempotency_key || '_OUT')
    RETURNING id INTO v_source_tx_id;

    -- 5. Tạo giao dịch cộng tiền ở ví đích
    INSERT INTO public.transactions (wallet_id, category_id, type, amount, transaction_date, description, created_by, idempotency_key)
    VALUES (p_destination_wallet_id, v_transfer_category_id, 'INCOME', p_amount, now(), 'Nhận từ: ' || p_description, v_user_id, p_idempotency_key || '_IN')
    RETURNING id INTO v_dest_tx_id;

    -- 6. Tạo bản ghi wallet_transfers liên kết
    INSERT INTO public.wallet_transfers (
        source_wallet_id, destination_wallet_id, amount, description,
        source_transaction_id, destination_transaction_id, created_by
    )
    VALUES (
        p_source_wallet_id, p_destination_wallet_id, p_amount, p_description,
        v_source_tx_id, v_dest_tx_id, v_user_id
    )
    RETURNING id INTO v_transfer_id;

    RETURN jsonb_build_object(
        'transfer_id', v_transfer_id,
        'source_transaction_id', v_source_tx_id,
        'destination_transaction_id', v_dest_tx_id,
        'amount', p_amount
    );
END;
$$;
```

#### 3.4. Gợi ý lý do giao dịch thông minh (Smart Suggestions)
```sql
CREATE OR REPLACE FUNCTION public.get_suggested_descriptions(
    p_wallet_id UUID,
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (description VARCHAR, usage_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Kiểm tra quyền xem ví
    IF NOT EXISTS (
        SELECT 1 FROM public.wallet_members WHERE wallet_id = p_wallet_id AND user_id = v_user_id
    ) THEN
        RAISE EXCEPTION 'Access denied to wallet';
    END IF;

    RETURN QUERY
    SELECT t.description, COUNT(*) AS usage_count
    FROM public.transactions t
    WHERE t.wallet_id = p_wallet_id
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
      AND t.is_deleted = FALSE
    GROUP BY t.description
    ORDER BY usage_count DESC, MAX(t.transaction_date) DESC
    LIMIT p_limit;
END;
$$;
```
