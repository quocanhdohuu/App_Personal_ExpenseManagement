import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { EditWalletInput, editWalletSchema, WalletWithDetails } from '../../types/wallet.types';

interface EditWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletWithDetails;
  onSubmit: (data: EditWalletInput) => Promise<void>;
}

export const EditWalletModal: React.FC<EditWalletModalProps> = ({
  isOpen,
  onClose,
  wallet,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditWalletInput>({
    resolver: zodResolver(editWalletSchema),
    defaultValues: {
      name: wallet.name,
      description: wallet.description || '',
    },
  });

  useEffect(() => {
    reset({
      name: wallet.name,
      description: wallet.description || '',
    });
  }, [wallet, reset]);

  const handleFormSubmit = async (data: EditWalletInput) => {
    try {
      await onSubmit(data);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật quỹ');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh Sửa Thông Tin Quỹ"
      description="Cập nhật tên và mô tả của quỹ"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tên quỹ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
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
            Mô tả
          </label>
          <textarea
            rows={3}
            {...register('description')}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
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
            {isSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
