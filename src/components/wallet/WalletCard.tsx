import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  User, 
  ArrowRight, 
  Lock, 
  ShieldCheck, 
  Edit3, 
  Eye, 
  CreditCard 
} from 'lucide-react';
import { WalletWithDetails } from '../../types/wallet.types';
import { formatCurrency } from '../../utils/formatters';
import { Badge } from '../common/Badge';

interface WalletCardProps {
  wallet: WalletWithDetails;
}

export const WalletCard: React.FC<WalletCardProps> = ({ wallet }) => {
  const isPersonal = wallet.type === 'PERSONAL';
  const isArchived = wallet.is_archived;
  const currentBalance = wallet.balanceSummary?.current_balance ?? wallet.initial_balance;
  const initialBalance = wallet.initial_balance;

  const roleBadgeMap = {
    OWNER: { label: 'Chủ quỹ (Owner)', variant: 'primary' as const, icon: ShieldCheck },
    EDITOR: { label: 'Biên tập viên (Editor)', variant: 'info' as const, icon: Edit3 },
    VIEWER: { label: 'Người xem (Viewer)', variant: 'gray' as const, icon: Eye },
  };

  const roleInfo = wallet.userRole ? roleBadgeMap[wallet.userRole] : roleBadgeMap.VIEWER;
  const RoleIcon = roleInfo.icon;

  return (
    <div className={`bg-white rounded-2xl border transition-all duration-200 hover:shadow-lg overflow-hidden flex flex-col justify-between ${
      isArchived ? 'border-gray-200 bg-gray-50/70 opacity-80' : 'border-gray-200 hover:border-emerald-200'
    }`}>
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${
              isPersonal 
                ? 'bg-emerald-50 text-emerald-600' 
                : 'bg-indigo-50 text-indigo-600'
            }`}>
              {isPersonal ? <User className="w-5 h-5" /> : <Users className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-base line-clamp-1">
                {wallet.name}
              </h3>
              <span className="text-xs text-gray-500">
                {isPersonal ? 'Quỹ cá nhân' : 'Quỹ chung nhiều thành viên'}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            {isArchived && (
              <Badge variant="warning">
                <Lock className="w-3 h-3 mr-1" /> Đã đóng
              </Badge>
            )}
            <Badge variant={roleInfo.variant}>
              <RoleIcon className="w-3 h-3 mr-1" />
              {roleInfo.label}
            </Badge>
          </div>
        </div>

        {/* Description */}
        {wallet.description && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {wallet.description}
          </p>
        )}

        {/* Balance Display */}
        <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
          <span className="text-xs text-gray-400 font-medium block uppercase tracking-wider mb-1">
            Số dư hiện tại
          </span>
          <div className="text-2xl font-bold text-gray-900 tracking-tight">
            {formatCurrency(currentBalance, wallet.currency)}
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-slate-200/60">
            <span>Số dư ban đầu:</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(initialBalance, wallet.currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {!isPersonal && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span>{wallet.members?.length || 1} thành viên</span>
            </div>
          )}
          <span>•</span>
          <div className="flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
            <span>{wallet.balanceSummary?.transaction_count || 0} giao dịch</span>
          </div>
        </div>

        <Link
          to={`/wallets/${wallet.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 group"
        >
          <span>Chi tiết</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </div>
  );
};
