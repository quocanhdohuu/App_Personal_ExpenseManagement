import { Transaction, WalletTransfer } from '../types/database.types';
import { 
  CreateTransactionInput, 
  EditTransactionInput, 
  TransferFundsInput, 
  TransactionFilterOptions, 
  SuggestedDescription,
  TransactionWithDetails
} from '../types/transaction.types';
import { supabase, isSupabaseConfigured, getCurrentAuthUser, getAccessibleLocalWalletIds, CURRENT_TEST_USER, SECONDARY_TEST_USER } from './supabase';
import { categoryService, INITIAL_DEFAULT_CATEGORIES } from './categoryService';
import { syncEngine } from './syncEngine';

const LOCAL_STORAGE_KEY_TRANSACTIONS = 'app_expense_transactions_v2';
const LOCAL_STORAGE_KEY_TRANSFERS = 'app_expense_transfers_v2';

function getInitialMockTransactions(): Transaction[] {
  const foodCat = INITIAL_DEFAULT_CATEGORIES.find((c) => c.name === 'Ăn uống');
  const sharedWalletId = '33333333-3333-4333-a333-333333333333';

  return [
    {
      id: 'tx-seed-1',
      wallet_id: sharedWalletId,
      category_id: foodCat?.id || 'cat-exp-1',
      type: 'EXPENSE',
      amount: 150000,
      transaction_date: new Date(Date.now() - 86400000 * 2).toISOString(),
      description: 'Đi siêu thị mua thức ăn',
      notes: 'Mua rau, thịt, gia vị nấu cơm cả tuần',
      created_by: CURRENT_TEST_USER.id,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      version: 1,
      idempotency_key: 'seed_tx_001',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      category: foodCat,
      creator: CURRENT_TEST_USER,
    },
    {
      id: 'tx-seed-2',
      wallet_id: sharedWalletId,
      category_id: foodCat?.id || 'cat-exp-1',
      type: 'EXPENSE',
      amount: 85000,
      transaction_date: new Date(Date.now() - 86400000 * 1).toISOString(),
      description: 'Ăn trưa cơm văn phòng',
      notes: 'User B ăn trưa cùng đồng nghiệp',
      created_by: SECONDARY_TEST_USER.id,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      version: 1,
      idempotency_key: 'seed_tx_002',
      created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
      category: foodCat,
      creator: SECONDARY_TEST_USER,
    },
  ];
}

export function loadLocalTransactions(): Transaction[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_TRANSACTIONS);
  if (!data) {
    const initial = getInitialMockTransactions();
    localStorage.setItem(LOCAL_STORAGE_KEY_TRANSACTIONS, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return getInitialMockTransactions();
  }
}

export function saveLocalTransactions(transactions: Transaction[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
}

function loadLocalTransfers(): WalletTransfer[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_TRANSFERS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveLocalTransfers(transfers: WalletTransfer[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_TRANSFERS, JSON.stringify(transfers));
}

export const transactionService = {
  /**
   * Lấy danh sách giao dịch có lọc, tìm kiếm và sắp xếp
   */
  async getTransactions(options: TransactionFilterOptions = {}): Promise<TransactionWithDetails[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('transactions')
          .select('*, category:categories(*), creator:profiles(*), wallet:wallets(name)')
          .eq('is_deleted', false);

        if (options.walletId) query = query.eq('wallet_id', options.walletId);
        if (options.categoryId) query = query.eq('category_id', options.categoryId);
        if (options.type && options.type !== 'ALL') query = query.eq('type', options.type);
        if (options.startDate) query = query.gte('transaction_date', options.startDate);
        if (options.endDate) query = query.lte('transaction_date', options.endDate);
        if (options.searchQuery) query = query.ilike('description', `%${options.searchQuery}%`);

        if (options.sortBy === 'date_asc') query = query.order('transaction_date', { ascending: true });
        else if (options.sortBy === 'amount_desc') query = query.order('amount', { ascending: false });
        else if (options.sortBy === 'amount_asc') query = query.order('amount', { ascending: true });
        else query = query.order('transaction_date', { ascending: false });

        const { data, error } = await query;
        if (!error && data) {
          return data.map((t: any) => ({
            ...t,
            wallet_name: t.wallet?.name,
          }));
        }
      } catch (err) {
        console.warn('Supabase getTransactions failed, using local fallback:', err);
      }
    }

    // Local Filter Engine (Lọc theo quyền truy cập quỹ của user hiện tại)
    const accessibleIds = getAccessibleLocalWalletIds();
    let list = loadLocalTransactions().filter((t) => {
      if (t.is_deleted) return false;
      if (accessibleIds !== null && !accessibleIds.has(t.wallet_id)) return false;
      return true;
    });

    if (options.walletId) {
      list = list.filter((t) => t.wallet_id === options.walletId);
    }
    if (options.categoryId) {
      list = list.filter((t) => t.category_id === options.categoryId);
    }
    if (options.type && options.type !== 'ALL') {
      list = list.filter((t) => t.type === options.type);
    }
    if (options.startDate) {
      const start = new Date(options.startDate).getTime();
      list = list.filter((t) => new Date(t.transaction_date).getTime() >= start);
    }
    if (options.endDate) {
      const end = new Date(options.endDate).getTime();
      list = list.filter((t) => new Date(t.transaction_date).getTime() <= end);
    }
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.toLowerCase();
      list = list.filter(
        (t) =>
          t.description.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    // Sorting
    list.sort((a, b) => {
      if (options.sortBy === 'date_asc') {
        return new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
      }
      if (options.sortBy === 'amount_desc') {
        return b.amount - a.amount;
      }
      if (options.sortBy === 'amount_asc') {
        return a.amount - b.amount;
      }
      // Default date_desc
      return new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime();
    });

    return list;
  },

  /**
   * Thêm mới giao dịch thu / chi / điều chỉnh
   */
  async createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    const currentUser = getCurrentAuthUser();
    const currentUserId = currentUser.id;
    const categories = await categoryService.getCategories(input.wallet_id);
    const category = categories.find((c) => c.id === input.category_id);

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      wallet_id: input.wallet_id,
      category_id: input.category_id,
      type: input.type,
      amount: input.amount,
      transaction_date: input.transaction_date,
      description: input.description,
      notes: input.notes || null,
      created_by: currentUserId,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      version: 1,
      idempotency_key: `tx_${crypto.randomUUID()}_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category: category,
      creator: currentUser,
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .insert([newTx])
          .select('*, category:categories(*), creator:profiles(*)')
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase createTransaction failed, saving locally:', err);
      }
    }

    const transactions = loadLocalTransactions();
    transactions.unshift(newTx);
    saveLocalTransactions(transactions);

    // Ghi vào Sync Queue để đồng bộ khi offline hoặc lên máy chủ
    await syncEngine.enqueue('CREATE', 'TRANSACTION', newTx.id, newTx, 1);

    return newTx;
  },

  /**
   * Sửa giao dịch
   */
  async updateTransaction(id: string, input: EditTransactionInput): Promise<Transaction> {
    const categories = await categoryService.getCategories();
    const category = categories.find((c) => c.id === input.category_id);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('transactions')
          .update({
            category_id: input.category_id,
            type: input.type,
            amount: input.amount,
            transaction_date: input.transaction_date,
            description: input.description,
            notes: input.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*, category:categories(*), creator:profiles(*)')
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase updateTransaction failed, updating locally:', err);
      }
    }

    const transactions = loadLocalTransactions();
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Không tìm thấy giao dịch');

    transactions[idx] = {
      ...transactions[idx],
      category_id: input.category_id,
      type: input.type,
      amount: input.amount,
      transaction_date: input.transaction_date,
      description: input.description,
      notes: input.notes || null,
      category: category || transactions[idx].category,
      version: transactions[idx].version + 1,
      updated_at: new Date().toISOString(),
    };

    saveLocalTransactions(transactions);

    // Ghi vào Sync Queue với base_version để kiểm tra Optimistic Concurrency Control
    await syncEngine.enqueue(
      'UPDATE',
      'TRANSACTION',
      id,
      input,
      transactions[idx].version - 1
    );

    return transactions[idx];
  },

  /**
   * XÓA MỀM GIAO DỊCH (Soft Delete)
   * Giữ lại bản ghi trong DB/Storage để phục vụ audit log và sync engine,
   * đánh dấu is_deleted = true và loại trừ khỏi tính toán số dư.
   */
  async softDeleteTransaction(id: string): Promise<void> {
    const currentUser = getCurrentAuthUser();
    const currentUserId = currentUser.id;
    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('transactions')
          .update({
            is_deleted: true,
            deleted_at: now,
            deleted_by: currentUserId,
          })
          .eq('id', id);

        if (!error) return;
      } catch (err) {
        console.warn('Supabase softDeleteTransaction failed, performing locally:', err);
      }
    }

    const transactions = loadLocalTransactions();
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Không tìm thấy giao dịch');

    transactions[idx] = {
      ...transactions[idx],
      is_deleted: true,
      deleted_at: now,
      deleted_by: currentUserId,
      version: transactions[idx].version + 1,
      updated_at: now,
    };

    saveLocalTransactions(transactions);

    // Ghi vào Sync Queue để đồng bộ xóa mềm
    await syncEngine.enqueue(
      'DELETE',
      'TRANSACTION',
      id,
      { is_deleted: true, deleted_at: now, deleted_by: currentUserId },
      transactions[idx].version - 1
    );
  },

  /**
   * CHUYỂN TIỀN NGUYÊN TỬ GIỮA 2 QUỸ (Atomic Wallet Transfer)
   * 1. Trừ tiền ở Quỹ nguồn (EXPENSE)
   * 2. Cộng tiền ở Quỹ đích (INCOME)
   * 3. Ghi bản ghi liên kết vào wallet_transfers
   */
  async transferFunds(input: TransferFundsInput): Promise<{
    sourceTx: Transaction;
    destTx: Transaction;
    transfer: WalletTransfer;
  }> {
    const currentUser = getCurrentAuthUser();
    const currentUserId = currentUser.id;
    const now = new Date().toISOString();
    const idempotencyKey = `transfer_${crypto.randomUUID()}_${Date.now()}`;

    // Tìm danh mục "Chuyển tiền"
    const categories = await categoryService.getCategories();
    let transferCat = categories.find((c) => c.name === 'Chuyển tiền');
    if (!transferCat) {
      transferCat = await categoryService.createCategory({
        name: 'Chuyển tiền',
        type: 'BOTH',
        icon: 'arrows-right-left',
        color: '#64748B',
      });
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('transfer_wallet_funds', {
          p_source_wallet_id: input.source_wallet_id,
          p_destination_wallet_id: input.destination_wallet_id,
          p_amount: input.amount,
          p_description: input.description,
          p_idempotency_key: idempotencyKey,
        });

        if (!error && data) {
          // Thành công qua RPC
          console.log('RPC transfer successful:', data);
        }
      } catch (err) {
        console.warn('Supabase transfer_wallet_funds RPC failed, executing locally:', err);
      }
    }

    // 1. Giao dịch trừ tiền ví nguồn
    const sourceTx: Transaction = {
      id: crypto.randomUUID(),
      wallet_id: input.source_wallet_id,
      category_id: transferCat.id,
      type: 'EXPENSE',
      amount: input.amount,
      transaction_date: input.transfer_date,
      description: `Chuyển đi: ${input.description}`,
      notes: `Chuyển tiền sang quỹ ID: ${input.destination_wallet_id}`,
      created_by: currentUserId,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      version: 1,
      idempotency_key: `${idempotencyKey}_OUT`,
      created_at: now,
      updated_at: now,
      category: transferCat,
      creator: currentUser,
    };

    // 2. Giao dịch cộng tiền ví đích
    const destTx: Transaction = {
      id: crypto.randomUUID(),
      wallet_id: input.destination_wallet_id,
      category_id: transferCat.id,
      type: 'INCOME',
      amount: input.amount,
      transaction_date: input.transfer_date,
      description: `Nhận từ: ${input.description}`,
      notes: `Nhận tiền từ quỹ ID: ${input.source_wallet_id}`,
      created_by: currentUserId,
      is_deleted: false,
      deleted_at: null,
      deleted_by: null,
      version: 1,
      idempotency_key: `${idempotencyKey}_IN`,
      created_at: now,
      updated_at: now,
      category: transferCat,
      creator: currentUser,
    };

    // 3. Bản ghi chuyển tiền liên kết
    const transferRecord: WalletTransfer = {
      id: crypto.randomUUID(),
      source_wallet_id: input.source_wallet_id,
      destination_wallet_id: input.destination_wallet_id,
      amount: input.amount,
      transfer_date: input.transfer_date,
      description: input.description,
      source_transaction_id: sourceTx.id,
      destination_transaction_id: destTx.id,
      created_by: currentUserId,
      created_at: now,
    };

    // Lưu nguyên tử vào Local Storage
    const transactions = loadLocalTransactions();
    transactions.unshift(destTx);
    transactions.unshift(sourceTx);
    saveLocalTransactions(transactions);

    // Ghi vào Sync Queue cho 2 giao dịch chuyển quỹ nguyên tử
    await syncEngine.enqueue('CREATE', 'TRANSACTION', sourceTx.id, sourceTx, 1);
    await syncEngine.enqueue('CREATE', 'TRANSACTION', destTx.id, destTx, 1);

    const transfers = loadLocalTransfers();
    transfers.unshift(transferRecord);
    saveLocalTransfers(transfers);

    return {
      sourceTx,
      destTx,
      transfer: transferRecord,
    };
  },

  /**
   * GỢI Ý LÝ DO GIAO DỊCH THÔNG MINH
   * Đếm tần suất các lý do chi tiêu đã nhập trước đó trong cùng Quỹ và Danh mục
   */
  async getSuggestedDescriptions(walletId: string, categoryId?: string, limit: number = 6): Promise<SuggestedDescription[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('get_suggested_descriptions', {
          p_wallet_id: walletId,
          p_category_id: categoryId || null,
          p_limit: limit,
        });

        if (!error && data) return data;
      } catch (err) {
        console.warn('RPC suggestions failed, aggregating locally:', err);
      }
    }

    const transactions = loadLocalTransactions().filter(
      (t) => !t.is_deleted && t.wallet_id === walletId && (!categoryId || t.category_id === categoryId)
    );

    const freqMap = new Map<string, number>();
    for (const tx of transactions) {
      const desc = tx.description.trim();
      if (desc) {
        freqMap.set(desc, (freqMap.get(desc) || 0) + 1);
      }
    }

    const suggestions: SuggestedDescription[] = [];
    freqMap.forEach((count, desc) => {
      suggestions.push({ description: desc, usage_count: count });
    });

    suggestions.sort((a, b) => b.usage_count - a.usage_count);
    return suggestions.slice(0, limit);
  },
};
