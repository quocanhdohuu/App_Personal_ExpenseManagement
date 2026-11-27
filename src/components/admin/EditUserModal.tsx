import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { Profile } from '../../types/database.types';
import { UpdateUserInput, updateUserSchema } from '../../types/auth.types';
import { User, Mail, Lock, Shield, Loader2 } from 'lucide-react';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: Profile | null;
  onSubmit: (userId: string, data: UpdateUserInput) => Promise<void>;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      is_system_admin: false,
      is_active: true,
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        full_name: user.full_name,
        email: user.email,
        password: '',
        is_system_admin: user.is_system_admin,
        is_active: user.is_active,
      });
    }
  }, [user, reset]);

  if (!user) return null;

  const handleFormSubmit = async (data: UpdateUserInput) => {
    try {
      await onSubmit(user.id, data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi cập nhật người dùng');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Chỉnh Sửa Người Dùng"
      description={`Cập nhật thông tin tài khoản cho: ${user.full_name}`}
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

        {/* Optional Password Reset */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Đổi Mật khẩu Mới
            </label>
            <span className="text-[11px] text-gray-400">Để trống nếu không đổi</span>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              type="password"
              placeholder="••••••••"
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
                <span className="text-xs font-semibold text-gray-900 block leading-tight">Quyền Quản trị viên (Admin)</span>
                <span className="text-[11px] text-gray-500 block">Cho phép truy cập khu vực quản trị Admin Portal</span>
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
              <span className="text-xs font-semibold text-gray-900 block leading-tight">Trạng thái Hoạt động</span>
              <span className="text-[11px] text-gray-500 block">Bỏ tích để khóa tài khoản không cho phép đăng nhập</span>
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
              <span>Lưu thay đổi</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
