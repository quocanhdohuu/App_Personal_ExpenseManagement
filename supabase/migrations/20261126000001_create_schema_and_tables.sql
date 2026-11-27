-- ==============================================================================
-- MIGRATION: 20261126000001_create_schema_and_tables.sql
-- DESCRIPTION: Khởi tạo phần mở rộng, 10 bảng dữ liệu chính, khóa ngoại, ràng buộc,
--              chỉ mục (indexes) và triggers tự động cập nhật thời gian / profile.
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TRIGGER FUNCTION: Cập nhật updated_at
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. BẢNG 1: PROFILES (Liên kết 1-1 với auth.users)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    is_system_admin BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 4. BẢNG 2: WALLETS (Quản lý Quỹ cá nhân & Quỹ chung)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
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

CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON public.wallets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 5. BẢNG 3: WALLET_MEMBERS (Phân quyền thành viên trong Quỹ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OWNER', 'EDITOR', 'VIEWER')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_wallet_member UNIQUE (wallet_id, user_id)
);

CREATE TRIGGER trg_wallet_members_updated_at
    BEFORE UPDATE ON public.wallet_members
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 6. BẢNG 4: WALLET_INVITATIONS (Lời mời tham gia Quỹ chung)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_invitations (
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

-- ==============================================================================
-- 7. BẢNG 5: CATEGORIES (Danh mục Thu/Chi mặc định hệ thống hoặc tùy biến theo quỹ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.wallets(id) ON DELETE CASCADE, -- NULL là danh mục hệ thống
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

CREATE TRIGGER trg_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 8. BẢNG 6: TRANSACTIONS (Giao dịch tài chính)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
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

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 9. BẢNG 7: WALLET_TRANSFERS (Luân chuyển tiền giữa 2 quỹ)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transfers (
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

-- ==============================================================================
-- 10. BẢNG 8: USER_PREFERENCES (Cài đặt cá nhân hóa)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    default_currency VARCHAR(10) NOT NULL DEFAULT 'VND',
    default_wallet_id UUID REFERENCES public.wallets(id) ON DELETE SET NULL,
    theme VARCHAR(20) NOT NULL DEFAULT 'SYSTEM' CHECK (theme IN ('LIGHT', 'DARK', 'SYSTEM')),
    enable_offline_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TRIGGER trg_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.set_current_timestamp_updated_at();

-- ==============================================================================
-- 11. BẢNG 9: SYNC_OPERATIONS (Ghi vết đồng bộ ngoại tuyến)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sync_operations (
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

-- ==============================================================================
-- 12. BẢNG 10: AUDIT_LOGS (Kiểm toán bảo mật)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
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

-- ==============================================================================
-- 13. INDEXES TỐI ƯU TRUY VẤN
-- ==============================================================================
-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON public.profiles(is_system_admin) WHERE is_system_admin = TRUE;

-- Wallets
CREATE INDEX IF NOT EXISTS idx_wallets_created_by ON public.wallets(created_by);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON public.wallets(type);
CREATE INDEX IF NOT EXISTS idx_wallets_archived ON public.wallets(is_archived);

-- Wallet Members
CREATE INDEX IF NOT EXISTS idx_wallet_members_user ON public.wallet_members(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_members_wallet ON public.wallet_members(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_members_role ON public.wallet_members(wallet_id, role);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_wallet_date ON public.transactions(wallet_id, transaction_date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_transactions_created_by ON public.transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_transactions_idempotency ON public.transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_transactions_is_deleted ON public.transactions(is_deleted);
CREATE INDEX IF NOT EXISTS idx_transactions_search_desc ON public.transactions USING gin (to_tsvector('simple', description)) WHERE is_deleted = FALSE;

-- Categories
CREATE INDEX IF NOT EXISTS idx_categories_wallet ON public.categories(wallet_id);
CREATE INDEX IF NOT EXISTS idx_categories_type ON public.categories(type);

-- Transfers
CREATE INDEX IF NOT EXISTS idx_transfers_source ON public.wallet_transfers(source_wallet_id);
CREATE INDEX IF NOT EXISTS idx_transfers_destination ON public.wallet_transfers(destination_wallet_id);

-- Sync Operations & Audit Logs
CREATE INDEX IF NOT EXISTS idx_sync_ops_client_op_id ON public.sync_operations(client_operation_id);
CREATE INDEX IF NOT EXISTS idx_sync_ops_user_device ON public.sync_operations(user_id, device_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_date ON public.audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_name, entity_id);

-- ==============================================================================
-- 14. AUTH HOOK TRIGGER: Tự động khởi tạo Profile & Preferences khi User đăng ký
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url, is_system_admin, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url',
        FALSE,
        TRUE
    );

    INSERT INTO public.user_preferences (user_id, default_currency, theme, enable_offline_notifications)
    VALUES (NEW.id, 'VND', 'SYSTEM', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger chạy sau khi người dùng đăng ký qua Supabase Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
