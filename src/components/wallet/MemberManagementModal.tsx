import React from 'react';
import { Modal } from '../common/Modal';
import { WalletMember, WalletMemberRole } from '../../types/database.types';
import { Trash2, UserPlus } from 'lucide-react';
import { Badge } from '../common/Badge';

interface MemberManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: WalletMember[];
  isOwner: boolean;
  onOpenInvite: () => void;
  onUpdateRole: (memberId: string, role: WalletMemberRole) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

export const MemberManagementModal: React.FC<MemberManagementModalProps> = ({
  isOpen,
  onClose,
  members,
  isOwner,
  onOpenInvite,
  onUpdateRole,
  onRemoveMember,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quản Lý Thành Viên Quỹ"
      description="Danh sách thành viên và phân quyền trong quỹ"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Header Invite Button */}
        {isOwner && (
          <div className="flex justify-end">
            <button
              onClick={() => {
                onClose();
                onOpenInvite();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Thêm thành viên vào quỹ</span>
            </button>
          </div>
        )}

        {/* Members List */}
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {members.map((member) => {
            const isMemberOwner = member.role === 'OWNER';
            return (
              <div key={member.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-gray-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center border border-emerald-200">
                    {member.profile?.full_name ? member.profile.full_name[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-gray-900 block leading-tight">
                      {member.profile?.full_name || 'Người dùng'}
                    </span>
                    <span className="text-xs text-gray-500 block leading-tight">
                      {member.profile?.email}
                    </span>
                  </div>
                </div>

                {/* Role Management */}
                <div className="flex items-center gap-3">
                  {isOwner && !isMemberOwner ? (
                    <select
                      value={member.role}
                      onChange={(e) => onUpdateRole(member.id, e.target.value as WalletMemberRole)}
                      className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="EDITOR">EDITOR (Biên tập)</option>
                      <option value="VIEWER">VIEWER (Chỉ xem)</option>
                    </select>
                  ) : (
                    <Badge variant={isMemberOwner ? 'primary' : member.role === 'EDITOR' ? 'info' : 'gray'}>
                      {isMemberOwner ? 'Chủ quỹ' : member.role}
                    </Badge>
                  )}

                  {/* Remove Button */}
                  {isOwner && !isMemberOwner && (
                    <button
                      onClick={() => {
                        if (confirm(`Bạn có chắc chắn muốn xóa ${member.profile?.full_name} khỏi quỹ?`)) {
                          onRemoveMember(member.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa thành viên"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};
