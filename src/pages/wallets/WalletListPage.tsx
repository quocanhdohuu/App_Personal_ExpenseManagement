import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  User, 
  TrendingUp, 
  Lock,
  Layers
} from 'lucide-react';
import { walletService } from '../../services/walletService';
import { WalletWithDetails, CreateWalletInput } from '../../types/wallet.types';
import { WalletCard } from '../../components/wallet/WalletCard';
import { CreateWalletModal } from '../../components/wallet/CreateWalletModal';
import { formatCurrency } from '../../utils/formatters';

export const WalletListPage: React.FC = () => {
  const [wallets, setWallets] = useState<WalletWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<'ALL' | 'PERSONAL' | 'SHARED' | 'ARCHIVED'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const data = await walletService.getWallets();
      setWallets(data);
    } catch (err) {
      console.error('Error fetching wallets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const handleCreateWallet = async (input: CreateWalletInput) => {
    await walletService.createWallet(input);
    await fetchWallets();
  };

  // Filter logic
  const filteredWallets = wallets.filter((w) => {
    if (filterType === 'ARCHIVED') return w.is_archived;
    if (w.is_archived && filterType !== 'ALL') return false;
    if (filterType === 'PERSONAL') return w.type === 'PERSONAL';
    if (filterType === 'SHARED') return w.type === 'SHARED';
    return true;
  });

  // Aggregated totals
  const totalBalance = wallets
    .filter((w) => !w.is_archived)
    .reduce((acc, w) => acc + (w.balanceSummary?.current_balance ?? w.initial_balance), 0);

  const personalCount = wallets.filter((w) => w.type === 'PERSONAL' && !w.is_archived).length;
  const sharedCount = wallets.filter((w) => w.type === 'SHARED' && !w.is_archived).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Quản Lý Quỹ Chi Tiêu
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Theo dõi độc lập số dư các quỹ cá nhân và quỹ chung của gia đình/nhóm
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          <span>Tạo Quỹ Mới</span>
        </button>
      </div>

      {/* Aggregate Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">
              Tổng số dư tất cả quỹ
            </span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 block mt-0.5">
              {formatCurrency(totalBalance)}
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">
              Quỹ Cá Nhân
            </span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 block mt-0.5">
              {personalCount} <span className="text-xs font-normal text-gray-500">quỹ đang hoạt động</span>
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider block">
              Quỹ Chung / Nhóm
            </span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 block mt-0.5">
              {sharedCount} <span className="text-xs font-normal text-gray-500">quỹ chia sẻ</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3 overflow-x-auto">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            filterType === 'ALL'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Tất cả ({wallets.length})
        </button>

        <button
          onClick={() => setFilterType('PERSONAL')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            filterType === 'PERSONAL'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Quỹ cá nhân</span>
        </button>

        <button
          onClick={() => setFilterType('SHARED')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            filterType === 'SHARED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quỹ chung</span>
        </button>

        <button
          onClick={() => setFilterType('ARCHIVED')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
            filterType === 'ARCHIVED'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Đã đóng</span>
        </button>
      </div>

      {/* Wallets Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-gray-100 animate-pulse border border-gray-200" />
          ))}
        </div>
      ) : filteredWallets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Layers className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Chưa có quỹ nào trong mục này</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
            Bắt đầu bằng việc tạo quỹ cá nhân cho bạn hoặc quỹ chung để cùng chi tiêu với gia đình, bạn bè.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Quỹ Ngay</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredWallets.map((wallet) => (
            <WalletCard key={wallet.id} wallet={wallet} />
          ))}
        </div>
      )}

      {/* Create Wallet Modal */}
      <CreateWalletModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateWallet}
      />
    </div>
  );
};
