import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  UserPlus, 
  Lock, 
  Unlock, 
  Edit, 
  Users, 
  User, 
  ShieldCheck, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Calendar, 
  CreditCard,
  Plus,
  ArrowRightLeft,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  Edit2,
  Trash2
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import { transactionService } from '../../services/transactionService';
import { WalletWithDetails, EditWalletInput, AdjustBalanceInput, InviteMemberInput } from '../../types/wallet.types';
import { WalletMemberRole, Transaction } from '../../types/database.types';
import { 
  CreateTransactionInput, 
  TransferFundsInput, 
  TransactionWithDetails 
} from '../../types/transaction.types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { EditWalletModal } from '../../components/wallet/EditWalletModal';
import { AdjustBalanceModal } from '../../components/wallet/AdjustBalanceModal';
import { InviteMemberModal } from '../../components/wallet/InviteMemberModal';
import { MemberManagementModal } from '../../components/wallet/MemberManagementModal';
import { TransactionFormModal } from '../../components/transaction/TransactionFormModal';
import { TransferFundsModal } from '../../components/transaction/TransferFundsModal';

export const WalletDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [wallet, setWallet] = useState<WalletWithDetails | null>(null);
  const [walletTransactions, setWalletTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState<boolean>(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState<boolean>(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState<boolean>(false);

  // Transaction modals
  const [isTxFormOpen, setIsTxFormOpen] = useState<boolean>(false);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const fetchWalletAndTransactions = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [walletData, txData] = await Promise.all([
        walletService.getWalletById(id),
        transactionService.getTransactions({ walletId: id }),
      ]);

      if (!walletData) {
        navigate('/wallets');
        return;
      }

      setWallet(walletData);
      setWalletTransactions(txData);
    } catch (err) {
      console.error('Error fetching wallet details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletAndTransactions();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="h-44 bg-gray-200 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!wallet) return null;

  const isOwner = wallet.userRole === 'OWNER';
  const canEdit = wallet.userRole === 'OWNER' || wallet.userRole === 'EDITOR';
  const isPersonal = wallet.type === 'PERSONAL';
  const isArchived = wallet.is_archived;
  const summary = wallet.balanceSummary;

  const handleEdit = async (data: EditWalletInput) => {
    await walletService.updateWallet(wallet.id, data);
    await fetchWalletAndTransactions();
  };

  const handleAdjustBalance = async (data: AdjustBalanceInput) => {
    await walletService.adjustInitialBalance(wallet.id, data);
    await fetchWalletAndTransactions();
  };

  const handleInviteMember = async (data: InviteMemberInput) => {
    await walletService.inviteMember(wallet.id, data.email, data.role);
    await fetchWalletAndTransactions();
    alert(`Đã thêm thành công thành viên ${data.email} với quyền ${data.role}`);
  };

  const handleUpdateRole = async (memberId: string, role: WalletMemberRole) => {
    await walletService.updateMemberRole(memberId, role);
    await fetchWalletAndTransactions();
  };

  const handleRemoveMember = async (memberId: string) => {
    await walletService.removeMember(memberId);
    await fetchWalletAndTransactions();
  };

  const handleToggleArchive = async () => {
    const actionText = isArchived ? 'mở lại' : 'đóng (khóa)';
    if (confirm(`Bạn có chắc chắn muốn ${actionText} quỹ này?`)) {
      await walletService.toggleArchiveWallet(wallet.id);
      await fetchWalletAndTransactions();
    }
  };

  const handleCreateOrUpdateTx = async (input: CreateTransactionInput) => {
    if (editingTx) {
      await transactionService.updateTransaction(editingTx.id, input);
    } else {
      await transactionService.createTransaction(input);
    }
    setEditingTx(null);
    await fetchWalletAndTransactions();
  };

  const handleTransfer = async (input: TransferFundsInput) => {
    await transactionService.transferFunds(input);
    await fetchWalletAndTransactions();
  };

  const handleSoftDeleteTx = async (tx: Transaction) => {
    if (confirm(`Bạn có chắc chắn muốn xóa giao dịch "${tx.description}"? (Hệ thống xóa mềm để bảo toàn lịch sử và cập nhật ngay số dư quỹ)`)) {
      await transactionService.softDeleteTransaction(tx.id);
      await fetchWalletAndTransactions();
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Back Button */}
      <div>
        <Link
          to="/wallets"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách quỹ</span>
        </Link>
      </div>

      {/* Main Header Card */}
      <div className={`p-6 sm:p-8 rounded-2xl bg-white border shadow-sm relative overflow-hidden ${
        isArchived ? 'border-gray-200 bg-gray-50/80' : 'border-gray-200'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl ${
              isPersonal ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
            }`}>
              {isPersonal ? <User className="w-8 h-8" /> : <Users className="w-8 h-8" />}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
                  {wallet.name}
                </h1>
                <Badge variant={isPersonal ? 'primary' : 'info'}>
                  {isPersonal ? 'Quỹ Cá Nhân' : 'Quỹ Chung'}
                </Badge>
                {isArchived && (
                  <Badge variant="warning">
                    <Lock className="w-3 h-3 mr-1" /> Đã đóng (Chỉ xem)
                  </Badge>
                )}
                <Badge variant={wallet.userRole === 'OWNER' ? 'primary' : wallet.userRole === 'EDITOR' ? 'info' : 'gray'}>
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  Quyền của bạn: {wallet.userRole}
                </Badge>
              </div>

              <p className="text-sm text-gray-500 max-w-xl">
                {wallet.description || 'Chưa có mô tả cho quỹ này.'}
              </p>
            </div>
          </div>

          {/* Action Buttons for OWNER */}
          {isOwner && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Sửa thông tin</span>
              </button>

              <button
                onClick={() => setIsAdjustModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Điều chỉnh số dư ban đầu</span>
              </button>

              {!isPersonal && (
                <button
                  onClick={() => setIsMembersModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
                >
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Thành viên ({wallet.members?.length || 1})</span>
                </button>
              )}

              <button
                onClick={handleToggleArchive}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-colors ${
                  isArchived
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                    : 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                }`}
              >
                {isArchived ? (
                  <>
                    <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mở lại quỹ</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-red-600" />
                    <span>Đóng quỹ</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Current Balance */}
        <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/10">
          <div className="flex items-center justify-between text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Số Dư Hiện Tại</span>
            <Calculator className="w-4 h-4 opacity-80" />
          </div>
          <div className="text-3xl font-extrabold tracking-tight">
            {formatCurrency(summary?.current_balance ?? wallet.initial_balance, wallet.currency)}
          </div>
          <p className="text-[11px] text-emerald-100/80 mt-2">
            Cập nhật tự động dựa trên giao dịch thực tế
          </p>
        </div>

        {/* Initial Balance */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Số Dư Ban Đầu</span>
            <Calendar className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-gray-800 tracking-tight">
            {formatCurrency(wallet.initial_balance, wallet.currency)}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Số tiền ban đầu khi thiết lập quỹ
          </p>
        </div>

        {/* Total Income */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Tổng Thu</span>
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 tracking-tight">
            +{formatCurrency(summary?.total_income || 0, wallet.currency)}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Tổng các khoản thu vào quỹ
          </p>
        </div>

        {/* Total Expense */}
        <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-red-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Tổng Chi</span>
            <TrendingDown className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold text-red-600 tracking-tight">
            -{formatCurrency(summary?.total_expense || 0, wallet.currency)}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Tổng các khoản chi từ quỹ
          </p>
        </div>
      </div>

      {/* Balance Formula Transparency Box */}
      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-gray-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-semibold text-gray-900 block">Công thức tính số dư chuẩn mực:</span>
            <span>Số dư = Số dư ban đầu + Tổng thu - Tổng chi + Điều chỉnh</span>
          </div>
        </div>

        <div className="font-mono bg-white px-3 py-1.5 rounded-lg border border-slate-200 text-gray-800 text-[11px]">
          {formatCurrency(wallet.initial_balance, wallet.currency)} + {formatCurrency(summary?.total_income || 0, wallet.currency)} - {formatCurrency(summary?.total_expense || 0, wallet.currency)} = <span className="font-bold text-emerald-600">{formatCurrency(summary?.current_balance ?? wallet.initial_balance, wallet.currency)}</span>
        </div>
      </div>

      {/* Members Section (If Shared Wallet) */}
      {!isPersonal && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Thành Viên Quỹ ({wallet.members?.length || 1})</h3>
              <p className="text-xs text-gray-500">Các thành viên có quyền truy cập hoặc biên tập quỹ này</p>
            </div>
            {isOwner && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Mời thành viên</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {wallet.members?.map((m) => (
              <div key={m.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
                    {m.profile?.full_name ? m.profile.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-900 block">{m.profile?.full_name}</span>
                    <span className="text-[10px] text-gray-400 block">{m.profile?.email}</span>
                  </div>
                </div>
                <Badge variant={m.role === 'OWNER' ? 'primary' : m.role === 'EDITOR' ? 'info' : 'gray'}>
                  {m.role}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TRANSACTIONS SECTION IN DETAIL PAGE */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Danh Sách Giao Dịch Của Quỹ</h3>
              <p className="text-xs text-gray-500">
                Toàn bộ các khoản thu, chi và điều chỉnh liên kết với quỹ này
              </p>
            </div>
          </div>

          {/* Action buttons for adding tx or transfer */}
          {canEdit && !isArchived && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTransferOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600" />
                <span>Chuyển tiền</span>
              </button>

              <button
                onClick={() => {
                  setEditingTx(null);
                  setIsTxFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm giao dịch</span>
              </button>
            </div>
          )}
        </div>

        {/* Transactions Table/List */}
        {walletTransactions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl p-6">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">Quỹ này chưa có giao dịch nào</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Bắt đầu ghi lại chi tiêu hoặc nạp tiền vào quỹ</p>
            {canEdit && !isArchived && (
              <button
                onClick={() => {
                  setEditingTx(null);
                  setIsTxFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm giao dịch đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {walletTransactions.map((tx) => {
              const isIncome = tx.type === 'INCOME';
              const isExpense = tx.type === 'EXPENSE';

              return (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      isIncome ? 'bg-emerald-50 text-emerald-600' : isExpense ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {isIncome ? <ArrowUpRight className="w-4 h-4" /> : isExpense ? <ArrowDownRight className="w-4 h-4" /> : <SlidersHorizontal className="w-4 h-4" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{tx.description}</span>
                        <Badge variant={isIncome ? 'success' : isExpense ? 'danger' : 'info'}>
                          {tx.category?.name || 'Danh mục'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                        <span>{formatDate(tx.transaction_date)}</span>
                        {tx.creator && <span>• {tx.creator.full_name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className={`text-base font-bold block ${
                        isIncome ? 'text-emerald-600' : isExpense ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(tx.amount, wallet.currency)}
                      </span>
                    </div>

                    {canEdit && !isArchived && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingTx(tx);
                            setIsTxFormOpen(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleSoftDeleteTx(tx)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <EditWalletModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        wallet={wallet}
        onSubmit={handleEdit}
      />

      <AdjustBalanceModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        wallet={wallet}
        onSubmit={handleAdjustBalance}
      />

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSubmit={handleInviteMember}
        existingMemberIds={(wallet.members || []).map((m) => m.user_id)}
      />

      <MemberManagementModal
        isOpen={isMembersModalOpen}
        onClose={() => setIsMembersModalOpen(false)}
        members={wallet.members || []}
        isOwner={isOwner}
        onOpenInvite={() => setIsInviteModalOpen(true)}
        onUpdateRole={handleUpdateRole}
        onRemoveMember={handleRemoveMember}
      />

      {/* Transaction Form Modal */}
      <TransactionFormModal
        isOpen={isTxFormOpen}
        onClose={() => {
          setIsTxFormOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleCreateOrUpdateTx}
        initialData={editingTx}
        defaultWalletId={wallet.id}
      />

      {/* Transfer Funds Modal */}
      <TransferFundsModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        onSubmit={handleTransfer}
        defaultSourceWalletId={wallet.id}
      />
    </div>
  );
};
