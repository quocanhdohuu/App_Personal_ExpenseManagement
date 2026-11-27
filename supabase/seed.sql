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
        email_confirmed_at, confirmation_token, recovery_token,
        email_change_token_new, email_change,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    )
    VALUES 
    (
        v_admin_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        'admin@expense.local',
        crypt('Password123!', gen_salt('bf')),
        now(), '', '', '', '',
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Quản trị hệ thống"}'::jsonb,
        now(), now()
    )
    ON CONFLICT (id) DO UPDATE SET
        confirmation_token = COALESCE(auth.users.confirmation_token, ''),
        recovery_token = COALESCE(auth.users.recovery_token, ''),
        email_change_token_new = COALESCE(auth.users.email_change_token_new, ''),
        email_change = COALESCE(auth.users.email_change, '');

    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    )
    VALUES (
        v_admin_id,
        v_admin_id,
        'admin@expense.local',
        jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@expense.local'),
        'email',
        now(), now(), now()
    )
    ON CONFLICT DO NOTHING;

    -- 2.2 Tạo / Cập nhật profiles
    INSERT INTO public.profiles (id, email, full_name, is_system_admin, is_active)
    VALUES 
       (v_admin_id,  'admin@expense.local',  'Quản trị viên', TRUE,  TRUE)
    ON CONFLICT (id) DO UPDATE SET 
        is_system_admin = EXCLUDED.is_system_admin,
        full_name = EXCLUDED.full_name;

END $$;
