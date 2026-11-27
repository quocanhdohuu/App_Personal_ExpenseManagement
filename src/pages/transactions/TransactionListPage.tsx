import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  ArrowRightLeft, 
  Search, 
  ArrowUpRight, 
  ArrowDownRight, 
  SlidersHorizontal,
  Edit2, 
  Trash2, 
  Calendar,
  CreditCard,
  User,
  Wallet as WalletIcon
} from 'lucide-react';
import { transactionService } from '../../services/transactionService';
import { walletService } from '../../services/walletService';
import { categoryService } from '../../services/categoryService';
import { 
  TransactionWithDetails, 
  CreateTransactionInput, 
  TransferFundsInput, 
  TransactionFilterOptions 
} from '../../types/transaction.types';
import { WalletWithDetails } from '../../types/wallet.types';
import { Category, Transaction } from '../../types/database.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { TransactionFormModal } from '../../components/transaction/TransactionFormModal';
import { TransferFundsModal } from '../../components/transaction/TransferFundsModal';
import { useAuth } from '../../context/AuthContext';

export const TransactionListPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [allTransactionsForBalance, setAllTransactionsForBalance] = useState<TransactionWithDetails[]>([]);
  const [wallets, setWallets] = useState<WalletWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters State
  const [filters, setFilters] = useState<TransactionFilterOptions>({
    walletId: '',
    categoryId: '',
    type: 'ALL',
    searchQuery: '',
    sortBy: 'date_desc',
  });

  // Modals State
  const [isFormModalOpen, setIsFormModalOpen] = useState<boolean>(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const hasExtraFilter = Boolean(
        filters.searchQuery || filters.categoryId || (filters.type && filters.type !== 'ALL')
      );
      const [wList, cList, txList, fullTxList] = await Promise.all([
        walletService.getWallets(),
        categoryService.getCategories(),
        transactionService.getTransactions(filters),
        hasExtraFilter
          ? transactionService.getTransactions({ walletId: filters.walletId, sortBy: 'date_desc' })
          : Promise.resolve(null),
      ]);
      setWallets(wList);
      setCategories(cList);
      setTransactions(txList);
      setAllTransactionsForBalance(fullTxList ?? txList);
    } catch (err) {
      console.error('Error loading transactions data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Tính số dư của quỹ ngay tại thời điểm sau mỗi giao dịch
  const balanceAfterMap = React.useMemo(() => {
    const map = new Map<string, number>();
    const sourceList = allTransactionsForBalance.length > 0 ? allTransactionsForBalance : transactions;
    const byWallet = new Map<string, TransactionWithDetails[]>();
    for (const tx of sourceList) {
      const arr = byWallet.get(tx.wallet_id) || [];
      arr.push(tx);
      byWallet.set(tx.wallet_id, arr);
    }
    for (const [wId, list] of byWallet.entries()) {
      const wallet = wallets.find((w) => w.id === wId);
      let running = wallet ? wallet.initial_balance : 0;
      const sortedAsc = [...list].sort((a, b) => {
        const diff = new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime();
        return diff !== 0 ? diff : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      for (const tx of sortedAsc) {
        if (tx.type === 'INCOME' || tx.type === 'ADJUSTMENT') {
          running += tx.amount;
        } else if (tx.type === 'EXPENSE') {
          running -= tx.amount;
        }
        map.set(tx.id, running);
      }
    }
    return map;
  }, [allTransactionsForBalance, transactions, wallets]);

  useEffect(() => {
    loadData();
  }, [filters]);

  const handleCreateOrUpdate = async (input: CreateTransactionInput) => {
    if (editingTransaction) {
      const updated = await transactionService.updateTransaction(editingTransaction.id, input);
      setTransactions((prev) => prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)));
    } else {
      const created = await transactionService.createTransaction(input);
      const walletName = wallets.find((w) => w.id === created.wallet_id)?.name;
      setTransactions((prev) => [{ ...created, wallet_name: walletName }, ...prev]);
    }
    setEditingTransaction(null);
    await loadData(true);
  };

  const handleTransfer = async (input: TransferFundsInput) => {
    await transactionService.transferFunds(input);
    await loadData(true);
  };

  const handleSoftDelete = async (tx: Transaction) => {
    if (confirm(`Bạn có chắc chắn muốn xóa giao dịch "${tx.description}"? (Hệ thống sẽ xóa mềm để lưu vết kiểm toán và tự động tính lại số dư quỹ)`)) {
      setTransactions((prev) => prev.filter((t) => t.id !== tx.id));
      await transactionService.softDeleteTransaction(tx.id);
      await loadData(true);
    }
  };

  const selectedWallet = wallets.find((w) => w.id === filters.walletId);
  const currentWalletBalance = selectedWallet
    ? (selectedWallet.balanceSummary?.current_balance ?? selectedWallet.initial_balance)
    : wallets.filter((w) => !w.is_archived).reduce((acc, w) => acc + (w.balanceSummary?.current_balance ?? w.initial_balance), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Quản Lý Thu Chi
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setIsTransferModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <span>Chuyển tiền giữa các quỹ</span>
            </button>
          )}

          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Giao Dịch</span>
          </button>
        </div>
      </div>

      {/* Aggregate Overview Strip (Số Dư Hiện Tại Của Quỹ) */}
      <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-sm flex items-center justify-between">
        <div>
          <span className="text-xs text-emerald-100 font-medium uppercase tracking-wider block">
            {selectedWallet ? `Số Dư: ${selectedWallet.name}` : 'Tổng Số Dư Các Quỹ'}
          </span>
          <span className="text-2xl font-extrabold block mt-1 tracking-tight">
            {formatCurrency(currentWalletBalance)}
          </span>
          <span className="text-[11px] text-emerald-200 block mt-0.5">
            {selectedWallet ? (selectedWallet.type === 'PERSONAL' ? 'Quỹ cá nhân' : 'Quỹ chung') : 'Đang hoạt động'}
          </span>
        </div>
        <div className="w-11 h-11 rounded-xl bg-white/20 text-white flex items-center justify-center">
          <WalletIcon className="w-6 h-6" />
        </div>
      </div>

      {/* Banner thông tin chi tiết quỹ đang lọc (nếu có) */}
      {selectedWallet && (
        <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-600 text-white">
              <WalletIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-sm">{selectedWallet.name}</span>
                <Badge variant={selectedWallet.type === 'PERSONAL' ? 'primary' : 'info'}>
                  {selectedWallet.type === 'PERSONAL' ? 'Quỹ Cá Nhân' : 'Quỹ Chung'}
                </Badge>
                {selectedWallet.is_archived && <Badge variant="warning">Đã đóng</Badge>}
              </div>
              <span className="text-gray-500">Số dư ban đầu: {formatCurrency(selectedWallet.initial_balance, selectedWallet.currency)}</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-emerald-800 font-medium block">Số Dư Hiện Tại Của Quỹ:</span>
            <span className="text-base font-bold text-emerald-700">
              {formatCurrency(currentWalletBalance, selectedWallet.currency)}
            </span>
          </div>
        </div>
      )}

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Box */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm lý do, ghi chú..."
              value={filters.searchQuery || ''}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Wallet Filter (Ẩn trên điện thoại) */}
          <div className="hidden sm:block">
            <select
              value={filters.walletId || ''}
              onChange={(e) => setFilters({ ...filters, walletId: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Tất cả các quỹ</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter (Ẩn trên điện thoại) */}
          <div className="hidden sm:block">
            <select
              value={filters.type || 'ALL'}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">Tất cả loại giao dịch</option>
              <option value="EXPENSE">Khoản Chi (EXPENSE)</option>
              <option value="INCOME">Khoản Thu (INCOME)</option>
              <option value="ADJUSTMENT">Điều Chỉnh (ADJUSTMENT)</option>
            </select>
          </div>

          {/* Category Filter (Ẩn trên điện thoại) */}
          <div className="hidden sm:block">
            <select
              value={filters.categoryId || ''}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value || undefined })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By (Ẩn trên điện thoại, mặc định mới nhất lên đầu) */}
          <div className="hidden sm:block">
            <select
              value={filters.sortBy || 'date_desc'}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="date_desc">Ngày: Mới nhất</option>
              <option value="date_asc">Ngày: Cũ nhất</option>
              <option value="amount_desc">Số tiền: Cao nhất</option>
              <option value="amount_asc">Số tiền: Thấp nhất</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Không tìm thấy giao dịch nào</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
            Thử thay đổi bộ lọc hoặc thêm giao dịch mới cho các quỹ chi tiêu của bạn.
          </p>
          <button
            onClick={() => {
              setEditingTransaction(null);
              setIsFormModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Giao Dịch Ngay</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isIncome = tx.type === 'INCOME';
              const isExpense = tx.type === 'EXPENSE';
              const txWallet = wallets.find((w) => w.id === tx.wallet_id);
              const txBalanceAfter = balanceAfterMap.get(tx.id) ?? (
                txWallet ? (txWallet.balanceSummary?.current_balance ?? txWallet.initial_balance) : 0
              );

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:p-5 flex items-center justify-between gap-3 sm:gap-4 hover:bg-gray-50/70 transition-colors"
                >
                  {/* Left: Icon (Desktop), Description, Date, Extra Info (Desktop) */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className={`hidden sm:block p-2.5 rounded-xl flex-shrink-0 mt-0.5 ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-600'
                        : isExpense
                        ? 'bg-red-50 text-red-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}>
                      {isIncome ? (
                        <ArrowUpRight className="w-5 h-5" />
                      ) : isExpense ? (
                        <ArrowDownRight className="w-5 h-5" />
                      ) : (
                        <SlidersHorizontal className="w-5 h-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {tx.description}
                        </span>
                        <span className="hidden sm:inline-flex">
                          <Badge variant={isIncome ? 'success' : isExpense ? 'danger' : 'info'}>
                            {tx.category?.name || 'Khác'}
                          </Badge>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 hidden sm:inline" />
                          {formatDate(tx.transaction_date)}
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:flex items-center gap-1 text-gray-600 font-medium">
                          <WalletIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{txWallet?.name || 'Quỹ'}</span>
                          <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Số dư sau GD: {formatCurrency(txBalanceAfter)}
                          </span>
                        </span>
                        {tx.creator && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="hidden sm:flex items-center gap-1 text-gray-400">
                              <User className="w-3.5 h-3.5" />
                              {tx.creator.full_name}
                            </span>
                          </>
                        )}
                      </div>

                      {tx.notes && (
                        <p className="hidden sm:block text-xs text-gray-500 mt-1 italic">
                          "{tx.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Amount, Balance After (Mobile), Action Buttons (Desktop) */}
                  <div className="flex items-center justify-end gap-4 flex-shrink-0">
                    <div className="text-right">
                      <span className={`text-sm sm:text-lg font-bold block ${
                        isIncome ? 'text-emerald-600' : isExpense ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(tx.amount)}
                      </span>
                      <span className="sm:hidden text-[11px] font-medium text-emerald-600 block mt-0.5">
                        Số dư: {formatCurrency(txBalanceAfter)}
                      </span>
                      <span className="hidden sm:inline text-[10px] text-gray-400">
                        Phiên bản: v{tx.version}
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingTransaction(tx);
                          setIsFormModalOpen(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Chỉnh sửa giao dịch"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleSoftDelete(tx)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa mềm giao dịch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Form Modal for Add/Edit */}
      <TransactionFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={handleCreateOrUpdate}
        initialData={editingTransaction}
      />

      {/* Transfer Funds Modal */}
      <TransferFundsModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSubmit={handleTransfer}
      />
    </div>
  );
};
