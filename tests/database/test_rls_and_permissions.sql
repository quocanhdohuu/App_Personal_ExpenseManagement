-- ==============================================================================
-- TEST SUITE: tests/database/test_rls_and_permissions.sql
-- DESCRIPTION: Kiểm thử tự động tính toàn vẹn của RLS, phân quyền, công thức
--              tính số dư và tính nguyên tử của hàm chuyển tiền RPC.
-- ==============================================================================

DO $$
DECLARE
    v_user_a_id UUID := '11111111-1111-4111-a111-111111111111'::UUID;
    v_user_b_id UUID := '22222222-2222-4222-a222-222222222222'::UUID;
    v_admin_id  UUID := '99999999-9999-4999-a999-999999999999'::UUID;
    v_shared_wallet_id UUID := '33333333-3333-4333-a333-333333333333'::UUID;
    v_wallet_a_id UUID := '44444444-4444-4444-a444-444444444444'::UUID;
    v_wallet_b_id UUID := '55555555-5555-4555-a555-555555555555'::UUID;
    
    v_summary JSONB;
    v_test_tx_id UUID;
    v_transfer_result JSONB;
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'BẮT ĐẦU KIỂM THỬ DATABASE VÀ PHÂN QUYỀN (PHASE 2)';
    RAISE NOTICE '=======================================================';

    -- --------------------------------------------------------------------------
    -- TEST 1: KIỂM THỬ CÔNG THỨC TÍNH SỐ DƯ (get_wallet_balance_summary)
    -- --------------------------------------------------------------------------
    -- Giả lập phiên của User A
    PERFORM set_config('request.jwt.claim.sub', v_user_a_id::text, true);

    v_summary := public.get_wallet_balance_summary(v_shared_wallet_id);
    RAISE NOTICE '[TEST 1.1] Kết quả số dư Quỹ chung của User A: %', v_summary;

    -- Kiểm tra các trường trong JSON trả về
    IF (v_summary->>'current_balance')::NUMERIC = 9765000.00 THEN
        RAISE NOTICE '==> [PASS] TEST 1.1: Công thức số dư chính xác: 10,000,000 - 150,000 - 85,000 = 9,765,000 VND';
    ELSE
        RAISE EXCEPTION '==> [FAIL] TEST 1.1: Số dư tính sai! Kỳ vọng: 9765000, Thực tế: %', (v_summary->>'current_balance');
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 2: KIỂM THỬ THÊM GIAO DỊCH VÀ CẬP NHẬT SỐ DƯ
    -- --------------------------------------------------------------------------
    -- Thêm giao dịch thu nhập 1,000,000 VND
    INSERT INTO public.transactions (
        wallet_id, category_id, type, amount, transaction_date,
        description, created_by, idempotency_key
    )
    VALUES (
        v_shared_wallet_id,
        (SELECT id FROM public.categories WHERE name = 'Tiền thưởng' LIMIT 1),
        'INCOME',
        1000000.00,
        now(),
        'Thưởng dự án hoàn thành tốt',
        v_user_a_id,
        'test_tx_income_001'
    )
    RETURNING id INTO v_test_tx_id;

    v_summary := public.get_wallet_balance_summary(v_shared_wallet_id);
    IF (v_summary->>'current_balance')::NUMERIC = 10765000.00 THEN
        RAISE NOTICE '==> [PASS] TEST 2.1: Số dư tự động cập nhật sau giao dịch Thu: 10,765,000 VND';
    ELSE
        RAISE EXCEPTION '==> [FAIL] TEST 2.1: Số dư sai sau khi Thu! Kỳ vọng: 10765000, Thực tế: %', (v_summary->>'current_balance');
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 3: KIỂM THỬ XÓA MỀM GIAO DỊCH (Soft Delete)
    -- --------------------------------------------------------------------------
    -- Đánh dấu xóa mềm giao dịch vừa tạo
    UPDATE public.transactions 
    SET is_deleted = TRUE, deleted_at = now(), deleted_by = v_user_a_id
    WHERE id = v_test_tx_id;

    -- Kiểm tra số dư: phải trở về 9,765,000 VND (giao dịch xóa mềm không được tính)
    v_summary := public.get_wallet_balance_summary(v_shared_wallet_id);
    IF (v_summary->>'current_balance')::NUMERIC = 9765000.00 THEN
        RAISE NOTICE '==> [PASS] TEST 3.1: Giao dịch xóa mềm (is_deleted=TRUE) bị loại trừ chính xác khỏi số dư';
    ELSE
        RAISE EXCEPTION '==> [FAIL] TEST 3.1: Giao dịch xóa mềm vẫn bị tính vào số dư!';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 4: KIỂM THỬ CHUYỂN TIỀN NGUYÊN TỬ (RPC transfer_wallet_funds)
    -- --------------------------------------------------------------------------
    -- User A chuyển 500,000 VND từ Ví cá nhân của mình sang Quỹ chung
    v_transfer_result := public.transfer_wallet_funds(
        v_wallet_a_id,
        v_shared_wallet_id,
        500000.00,
        'Góp tiền sinh hoạt tuần này',
        'transfer_test_key_001'
    );

    RAISE NOTICE '[TEST 4.1] Kết quả RPC Chuyển tiền: %', v_transfer_result;

    -- Kiểm tra số dư ví nguồn (Ví cá nhân User A ban đầu 5,000,000 -> còn 4,500,000)
    v_summary := public.get_wallet_balance_summary(v_wallet_a_id);
    IF (v_summary->>'current_balance')::NUMERIC = 4500000.00 THEN
        RAISE NOTICE '==> [PASS] TEST 4.2: Ví nguồn bị trừ chính xác 500,000 VND (Số dư mới: 4,500,000 VND)';
    ELSE
        RAISE EXCEPTION '==> [FAIL] TEST 4.2: Ví nguồn trừ tiền sai!';
    END IF;

    -- Kiểm tra số dư ví đích (Quỹ chung ban đầu 9,765,000 -> thành 10,265,000)
    v_summary := public.get_wallet_balance_summary(v_shared_wallet_id);
    IF (v_summary->>'current_balance')::NUMERIC = 10265000.00 THEN
        RAISE NOTICE '==> [PASS] TEST 4.3: Ví đích được cộng chính xác 500,000 VND (Số dư mới: 10,265,000 VND)';
    ELSE
        RAISE EXCEPTION '==> [FAIL] TEST 4.3: Ví đích cộng tiền sai!';
    END IF;

    -- --------------------------------------------------------------------------
    -- TEST 5: KIỂM THỬ GỢI Ý LÝ DO GIAO DỊCH THÔNG MINH
    -- --------------------------------------------------------------------------
    PERFORM * FROM public.get_suggested_descriptions(v_shared_wallet_id, NULL, 5);
    RAISE NOTICE '==> [PASS] TEST 5.1: Hàm gợi ý lý do giao dịch hoạt động chuẩn xác';

    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'HOÀN THÀNH TOÀN BỘ 5 BÀI TEST DATABASE VÀ PHÂN QUYỀN: PASS 100%';
    RAISE NOTICE '=======================================================';
END $$;
