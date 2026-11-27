import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { InviteMemberInput, inviteMemberSchema } from '../../types/wallet.types';
import { Edit3, Eye, Mail } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InviteMemberInput) => Promise<void>;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: 'EDITOR',
    },
  });

  const selectedRole = watch('role');

  const handleFormSubmit = async (data: InviteMemberInput) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi mời thành viên');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mời Thành Viên Tham Gia Quỹ"
      description="Cấp quyền truy cập cho người dùng khác vào quỹ chung này"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email người dùng <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="userb@expense.local..."
              {...register('email')}
              className={`w-full pl-11 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
              }`}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Role selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phân quyền thành viên <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {/* EDITOR */}
            <div
              onClick={() => setValue('role', 'EDITOR')}
              className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                selectedRole === 'EDITOR'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 mt-0.5">
                <Edit3 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Biên tập viên (EDITOR)</span>
                  <input
                    type="radio"
                    checked={selectedRole === 'EDITOR'}
                    onChange={() => setValue('role', 'EDITOR')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Được thêm, sửa, xóa giao dịch; xem toàn bộ số dư và báo cáo. Không được sửa số dư ban đầu hay đóng quỹ.
                </p>
              </div>
            </div>

            {/* VIEWER */}
            <div
              onClick={() => setValue('role', 'VIEWER')}
              className={`p-3.5 rounded-xl border cursor-pointer flex items-start gap-3 transition-all ${
                selectedRole === 'VIEWER'
                  ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 ring-2 ring-emerald-500/20'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                <Eye className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Người xem (VIEWER)</span>
                  <input
                    type="radio"
                    checked={selectedRole === 'VIEWER'}
                    onChange={() => setValue('role', 'VIEWER')}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Chỉ được xem danh sách giao dịch, số dư và báo cáo. Không được ghi hoặc sửa bất kỳ dữ liệu nào.
                </p>
              </div>
            </div>
          </div>
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
            {isSubmitting ? 'Đang gửi lời mời...' : 'Xác Nhận Mời'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
