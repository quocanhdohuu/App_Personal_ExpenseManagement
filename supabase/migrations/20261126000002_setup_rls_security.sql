-- ==============================================================================
-- MIGRATION: 20261126000002_setup_rls_security.sql
-- DESCRIPTION: Kích hoạt Row Level Security (RLS) cho 10 bảng dữ liệu,
--              định nghĩa các Security Definer helper functions và thiết lập
--              chính sách truy cập chi tiết cho System Admin, OWNER, EDITOR, VIEWER.
-- ==============================================================================

-- ==============================================================================
-- 1. SECURITY DEFINER HELPER FUNCTIONS (Tránh đệ quy trong RLS)
-- ==============================================================================

-- 1.1 Kiểm tra Admin hệ thống
CREATE OR REPLACE FUNCTION public.is_system_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_system_admin FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE),
    FALSE
  );
$$;

-- 1.2 Kiểm tra vai trò trong Quỹ
CREATE OR REPLACE FUNCTION public.has_wallet_role(p_wallet_id UUID, p_roles VARCHAR[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- 1.3 Kiểm tra là thành viên của Quỹ
CREATE OR REPLACE FUNCTION public.is_wallet_member(p_wallet_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_wallet_role(p_wallet_id, ARRAY['OWNER', 'EDITOR', 'VIEWER']);
$$;

-- ==============================================================================
-- 2. KÍCH HOẠT RLS TRÊN TOÀN BỘ 10 BẢNG
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. CHÍNH SÁCH RLS CHI TIẾT
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1 PROFILES
-- ------------------------------------------------------------------------------
CREATE POLICY "profiles_select_authenticated" ON public.profiles
    FOR SELECT TO authenticated
    USING (is_active = TRUE OR public.is_system_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL TO authenticated
    USING (public.is_system_admin())
    WITH CHECK (public.is_system_admin());

-- ------------------------------------------------------------------------------
-- 3.2 WALLETS
-- ------------------------------------------------------------------------------
CREATE POLICY "wallets_select" ON public.wallets
    FOR SELECT TO authenticated
    USING (public.is_wallet_member(id) OR public.is_system_admin());

CREATE POLICY "wallets_insert" ON public.wallets
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "wallets_update" ON public.wallets
    FOR UPDATE TO authenticated
    USING (public.has_wallet_role(id, ARRAY['OWNER']) OR public.is_system_admin())
    WITH CHECK (public.has_wallet_role(id, ARRAY['OWNER']) OR public.is_system_admin());

CREATE POLICY "wallets_delete" ON public.wallets
    FOR DELETE TO authenticated
    USING (public.has_wallet_role(id, ARRAY['OWNER']) OR public.is_system_admin());

-- ------------------------------------------------------------------------------
-- 3.3 WALLET_MEMBERS
-- ------------------------------------------------------------------------------
CREATE POLICY "wallet_members_select" ON public.wallet_members
    FOR SELECT TO authenticated
    USING (public.is_wallet_member(wallet_id) OR public.is_system_admin());

CREATE POLICY "wallet_members_insert" ON public.wallet_members
    FOR INSERT TO authenticated
    WITH CHECK (
        public.has_wallet_role(wallet_id, ARRAY['OWNER']) 
        OR public.is_system_admin()
        OR auth.uid() = user_id -- Cho phép khi tự thêm chính mình qua RPC tạo ví
    );

CREATE POLICY "wallet_members_update" ON public.wallet_members
    FOR UPDATE TO authenticated
    USING (public.has_wallet_role(wallet_id, ARRAY['OWNER']) OR public.is_system_admin())
    WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['OWNER']) OR public.is_system_admin());

CREATE POLICY "wallet_members_delete" ON public.wallet_members
    FOR DELETE TO authenticated
    USING (
        public.has_wallet_role(wallet_id, ARRAY['OWNER']) 
        OR user_id = auth.uid() 
        OR public.is_system_admin()
    );

-- ------------------------------------------------------------------------------
-- 3.4 WALLET_INVITATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "wallet_invitations_select" ON public.wallet_invitations
    FOR SELECT TO authenticated
    USING (
        invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        OR public.has_wallet_role(wallet_id, ARRAY['OWNER'])
        OR public.is_system_admin()
    );

CREATE POLICY "wallet_invitations_insert" ON public.wallet_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        public.has_wallet_role(wallet_id, ARRAY['OWNER'])
        OR public.is_system_admin()
    );

CREATE POLICY "wallet_invitations_update" ON public.wallet_invitations
    FOR UPDATE TO authenticated
    USING (
        invitee_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
        OR public.has_wallet_role(wallet_id, ARRAY['OWNER'])
        OR public.is_system_admin()
    );

CREATE POLICY "wallet_invitations_delete" ON public.wallet_invitations
    FOR DELETE TO authenticated
    USING (
        public.has_wallet_role(wallet_id, ARRAY['OWNER'])
        OR public.is_system_admin()
    );

-- ------------------------------------------------------------------------------
-- 3.5 CATEGORIES
-- ------------------------------------------------------------------------------
CREATE POLICY "categories_select" ON public.categories
    FOR SELECT TO authenticated
    USING (
        wallet_id IS NULL 
        OR public.is_wallet_member(wallet_id) 
        OR public.is_system_admin()
    );

CREATE POLICY "categories_insert" ON public.categories
    FOR INSERT TO authenticated
    WITH CHECK (
        (wallet_id IS NOT NULL AND public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR']))
        OR (wallet_id IS NULL AND public.is_system_admin())
    );

CREATE POLICY "categories_update" ON public.categories
    FOR UPDATE TO authenticated
    USING (
        (wallet_id IS NOT NULL AND public.has_wallet_role(wallet_id, ARRAY['OWNER']))
        OR (wallet_id IS NULL AND public.is_system_admin())
    );

CREATE POLICY "categories_delete" ON public.categories
    FOR DELETE TO authenticated
    USING (
        (wallet_id IS NOT NULL AND public.has_wallet_role(wallet_id, ARRAY['OWNER']))
        OR (wallet_id IS NULL AND public.is_system_admin())
    );

-- ------------------------------------------------------------------------------
-- 3.6 TRANSACTIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "transactions_select" ON public.transactions
    FOR SELECT TO authenticated
    USING (public.is_wallet_member(wallet_id) OR public.is_system_admin());

CREATE POLICY "transactions_insert" ON public.transactions
    FOR INSERT TO authenticated
    WITH CHECK (
        public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR'])
        AND auth.uid() = created_by
    );

CREATE POLICY "transactions_update" ON public.transactions
    FOR UPDATE TO authenticated
    USING (public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR']))
    WITH CHECK (public.has_wallet_role(wallet_id, ARRAY['OWNER', 'EDITOR']));

CREATE POLICY "transactions_delete" ON public.transactions
    FOR DELETE TO authenticated
    USING (public.has_wallet_role(wallet_id, ARRAY['OWNER']) OR public.is_system_admin());

-- ------------------------------------------------------------------------------
-- 3.7 WALLET_TRANSFERS
-- ------------------------------------------------------------------------------
CREATE POLICY "wallet_transfers_select" ON public.wallet_transfers
    FOR SELECT TO authenticated
    USING (
        public.is_wallet_member(source_wallet_id) 
        OR public.is_wallet_member(destination_wallet_id)
        OR public.is_system_admin()
    );

CREATE POLICY "wallet_transfers_insert" ON public.wallet_transfers
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = created_by
        AND public.has_wallet_role(source_wallet_id, ARRAY['OWNER', 'EDITOR'])
        AND public.has_wallet_role(destination_wallet_id, ARRAY['OWNER', 'EDITOR'])
    );

-- ------------------------------------------------------------------------------
-- 3.8 USER_PREFERENCES & SYNC_OPERATIONS
-- ------------------------------------------------------------------------------
CREATE POLICY "user_preferences_owner_all" ON public.user_preferences
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "sync_operations_owner_all" ON public.sync_operations
    FOR ALL TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- 3.9 AUDIT_LOGS
-- ------------------------------------------------------------------------------
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR public.is_system_admin());

CREATE POLICY "audit_logs_insert" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id OR public.is_system_admin());
