import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { CreateUserInput, createUserSchema } from '../../types/auth.types';
import { User, Mail, Lock, Shield, Loader2 } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateUserInput) => Promise<void>;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      is_system_admin: false,
      is_active: true,
    },
  });

  const handleFormSubmit = async (data: CreateUserInput) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tạo người dùng');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm Người Dùng Mới"
      description="Tạo tài khoản và phân quyền cho người dùng tham gia hệ thống"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Họ và Tên <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <User className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="VD: Nguyễn Văn C"
              {...register('full_name')}
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.full_name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
              }`}
            />
          </div>
          {errors.full_name && (
            <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Địa chỉ Email <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Mail className="w-4 h-4" />
            </div>
            <input
              type="email"
              placeholder="userc@expense.local"
              {...register('email')}
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
            Mật khẩu khởi tạo <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              placeholder="Tối thiểu 6 ký tự"
              {...register('password')}
              className={`w-full pl-10 pr-3 py-2.5 rounded-xl border text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                errors.password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
              }`}
            />
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
        </div>

        {/* Roles & Status */}
        <div className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('is_system_admin')}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
            />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-xs font-semibold text-gray-900 block leading-tight">Cấp quyền Quản trị viên (Admin)</span>
                <span className="text-[11px] text-gray-500 block">Có quyền truy cập Admin Portal, quản lý cấu hình và người dùng</span>
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-2 border-t border-gray-200">
            <input
              type="checkbox"
              {...register('is_active')}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
            />
            <div>
              <span className="text-xs font-semibold text-gray-900 block leading-tight">Kích hoạt tài khoản ngay</span>
              <span className="text-[11px] text-gray-500 block">Tài khoản có thể đăng nhập ngay sau khi tạo</span>
            </div>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <span>Tạo tài khoản</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
