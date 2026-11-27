import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { AdjustBalanceInput, adjustBalanceSchema, WalletWithDetails } from '../../types/wallet.types';
import { formatCurrency } from '../../utils/formatters';
import { AlertTriangle } from 'lucide-react';

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletWithDetails;
  onSubmit: (data: AdjustBalanceInput) => Promise<void>;
}

export const AdjustBalanceModal: React.FC<AdjustBalanceModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onSubmit,
}) => {
  const [displayAmount, setDisplayAmount] = useState<string>(
    wallet.initial_balance ? wallet.initial_balance.toLocaleString('vi-VN') : '0'
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustBalanceInput>({
    resolver: zodResolver(adjustBalanceSchema),
    defaultValues: {
      new_initial_balance: wallet.initial_balance,
      reason: '',
    },
  });

  const handleFormSubmit = async (data: AdjustBalanceInput) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi điều chỉnh số dư ban đầu');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    setValue('new_initial_balance', num, { shouldValidate: true });
    setDisplayAmount(raw ? num.toLocaleString('vi-VN') : '');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Điều Chỉnh Số Dư Ban Đầu"
      description="Thay đổi số dư khởi điểm của quỹ và lưu vết kiểm toán"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
        {/* Warning Alert */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Lưu ý nghiệp vụ bắt buộc:</span>
            Hệ thống không cho phép sửa số dư hiện tại tùy tiện. Thao tác này chỉ điều chỉnh số dư ban đầu khởi điểm và được ghi nhận đầy đủ trong lịch sử kiểm toán (Audit Log).
          </div>
        </div>

        {/* Current Initial Balance Info */}
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between text-sm">
          <span className="text-gray-500">Số dư ban đầu hiện tại:</span>
          <span className="font-semibold text-gray-800">{formatCurrency(wallet.initial_balance, wallet.currency)}</span>
        </div>

        {/* New Initial Balance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Số dư ban đầu mới (VND) <span className="text-red-500">*</span>
            </label>
            {watch('new_initial_balance') > 0 && (
              <span className="text-xs font-semibold text-emerald-600">
                {formatCurrency(watch('new_initial_balance'))}
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
              errors.new_initial_balance ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
            }`}
          />
          {errors.new_initial_balance && (
            <p className="text-xs text-red-500 mt-1">{errors.new_initial_balance.message}</p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lý do điều chỉnh <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Kiểm kê lại quỹ, điều chỉnh số dư mở sổ..."
            {...register('reason')}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.reason ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
            }`}
          />
          {errors.reason && (
            <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>
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
            className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Đang cập nhật...' : 'Xác Nhận Điều Chỉnh'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
