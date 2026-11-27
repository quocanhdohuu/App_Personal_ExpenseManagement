import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { 
  CreateTransactionInput, 
  createTransactionSchema, 
  SuggestedDescription 
} from '../../types/transaction.types';
import { Transaction, Category } from '../../types/database.types';
import { WalletWithDetails } from '../../types/wallet.types';
import { transactionService } from '../../services/transactionService';
import { categoryService } from '../../services/categoryService';
import { walletService } from '../../services/walletService';
import { formatCurrency } from '../../utils/formatters';
import { Sparkles, ArrowDownRight, ArrowUpRight, SlidersHorizontal, Wallet as WalletIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateTransactionInput) => Promise<void>;
  initialData?: Transaction | null;
  defaultWalletId?: string;
}

export const TransactionFormModal: React.FC<TransactionFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  defaultWalletId,
}) => {
  const { isAdmin } = useAuth();
  const [wallets, setWallets] = useState<WalletWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suggestions, setSuggestions] = useState<SuggestedDescription[]>([]);
  const [displayAmount, setDisplayAmount] = useState<string>('');

  const isEditing = Boolean(initialData);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTransactionInput>({
    resolver: zodResolver(createTransactionSchema),
    defaultValues: {
      wallet_id: defaultWalletId || '',
      category_id: '',
      type: 'EXPENSE',
      amount: 0,
      transaction_date: new Date().toISOString().split('T')[0],
      description: '',
      notes: '',
    },
  });

  const selectedWalletId = watch('wallet_id');
  const selectedType = watch('type');
  const selectedCategoryId = watch('category_id');

  // Load wallets and categories
  useEffect(() => {
    if (!isOpen) return;

    const loadMeta = async () => {
      const wList = await walletService.getWallets();
      // Filter out archived wallets for new transactions
      const activeWallets = wList.filter((w) => !w.is_archived || w.id === initialData?.wallet_id);
      setWallets(activeWallets);

      const targetWalletId = initialData?.wallet_id || defaultWalletId || (activeWallets[0]?.id ?? '');
      if (targetWalletId) {
        setValue('wallet_id', targetWalletId);
      }

      const cList = await categoryService.getCategories(targetWalletId);
      setCategories(cList);

      if (initialData) {
        reset({
          wallet_id: initialData.wallet_id,
          category_id: initialData.category_id,
          type: initialData.type,
          amount: initialData.amount,
          transaction_date: initialData.transaction_date.split('T')[0],
          description: initialData.description,
          notes: initialData.notes || '',
        });
        setDisplayAmount(initialData.amount ? initialData.amount.toLocaleString('vi-VN') : '');
      } else {
        // Default category matching type
        const firstMatchingCat = cList.find((c) => c.type === 'EXPENSE' || c.type === 'BOTH');
        if (firstMatchingCat) {
          setValue('category_id', firstMatchingCat.id, { shouldValidate: true });
        }
        setDisplayAmount('');
      }
    };

    loadMeta();
  }, [isOpen, initialData, defaultWalletId, reset, setValue]);

  // Load smart suggestions when wallet or category changes
  useEffect(() => {
    if (!selectedWalletId) return;

    const loadSuggestions = async () => {
      try {
        const list = await transactionService.getSuggestedDescriptions(
          selectedWalletId,
          selectedCategoryId || undefined,
          5
        );
        setSuggestions(list);
      } catch (err) {
        console.warn('Error loading suggestions:', err);
      }
    };

    loadSuggestions();
  }, [selectedWalletId, selectedCategoryId]);

  // Filter categories by selected transaction type
  const availableCategories = categories.filter(
    (c) => c.type === selectedType || c.type === 'BOTH'
  );

  const handleFormSubmit = async (data: CreateTransactionInput) => {
    try {
      await onSubmit(data);
      reset();
      setDisplayAmount('');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu giao dịch');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawDigits = e.target.value.replace(/\D/g, '');
    const num = rawDigits ? parseInt(rawDigits, 10) : 0;
    setValue('amount', num, { shouldValidate: true });
    setDisplayAmount(rawDigits ? parseInt(rawDigits, 10).toLocaleString('vi-VN') : '');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setDisplayAmount('');
        onClose();
      }}
      title={isEditing ? 'Chỉnh Sửa Giao Dịch' : 'Thêm Giao Dịch Mới'}
      description="Ghi nhận thu nhập, chi tiêu hoặc điều chỉnh số dư của quỹ"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
        {/* Transaction Type Buttons */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Loại giao dịch <span className="text-red-500">*</span>
          </label>
          <div className={`grid gap-2 ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              type="button"
              onClick={() => {
                setValue('type', 'EXPENSE');
                const matched = categories.find((c) => c.type === 'EXPENSE' || c.type === 'BOTH');
                if (matched) setValue('category_id', matched.id);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                selectedType === 'EXPENSE'
                  ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 text-red-600" />
              <span>Khoản Chi</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setValue('type', 'INCOME');
                const matched = categories.find((c) => c.type === 'INCOME' || c.type === 'BOTH');
                if (matched) setValue('category_id', matched.id);
              }}
              className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                selectedType === 'INCOME'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              <span>Khoản Thu</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setValue('type', 'ADJUSTMENT');
                  const matched = categories.find((c) => c.name === 'Điều chỉnh số dư' || c.type === 'BOTH');
                  if (matched) setValue('category_id', matched.id);
                }}
                className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
                  selectedType === 'ADJUSTMENT'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Điều Chỉnh</span>
              </button>
            )}
          </div>
        </div>

        {/* Wallet Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quỹ phát sinh <span className="text-red-500">*</span>
          </label>
          <select
            {...register('wallet_id')}
            disabled={isEditing}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.wallet_id ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name} ({w.type === 'PERSONAL' ? 'Cá nhân' : 'Chung'})
              </option>
            ))}
          </select>
          {errors.wallet_id && (
            <p className="text-xs text-red-500 mt-1">{errors.wallet_id.message}</p>
          )}

          {/* Hiển thị số dư hiện tại của quỹ đang giao dịch */}
          {(() => {
            const currentW = wallets.find((w) => w.id === selectedWalletId);
            if (!currentW) return null;
            const balance = currentW.balanceSummary?.current_balance ?? currentW.initial_balance;
            return (
              <div className="flex items-center justify-between mt-1.5 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
                <span className="flex items-center gap-1 font-medium">
                  <WalletIcon className="w-3.5 h-3.5 text-emerald-600" />
                  Số dư hiện tại của quỹ này:
                </span>
                <span className="font-bold text-emerald-700 text-sm">
                  {formatCurrency(balance, currentW.currency)}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Amount & Date in 2 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Số tiền (VND) <span className="text-red-500">*</span>
              </label>
              {watch('amount') > 0 && (
                <span className="text-xs font-semibold text-emerald-600">
                  {formatCurrency(watch('amount'))}
                </span>
              )}
            </div>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={handleAmountChange}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                errors.amount ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
              }`}
            />
            {errors.amount && (
              <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ngày giao dịch <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('transaction_date')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                errors.transaction_date ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            {errors.transaction_date && (
              <p className="text-xs text-red-500 mt-1">{errors.transaction_date.message}</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Danh mục <span className="text-red-500">*</span>
          </label>
          <select
            {...register('category_id')}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.category_id ? 'border-red-300' : 'border-gray-200'
            }`}
          >
            <option value="">-- Chọn danh mục --</option>
            {availableCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.wallet_id ? '(Riêng quỹ)' : ''}
              </option>
            ))}
          </select>
          {errors.category_id && (
            <p className="text-xs text-red-500 mt-1">{errors.category_id.message}</p>
          )}
        </div>

        {/* Description with Smart Suggestions */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Lý do giao dịch <span className="text-red-500">*</span>
            </label>
            {suggestions.length > 0 && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3" /> Gợi ý thông minh từ lịch sử
              </span>
            )}
          </div>
          <input
            type="text"
            placeholder="Ví dụ: Mua thức ăn siêu thị, Đổ xăng xe máy..."
            {...register('description')}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.description ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
          )}

          {/* Suggestion Pills */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestions.map((s) => (
                <button
                  key={s.description}
                  type="button"
                  onClick={() => setValue('description', s.description)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  {s.description} <span className="opacity-60 text-[10px]">({s.usage_count})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Đang lưu...' : isEditing ? 'Lưu Thay Đổi' : 'Tạo Giao Dịch'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
