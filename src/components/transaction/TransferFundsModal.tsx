import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { TransferFundsInput, transferFundsSchema } from '../../types/transaction.types';
import { WalletWithDetails } from '../../types/wallet.types';
import { walletService } from '../../services/walletService';
import { formatCurrency } from '../../utils/formatters';
import { ArrowRightLeft, AlertCircle } from 'lucide-react';

interface TransferFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransferFundsInput) => Promise<void>;
  defaultSourceWalletId?: string;
}

export const TransferFundsModal: React.FC<TransferFundsModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  defaultSourceWalletId,
}) => {
  const [wallets, setWallets] = useState<WalletWithDetails[]>([]);
  const [displayAmount, setDisplayAmount] = useState<string>('');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TransferFundsInput>({
    resolver: zodResolver(transferFundsSchema),
    defaultValues: {
      source_wallet_id: defaultSourceWalletId || '',
      destination_wallet_id: '',
      amount: 0,
      description: 'Chuyển quỹ nội bộ',
      transfer_date: new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (!isOpen) return;

    const loadWallets = async () => {
      const list = await walletService.getWallets();
      // Only active (non-archived) wallets can transfer funds
      const active = list.filter((w) => !w.is_archived);
      setWallets(active);

      const srcId = defaultSourceWalletId || (active[0]?.id ?? '');
      setValue('source_wallet_id', srcId);

      // Select different destination wallet if possible
      const other = active.find((w) => w.id !== srcId);
      if (other) {
        setValue('destination_wallet_id', other.id);
      }
    };

    loadWallets();
  }, [isOpen, defaultSourceWalletId, setValue]);

  const handleFormSubmit = async (data: TransferFundsInput) => {
    try {
      await onSubmit(data);
      reset();
      setDisplayAmount('');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi chuyển tiền');
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
      title="Chuyển Tiền Giữa Các Quỹ"
      description="Luân chuyển số dư giữa 2 quỹ một cách nguyên tử (Atomic)"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
        {/* Notice Info */}
        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3 text-blue-900 text-xs leading-relaxed">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Quy tắc nghiệp vụ:</span>
            Số tiền sẽ được trừ ở Quỹ nguồn và cộng đồng thời vào Quỹ đích. Nghiệp vụ chuyển tiền nội bộ này sẽ tự động được loại trừ khỏi báo cáo thu chi thực tế.
          </div>
        </div>

        {/* Source and Destination Wallets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quỹ chuyển (Nguồn) <span className="text-red-500">*</span>
            </label>
            <select
              {...register('source_wallet_id')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                errors.source_wallet_id ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <option value="">-- Chọn quỹ nguồn --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type === 'PERSONAL' ? 'Cá nhân' : 'Chung'})
                </option>
              ))}
            </select>
            {errors.source_wallet_id && (
              <p className="text-xs text-red-500 mt-1">{errors.source_wallet_id.message}</p>
            )}

            {/* Hiển thị số dư quỹ nguồn */}
            {(() => {
              const srcId = watch('source_wallet_id');
              const srcWallet = wallets.find((w) => w.id === srcId);
              if (!srcWallet) return null;
              const balance = srcWallet.balanceSummary?.current_balance ?? srcWallet.initial_balance;
              return (
                <div className="flex items-center justify-between mt-1 text-[11px] text-gray-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span>Số dư hiện tại:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(balance, srcWallet.currency)}</span>
                </div>
              );
            })()}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quỹ nhận (Đích) <span className="text-red-500">*</span>
            </label>
            <select
              {...register('destination_wallet_id')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                errors.destination_wallet_id ? 'border-red-300' : 'border-gray-200'
              }`}
            >
              <option value="">-- Chọn quỹ nhận --</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.type === 'PERSONAL' ? 'Cá nhân' : 'Chung'})
                </option>
              ))}
            </select>
            {errors.destination_wallet_id && (
              <p className="text-xs text-red-500 mt-1">{errors.destination_wallet_id.message}</p>
            )}

            {/* Hiển thị số dư quỹ đích */}
            {(() => {
              const destId = watch('destination_wallet_id');
              const destWallet = wallets.find((w) => w.id === destId);
              if (!destWallet) return null;
              const balance = destWallet.balanceSummary?.current_balance ?? destWallet.initial_balance;
              return (
                <div className="flex items-center justify-between mt-1 text-[11px] text-gray-600 bg-slate-50 p-1.5 rounded border border-slate-200">
                  <span>Số dư hiện tại:</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(balance, destWallet.currency)}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Amount and Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Số tiền chuyển (VND) <span className="text-red-500">*</span>
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
              Ngày chuyển <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              {...register('transfer_date')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                errors.transfer_date ? 'border-red-300' : 'border-gray-200'
              }`}
            />
            {errors.transfer_date && (
              <p className="text-xs text-red-500 mt-1">{errors.transfer_date.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nội dung chuyển tiền <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Nộp tiền vào quỹ gia đình, chuyển khoản sang ví tiết kiệm..."
            {...register('description')}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.description ? 'border-red-300' : 'border-gray-200'
            }`}
          />
          {errors.description && (
            <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>
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
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>{isSubmitting ? 'Đang chuyển...' : 'Xác Nhận Chuyển Tiền'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
