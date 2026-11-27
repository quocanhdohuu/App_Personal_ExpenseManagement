-- ==============================================================================
-- MIGRATION: 20261126000003_rpc_and_business_logic.sql
-- DESCRIPTION: Các hàm Stored Procedures / RPC cốt lõi:
--              1. get_wallet_balance_summary: Tính toán số dư động chuẩn xác
--              2. create_wallet_with_owner: Tạo quỹ và gán quyền OWNER nguyên tử
--              3. transfer_wallet_funds: Chuyển tiền giữa 2 quỹ nguyên tử
--              4. get_suggested_descriptions: Gợi ý lý do chi tiêu thông minh
--              5. sync_batch_transactions: Xử lý đồng bộ hàng đợi ngoại tuyến (OCC, Idempotency)
-- ==============================================================================

-- ==============================================================================
-- 1. HÀM TÍNH TOÁN SỐ DƯ QUỸ (DYNAMIC BALANCE CALCULATION)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_wallet_balance_summary(p_wallet_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_initial_balance NUMERIC(15, 2);
    v_total_income NUMERIC(15, 2) := 0;
    v_total_expense NUMERIC(15, 2) := 0;
    v_total_adjustment NUMERIC(15, 2) := 0;
    v_current_balance NUMERIC(15, 2) := 0;
    v_tx_count BIGINT := 0;
    v_is_archived BOOLEAN;
    v_wallet_name VARCHAR(100);
BEGIN
    -- 1. Kiểm tra quyền truy cập (phải là thành viên quỹ hoặc admin hệ thống)
    IF NOT (public.is_wallet_member(p_wallet_id) OR public.is_system_admin()) THEN
        RAISE EXCEPTION 'Access denied. You are not a member of wallet %', p_wallet_id;
    END IF;

    -- 2. Lấy thông tin ví & số dư ban đầu
    SELECT name, initial_balance, is_archived 
    INTO v_wallet_name, v_initial_balance, v_is_archived
    FROM public.wallets
    WHERE id = p_wallet_id;

    IF v_initial_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet % not found', p_wallet_id;
    END IF;

    -- 3. Tính tổng thu (INCOME)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_income
    FROM public.transactions
    WHERE wallet_id = p_wallet_id AND type = 'INCOME' AND is_deleted = FALSE;

    -- 4. Tính tổng chi (EXPENSE)
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expense
    FROM public.transactions
    WHERE wallet_id = p_wallet_id AND type = 'EXPENSE' AND is_deleted = FALSE;

    -- 5. Tính điều chỉnh (ADJUSTMENT)
    -- Nếu loại ADJUSTMENT: số tiền dương được cộng vào quỹ
    SELECT COALESCE(SUM(amount), 0) INTO v_total_adjustment
    FROM public.transactions
    WHERE wallet_id = p_wallet_id AND type = 'ADJUSTMENT' AND is_deleted = FALSE;

    -- 6. Đếm số lượng giao dịch hoạt động
    SELECT COUNT(*) INTO v_tx_count
    FROM public.transactions
    WHERE wallet_id = p_wallet_id AND is_deleted = FALSE;

    -- 7. Áp dụng công thức số dư chuẩn mực:
    -- Số dư = Số dư ban đầu + Tổng thu - Tổng chi + Điều chỉnh
    v_current_balance := v_initial_balance + v_total_income - v_total_expense + v_total_adjustment;

    RETURN jsonb_build_object(
        'wallet_id', p_wallet_id,
        'wallet_name', v_wallet_name,
        'is_archived', v_is_archived,
        'initial_balance', v_initial_balance,
        'total_income', v_total_income,
        'total_expense', v_total_expense,
        'total_adjustment', v_total_adjustment,
        'current_balance', v_current_balance,
        'transaction_count', v_tx_count
    );
END;
$$;

-- ==============================================================================
-- 2. HÀM TẠO QUỸ KÈM GÁN QUYỀN OWNER NGUYÊN TỬ
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_wallet_with_owner(
    p_name VARCHAR(100),
    p_description TEXT DEFAULT NULL,
    p_type VARCHAR(20) DEFAULT 'PERSONAL',
    p_currency VARCHAR(10) DEFAULT 'VND',
    p_initial_balance NUMERIC(15, 2) DEFAULT 0.00
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_wallet_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_type NOT IN ('PERSONAL', 'SHARED') THEN
        RAISE EXCEPTION 'Invalid wallet type. Must be PERSONAL or SHARED.';
    END IF;

    -- 1. Tạo ví
    INSERT INTO public.wallets (
        name, description, type, currency, initial_balance, created_by
    )
    VALUES (
        p_name, p_description, p_type, COALESCE(p_currency, 'VND'), COALESCE(p_initial_balance, 0), v_user_id
    )
    RETURNING id INTO v_wallet_id;

    -- 2. Gán người tạo làm OWNER
    INSERT INTO public.wallet_members (
        wallet_id, user_id, role
    )
    VALUES (
        v_wallet_id, v_user_id, 'OWNER'
    );

    -- 3. Ghi audit log
    INSERT INTO public.audit_logs (
        user_id, action, entity_name, entity_id, new_values
    )
    VALUES (
        v_user_id, 'CREATE_WALLET', 'wallets', v_wallet_id,
        jsonb_build_object('name', p_name, 'type', p_type, 'initial_balance', p_initial_balance)
    );

    RETURN v_wallet_id;
END;
$$;

-- ==============================================================================
-- 3. HÀM CHUYỂN TIỀN NGUYÊN TỬ GIỮA 2 QUỸ (ATOMIC TRANSFER)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.transfer_wallet_funds(
    p_source_wallet_id UUID,
    p_destination_wallet_id UUID,
    p_amount NUMERIC(15, 2),
    p_description VARCHAR(255),
    p_idempotency_key VARCHAR(100)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_source_role VARCHAR;
    v_dest_role VARCHAR;
    v_src_archived BOOLEAN;
    v_dest_archived BOOLEAN;
    v_transfer_cat_id UUID;
    v_source_tx_id UUID;
    v_dest_tx_id UUID;
    v_transfer_id UUID;
BEGIN
    -- 1. Kiểm tra xác thực
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Transfer amount must be greater than 0';
    END IF;

    IF p_source_wallet_id = p_destination_wallet_id THEN
        RAISE EXCEPTION 'Cannot transfer funds to the same wallet';
    END IF;

    -- 2. Kiểm tra trạng thái đóng/mở ví
    SELECT is_archived INTO v_src_archived FROM public.wallets WHERE id = p_source_wallet_id;
    SELECT is_archived INTO v_dest_archived FROM public.wallets WHERE id = p_destination_wallet_id;

    IF v_src_archived IS TRUE OR v_dest_archived IS TRUE THEN
        RAISE EXCEPTION 'Cannot transfer funds to or from an archived wallet';
    END IF;

    -- 3. Kiểm tra quyền của người dùng (phải là OWNER hoặc EDITOR trên cả 2 ví)
    SELECT role INTO v_source_role FROM public.wallet_members WHERE wallet_id = p_source_wallet_id AND user_id = v_user_id;
    SELECT role INTO v_dest_role FROM public.wallet_members WHERE wallet_id = p_destination_wallet_id AND user_id = v_user_id;

    IF NOT (v_source_role IN ('OWNER', 'EDITOR') OR public.is_system_admin()) THEN
        RAISE EXCEPTION 'Permission denied on source wallet %', p_source_wallet_id;
    END IF;

    IF NOT (v_dest_role IN ('OWNER', 'EDITOR') OR public.is_system_admin()) THEN
        RAISE EXCEPTION 'Permission denied on destination wallet %', p_destination_wallet_id;
    END IF;

    -- 4. Tìm hoặc tự động tạo danh mục "Chuyển tiền" hệ thống
    SELECT id INTO v_transfer_cat_id 
    FROM public.categories 
    WHERE name = 'Chuyển tiền' AND wallet_id IS NULL 
    LIMIT 1;

    IF v_transfer_cat_id IS NULL THEN
        INSERT INTO public.categories (name, type, icon, is_default, is_active)
        VALUES ('Chuyển tiền', 'BOTH', 'arrows-right-left', TRUE, TRUE)
        RETURNING id INTO v_transfer_cat_id;
    END IF;

    -- 5. Tạo giao dịch trừ tiền ở Quỹ nguồn (EXPENSE)
    INSERT INTO public.transactions (
        wallet_id, category_id, type, amount, transaction_date,
        description, notes, created_by, idempotency_key
    )
    VALUES (
        p_source_wallet_id, v_transfer_cat_id, 'EXPENSE', p_amount, timezone('utc'::text, now()),
        'Chuyển tiền đi: ' || COALESCE(p_description, 'Chuyển quỹ'),
        'Đến quỹ: ' || p_destination_wallet_id::text,
        v_user_id,
        p_idempotency_key || '_OUT'
    )
    RETURNING id INTO v_source_tx_id;

    -- 6. Tạo giao dịch cộng tiền ở Quỹ đích (INCOME)
    INSERT INTO public.transactions (
        wallet_id, category_id, type, amount, transaction_date,
        description, notes, created_by, idempotency_key
    )
    VALUES (
        p_destination_wallet_id, v_transfer_cat_id, 'INCOME', p_amount, timezone('utc'::text, now()),
        'Nhận tiền từ: ' || COALESCE(p_description, 'Chuyển quỹ'),
        'Từ quỹ: ' || p_source_wallet_id::text,
        v_user_id,
        p_idempotency_key || '_IN'
    )
    RETURNING id INTO v_dest_tx_id;

    -- 7. Ghi bản ghi wallet_transfers liên kết nguyên tử
    INSERT INTO public.wallet_transfers (
        source_wallet_id, destination_wallet_id, amount, transfer_date,
        description, source_transaction_id, destination_transaction_id, created_by
    )
    VALUES (
        p_source_wallet_id, p_destination_wallet_id, p_amount, timezone('utc'::text, now()),
        COALESCE(p_description, 'Chuyển quỹ'),
        v_source_tx_id, v_dest_tx_id, v_user_id
    )
    RETURNING id INTO v_transfer_id;

    -- 8. Ghi audit log
    INSERT INTO public.audit_logs (
        user_id, action, entity_name, entity_id, new_values
    )
    VALUES (
        v_user_id, 'TRANSFER_FUNDS', 'wallet_transfers', v_transfer_id,
        jsonb_build_object(
            'source_wallet_id', p_source_wallet_id,
            'destination_wallet_id', p_destination_wallet_id,
            'amount', p_amount,
            'source_transaction_id', v_source_tx_id,
            'destination_transaction_id', v_dest_tx_id
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'transfer_id', v_transfer_id,
        'source_transaction_id', v_source_tx_id,
        'destination_transaction_id', v_dest_tx_id,
        'amount', p_amount
    );
END;
$$;

-- ==============================================================================
-- 4. HÀM GỢI Ý LÝ DO GIAO DỊCH THÔNG MINH (SMART DESCRIPTION SUGGESTIONS)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_suggested_descriptions(
    p_wallet_id UUID,
    p_category_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    description VARCHAR,
    usage_count BIGINT,
    last_used TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Kiểm tra quyền xem ví
    IF NOT (public.is_wallet_member(p_wallet_id) OR public.is_system_admin()) THEN
        RAISE EXCEPTION 'Access denied to wallet %', p_wallet_id;
    END IF;

    RETURN QUERY
    SELECT 
        t.description,
        COUNT(*) AS usage_count,
        MAX(t.transaction_date) AS last_used
    FROM public.transactions t
    WHERE t.wallet_id = p_wallet_id
      AND (p_category_id IS NULL OR t.category_id = p_category_id)
      AND t.is_deleted = FALSE
    GROUP BY t.description
    ORDER BY usage_count DESC, last_used DESC
    LIMIT p_limit;
END;
$$;

-- ==============================================================================
-- 5. HÀM XỬ LÝ ĐỒNG BỘ BATCH TỪ OFFLINE SYNC QUEUE (SYNC ENGINE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_batch_transactions(
    p_device_id VARCHAR(100),
    p_operations JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_item JSONB;
    v_results JSONB := '[]'::jsonb;
    v_op_id VARCHAR(100);
    v_op_type VARCHAR(20);
    v_entity_id UUID;
    v_wallet_id UUID;
    v_base_version INT;
    v_current_version INT;
    v_has_permission BOOLEAN;
    v_existing_tx RECORD;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_operations)
    LOOP
        v_op_id := v_item->>'id';
        v_op_type := v_item->>'operation';
        v_entity_id := (v_item->>'entity_id')::UUID;
        v_wallet_id := (v_item->'payload'->>'wallet_id')::UUID;
        v_base_version := COALESCE((v_item->>'base_version')::INT, 1);

        -- Kiểm tra nếu client_operation_id đã từng xử lý thành công (Idempotency)
        IF EXISTS (SELECT 1 FROM public.sync_operations WHERE client_operation_id = v_op_id AND status = 'SUCCESS') THEN
            v_results := v_results || jsonb_build_object(
                'id', v_op_id,
                'entity_id', v_entity_id,
                'status', 'SUCCESS',
                'message', 'Already processed'
            );
            CONTINUE;
        END IF;

        -- 1. THAO TÁC CREATE (Tạo giao dịch)
        IF v_op_type = 'CREATE' THEN
            -- Kiểm tra quyền OWNER hoặc EDITOR trên ví
            v_has_permission := public.has_wallet_role(v_wallet_id, ARRAY['OWNER', 'EDITOR']) OR public.is_system_admin();
            
            IF NOT v_has_permission THEN
                -- Thu hồi quyền khi offline
                INSERT INTO public.sync_operations (user_id, device_id, client_operation_id, entity_name, entity_id, operation_type, status, error_message)
                VALUES (v_user_id, p_device_id, v_op_id, 'TRANSACTION', v_entity_id, 'CREATE', 'FAILED', 'PERMISSION_REVOKED');

                v_results := v_results || jsonb_build_object(
                    'id', v_op_id,
                    'entity_id', v_entity_id,
                    'status', 'FAILED_PERMISSION_REVOKED',
                    'error', 'User does not have permission on this wallet'
                );
                CONTINUE;
            END IF;

            -- Chèn an toàn hoặc bỏ qua nếu đã có (ON CONFLICT id)
            INSERT INTO public.transactions (
                id, wallet_id, category_id, type, amount, transaction_date,
                description, notes, created_by, idempotency_key, version
            )
            VALUES (
                v_entity_id,
                v_wallet_id,
                (v_item->'payload'->>'category_id')::UUID,
                v_item->'payload'->>'type',
                (v_item->'payload'->>'amount')::NUMERIC,
                (v_item->'payload'->>'transaction_date')::TIMESTAMPTZ,
                v_item->'payload'->>'description',
                v_item->'payload'->>'notes',
                v_user_id,
                v_item->'payload'->>'idempotency_key',
                1
            )
            ON CONFLICT (id) DO NOTHING;

            INSERT INTO public.sync_operations (user_id, device_id, client_operation_id, entity_name, entity_id, operation_type, status)
            VALUES (v_user_id, p_device_id, v_op_id, 'TRANSACTION', v_entity_id, 'CREATE', 'SUCCESS');

            v_results := v_results || jsonb_build_object(
                'id', v_op_id,
                'entity_id', v_entity_id,
                'status', 'SUCCESS',
                'version', 1
            );

        -- 2. THAO TÁC UPDATE (Cập nhật giao dịch)
        ELSIF v_op_type = 'UPDATE' THEN
            SELECT * INTO v_existing_tx FROM public.transactions WHERE id = v_entity_id;

            IF NOT FOUND THEN
                v_results := v_results || jsonb_build_object(
                    'id', v_op_id,
                    'entity_id', v_entity_id,
                    'status', 'FAILED',
                    'error', 'Transaction not found on server'
                );
                CONTINUE;
            END IF;

            -- Kiểm tra quyền
            IF NOT (public.has_wallet_role(v_existing_tx.wallet_id, ARRAY['OWNER', 'EDITOR']) OR public.is_system_admin()) THEN
                v_results := v_results || jsonb_build_object(
                    'id', v_op_id,
                    'entity_id', v_entity_id,
                    'status', 'FAILED_PERMISSION_REVOKED',
                    'error', 'Permission revoked'
                );
                CONTINUE;
            END IF;

            -- Kiểm tra OCC (Optimistic Concurrency Control)
            IF v_existing_tx.version > v_base_version THEN
                -- Xung đột phiên bản
                INSERT INTO public.sync_operations (user_id, device_id, client_operation_id, entity_name, entity_id, operation_type, status, error_message)
                VALUES (v_user_id, p_device_id, v_op_id, 'TRANSACTION', v_entity_id, 'UPDATE', 'CONFLICT', 'Version mismatch');

                v_results := v_results || jsonb_build_object(
                    'id', v_op_id,
                    'entity_id', v_entity_id,
                    'status', 'CONFLICT',
                    'server_version', v_existing_tx.version,
                    'server_record', row_to_json(v_existing_tx)
                );
                CONTINUE;
            END IF;

            -- Cập nhật thành công, tăng version
            UPDATE public.transactions
            SET category_id = COALESCE((v_item->'payload'->>'category_id')::UUID, category_id),
                type = COALESCE(v_item->'payload'->>'type', type),
                amount = COALESCE((v_item->'payload'->>'amount')::NUMERIC, amount),
                transaction_date = COALESCE((v_item->'payload'->>'transaction_date')::TIMESTAMPTZ, transaction_date),
                description = COALESCE(v_item->'payload'->>'description', description),
                notes = COALESCE(v_item->'payload'->>'notes', notes),
                version = version + 1
            WHERE id = v_entity_id;

            INSERT INTO public.sync_operations (user_id, device_id, client_operation_id, entity_name, entity_id, operation_type, status)
            VALUES (v_user_id, p_device_id, v_op_id, 'TRANSACTION', v_entity_id, 'UPDATE', 'SUCCESS');

            v_results := v_results || jsonb_build_object(
                'id', v_op_id,
                'entity_id', v_entity_id,
                'status', 'SUCCESS',
                'version', v_existing_tx.version + 1
            );

        -- 3. THAO TÁC DELETE (Xóa mềm giao dịch)
        ELSIF v_op_type = 'DELETE' THEN
            SELECT * INTO v_existing_tx FROM public.transactions WHERE id = v_entity_id;

            IF FOUND THEN
                IF NOT (public.has_wallet_role(v_existing_tx.wallet_id, ARRAY['OWNER', 'EDITOR']) OR public.is_system_admin()) THEN
                    v_results := v_results || jsonb_build_object(
                        'id', v_op_id,
                        'entity_id', v_entity_id,
                        'status', 'FAILED_PERMISSION_REVOKED'
                    );
                    CONTINUE;
                END IF;

                UPDATE public.transactions
                SET is_deleted = TRUE,
                    deleted_at = timezone('utc'::text, now()),
                    deleted_by = v_user_id,
                    version = version + 1
                WHERE id = v_entity_id;

                INSERT INTO public.sync_operations (user_id, device_id, client_operation_id, entity_name, entity_id, operation_type, status)
                VALUES (v_user_id, p_device_id, v_op_id, 'TRANSACTION', v_entity_id, 'DELETE', 'SUCCESS');
            END IF;

            v_results := v_results || jsonb_build_object(
                'id', v_op_id,
                'entity_id', v_entity_id,
                'status', 'SUCCESS'
            );
        END IF;
    END LOOP;

    RETURN v_results;
END;
$$;
