-- ==============================================================================
-- SEED SCRIPT: supabase/seed.sql
-- DESCRIPTION: Khởi tạo danh mục mặc định toàn hệ thống, tài khoản kiểm thử
--              (User A, User B, Admin) và các quỹ mẫu phục vụ phát triển.
-- ==============================================================================

-- ==============================================================================
-- 1. DANH MỤC THU / CHI MẶC ĐỊNH HỆ THỐNG (wallet_id IS NULL)
-- ==============================================================================
INSERT INTO public.categories (name, type, icon, color, is_default, is_active)
VALUES
    -- Danh mục Thu nhập (INCOME)
    ('Tiền lương', 'INCOME', 'briefcase', '#10B981', TRUE, TRUE),
    ('Tiền thưởng', 'INCOME', 'gift', '#3B82F6', TRUE, TRUE),
    ('Thu nhập phụ', 'INCOME', 'cash', '#6366F1', TRUE, TRUE),
    ('Tiền lãi / Đầu tư', 'INCOME', 'chart-bar', '#8B5CF6', TRUE, TRUE),
    ('Thu nhập khác', 'INCOME', 'plus-circle', '#14B8A6', TRUE, TRUE),

    -- Danh mục Chi tiêu (EXPENSE)
    ('Ăn uống', 'EXPENSE', 'utensils', '#EF4444', TRUE, TRUE),
    ('Đi lại / Xăng xe', 'EXPENSE', 'truck', '#F97316', TRUE, TRUE),
    ('Nhà cửa & Hóa đơn', 'EXPENSE', 'home', '#F59E0B', TRUE, TRUE),
    ('Mua sắm cá nhân', 'EXPENSE', 'shopping-bag', '#EC4899', TRUE, TRUE),
    ('Sức khỏe & Y tế', 'EXPENSE', 'heart', '#06B6D4', TRUE, TRUE),
    ('Giáo dục & Học tập', 'EXPENSE', 'academic-cap', '#3B82F6', TRUE, TRUE),
    ('Giải trí & Du lịch', 'EXPENSE', 'film', '#84CC16', TRUE, TRUE),
    ('Chi phí khác', 'EXPENSE', 'minus-circle', '#6B7280', TRUE, TRUE),

    -- Danh mục Nghiệp vụ đặc biệt (BOTH)
    ('Chuyển tiền', 'BOTH', 'arrows-right-left', '#64748B', TRUE, TRUE),
    ('Điều chỉnh số dư', 'BOTH', 'adjustments-horizontal', '#0EA5E9', TRUE, TRUE)
ON CONFLICT (wallet_id, name) DO NOTHING;

-- ==============================================================================
-- 2. TẠO TÀI KHOẢN MẪU AUTH.USERS VÀ PROFILES (Dành cho môi trường Local / Testing)
-- ==============================================================================

DO $$
DECLARE
    v_user_a_id UUID := '11111111-1111-4111-a111-111111111111'::UUID;
    v_user_b_id UUID := '22222222-2222-4222-a222-222222222222'::UUID;
    v_admin_id  UUID := '99999999-9999-4999-a999-999999999999'::UUID;
    v_shared_wallet_id UUID := '33333333-3333-4333-a333-333333333333'::UUID;
    v_wallet_a_id UUID := '44444444-4444-4444-a444-444444444444'::UUID;
    v_wallet_b_id UUID := '55555555-5555-4555-a555-555555555555'::UUID;
    v_cat_food_id UUID;
    v_cat_salary_id UUID;
BEGIN
    -- 2.1 Tạo tài khoản mẫu trong auth.users nếu đang chạy local Supabase
    -- Mật khẩu mặc định: 'Password123!' được mã hóa bằng crypt
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES 
    (
        v_user_a_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'usera@expense.local',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Người dùng A"}'::jsonb,
        now(), now()
    ),
    (
        v_user_b_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'userb@expense.local',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Người dùng B"}'::jsonb,
        now(), now()
    ),
    (
        v_admin_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'admin@expense.local',
        crypt('Password123!', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Quản trị hệ thống"}'::jsonb,
        now(), now()
    )
    ON CONFLICT (id) DO NOTHING;

    -- 2.2 Tạo / Cập nhật profiles
    INSERT INTO public.profiles (id, email, full_name, is_system_admin, is_active)
    VALUES 
        (v_user_a_id, 'usera@expense.local', 'Người dùng A', FALSE, TRUE),
        (v_user_b_id, 'userb@expense.local', 'Người dùng B', FALSE, TRUE),
        (v_admin_id,  'admin@expense.local',  'Quản trị viên', TRUE,  TRUE)
    ON CONFLICT (id) DO UPDATE SET 
        is_system_admin = EXCLUDED.is_system_admin,
        full_name = EXCLUDED.full_name;

    -- 2.3 Tạo Quỹ cá nhân của User A
    INSERT INTO public.wallets (id, name, description, type, currency, initial_balance, created_by)
    VALUES (v_wallet_a_id, 'Ví cá nhân User A', 'Quỹ chi tiêu riêng của User A', 'PERSONAL', 'VND', 5000000.00, v_user_a_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallet_members (wallet_id, user_id, role)
    VALUES (v_wallet_a_id, v_user_a_id, 'OWNER')
    ON CONFLICT (wallet_id, user_id) DO NOTHING;

    -- 2.4 Tạo Quỹ cá nhân của User B
    INSERT INTO public.wallets (id, name, description, type, currency, initial_balance, created_by)
    VALUES (v_wallet_b_id, 'Ví cá nhân User B', 'Quỹ chi tiêu riêng của User B', 'PERSONAL', 'VND', 3000000.00, v_user_b_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallet_members (wallet_id, user_id, role)
    VALUES (v_wallet_b_id, v_user_b_id, 'OWNER')
    ON CONFLICT (wallet_id, user_id) DO NOTHING;

    -- 2.5 Tạo Quỹ chung (Shared Wallet)
    -- User A là OWNER, User B là EDITOR
    INSERT INTO public.wallets (id, name, description, type, currency, initial_balance, created_by)
    VALUES (v_shared_wallet_id, 'Quỹ sinh hoạt chung', 'Quỹ chung cho User A và User B', 'SHARED', 'VND', 10000000.00, v_user_a_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.wallet_members (wallet_id, user_id, role)
    VALUES 
        (v_shared_wallet_id, v_user_a_id, 'OWNER'),
        (v_shared_wallet_id, v_user_b_id, 'EDITOR')
    ON CONFLICT (wallet_id, user_id) DO NOTHING;

    -- 2.6 Thêm một vài giao dịch mẫu cho Quỹ chung
    SELECT id INTO v_cat_food_id FROM public.categories WHERE name = 'Ăn uống' AND wallet_id IS NULL LIMIT 1;
    SELECT id INTO v_cat_salary_id FROM public.categories WHERE name = 'Tiền lương' AND wallet_id IS NULL LIMIT 1;

    IF v_cat_food_id IS NOT NULL THEN
        INSERT INTO public.transactions (
            wallet_id, category_id, type, amount, transaction_date, description, created_by, idempotency_key
        )
        VALUES 
            (v_shared_wallet_id, v_cat_food_id, 'EXPENSE', 150000.00, now() - INTERVAL '1 day', 'Đi siêu thị mua thức ăn', v_user_a_id, 'seed_tx_001'),
            (v_shared_wallet_id, v_cat_food_id, 'EXPENSE', 85000.00, now(), 'Ăn trưa cơm văn phòng', v_user_b_id, 'seed_tx_002')
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

END $$;
