import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { CreateCategoryInput, createCategorySchema } from '../../types/transaction.types';

interface CreateCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCategoryInput) => Promise<void>;
  walletId?: string | null;
}

export const CreateCategoryModal: React.FC<CreateCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  walletId,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: {
      name: '',
      type: 'EXPENSE',
      icon: 'tag',
      color: '#10B981',
      wallet_id: walletId || null,
    },
  });

  const handleFormSubmit = async (data: CreateCategoryInput) => {
    try {
      await onSubmit({
        ...data,
        wallet_id: walletId || null,
      });
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo danh mục');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Danh Mục Mới"
      description={walletId ? 'Tạo danh mục riêng cho quỹ hiện tại' : 'Tạo danh mục dùng chung hệ thống'}
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên danh mục <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="Ví dụ: Tiền điện nước, Mua thú cưng..."
            {...register('name')}
            className={`w-full px-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
              errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Loại danh mục <span className="text-red-500">*</span>
          </label>
          <select
            {...register('type')}
            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="EXPENSE">Chi tiêu (EXPENSE)</option>
            <option value="INCOME">Thu nhập (INCOME)</option>
            <option value="BOTH">Cả hai (BOTH)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Màu đại diện
          </label>
          <input
            type="color"
            {...register('color')}
            className="w-full h-10 p-1 rounded-xl border border-gray-200 cursor-pointer"
          />
        </div>

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
            {isSubmitting ? 'Đang tạo...' : 'Tạo Danh Mục'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
