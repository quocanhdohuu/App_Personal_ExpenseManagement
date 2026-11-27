import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { CreateWalletInput, createWalletSchema } from '../../types/wallet.types';
import { formatCurrency } from '../../utils/formatters';
import { User, Users } from 'lucide-react';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateWalletInput) => Promise<void>;
}

export const CreateWalletModal: React.FC<CreateWalletModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [displayAmount, setDisplayAmount] = useState<string>('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWalletInput>({
    resolver: zodResolver(createWalletSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'PERSONAL',
      currency: 'VND',
      initial_balance: 0,
    },
  });

  const selectedType = watch('type');

  const handleFormSubmit = async (data: CreateWalletInput) => {
    try {
      await onSubmit(data);
      reset();
      setDisplayAmount('');
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo quỹ');
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw ? parseInt(raw, 10) : 0;
    setValue('initial_balance', num, { shouldValidate: true });
    setDisplayAmount(raw ? num.toLocaleString('vi-VN') : '');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        setDisplayAmount('');
        onClose();
      }}
      title="Tạo Quỹ Mới"
      description="Tạo quỹ cá nhân hoặc quỹ chung để quản lý chi tiêu độc lập"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-5">
        {/* Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Loại quỹ <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setValue('type', 'PERSONAL')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                selectedType === 'PERSONAL'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <User className={`w-6 h-6 mb-1.5 ${selectedType === 'PERSONAL' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className="text-sm font-semibold">Quỹ Cá Nhân</span>
              <span className="text-[11px] text-gray-400 mt-0.5">Chỉ riêng bạn quản lý</span>
            </button>

            <button
              type="button"
              onClick={() => setValue('type', 'SHARED')}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                selectedType === 'SHARED'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-900 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
              }`}
            >
              <Users className={`w-6 h-6 mb-1.5 ${selectedType === 'SHARED' ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span className="text-sm font-semibold">Quỹ Chung</span>
              <span className="text-[11px] text-gray-400 mt-0.5">Chia sẻ nhiều thành viên</span>
            </button>
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên quỹ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Quỹ sinh hoạt gia đình, Ví tiết kiệm..."
            {...register('name')}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        {/* Initial Balance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Số dư ban đầu (VND) <span className="text-red-500">*</span>
            </label>
            {watch('initial_balance') > 0 && (
              <span className="text-xs font-semibold text-emerald-600">
                {formatCurrency(watch('initial_balance'))}
              </span>
            )}
          </div>
          <input
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayAmount}
            onChange={handleAmountChange}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.initial_balance ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
            }`}
          />
          {errors.initial_balance && (
            <p className="text-xs text-red-500 mt-1">{errors.initial_balance.message}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-1">
            Số dư khởi đầu khi bạn bắt đầu ghi chép quỹ này
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mô tả quỹ (Tùy chọn)
          </label>
          <textarea
            rows={3}
            placeholder="Mục đích sử dụng, quy tắc chi tiêu..."
            {...register('description')}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo Quỹ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
