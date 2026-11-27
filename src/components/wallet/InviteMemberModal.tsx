import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../common/Modal';
import { InviteMemberInput, inviteMemberSchema } from '../../types/wallet.types';
import { Profile } from '../../types/database.types';
import { adminService } from '../../services/adminService';
import { Edit3, Eye, Users, Loader2 } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InviteMemberInput) => Promise<void>;
  existingMemberIds?: string[];
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingMemberIds = [],
}) => {
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);

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

  useEffect(() => {
    if (!isOpen) return;

    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const allUsers = await adminService.getUsers();
        const existingSet = new Set(existingMemberIds);
        const eligible = allUsers.filter((u) => u.is_active && !existingSet.has(u.id));
        setAvailableUsers(eligible);
        if (eligible.length > 0) {
          setValue('email', eligible[0].email, { shouldValidate: true });
        } else {
          setValue('email', '');
        }
      } catch (err) {
        console.warn('Error loading users for wallet:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    loadUsers();
  }, [isOpen, existingMemberIds, setValue]);

  const handleFormSubmit = async (data: InviteMemberInput) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi thêm thành viên vào quỹ');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thêm Thành Viên Vào Quỹ"
      description="Chọn người dùng trong hệ thống và phân quyền truy cập vào quỹ này"
    >
      <form onSubmit={handleSubmit(handleFormSubmit)} noValidate className="space-y-4">
        {/* Select Member */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Chọn thành viên <span className="text-red-500">*</span>
          </label>
          {loadingUsers ? (
            <div className="flex items-center gap-2 py-2.5 px-3.5 rounded-xl border border-gray-200 text-xs text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span>Đang tải danh sách người dùng...</span>
            </div>
          ) : availableUsers.length === 0 ? (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              Tất cả người dùng đang hoạt động đều đã có mặt trong quỹ này.
            </div>
          ) : (
            <div className="relative">
              <Users className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                {...register('email')}
                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                  errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
                }`}
              >
                <option value="">-- Chọn thành viên --</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.email}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  Chỉ được xem số dư, danh sách giao dịch và báo cáo thống kê của quỹ.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
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
            disabled={isSubmitting || availableUsers.length === 0}
            className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Đang thêm...' : 'Thêm vào quỹ'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
