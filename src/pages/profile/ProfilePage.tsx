import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Database, 
  RefreshCw, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Calendar,
  Smartphone,
  HardDrive
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { db } from '../../database/dexieDb';
import { syncEngine } from '../../services/syncEngine';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';

export const ProfilePage: React.FC = () => {
  const { user, isAdmin, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'INFO' | 'PASSWORD' | 'OFFLINE'>('INFO');

  // Form states for profile info
  const [fullName, setFullName] = useState<string>(user?.full_name || '');
  const [infoSuccess, setInfoSuccess] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [isSavingInfo, setIsSavingInfo] = useState<boolean>(false);

  // Form states for password change
  const [oldPassword, setOldPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showOldPass, setShowOldPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);
  const [passSuccess, setPassSuccess] = useState<string | null>(null);
  const [passError, setPassError] = useState<string | null>(null);
  const [isSavingPass, setIsSavingPass] = useState<boolean>(false);

  // Offline stats
  const [walletCount, setWalletCount] = useState<number>(0);
  const [transactionCount, setTransactionCount] = useState<number>(0);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
    }
  }, [user]);

  const loadOfflineStats = async () => {
    try {
      const [wCount, tCount, sCount] = await Promise.all([
        db.wallets.count(),
        db.transactions.count(),
        db.sync_queue.where('status').equals('PENDING').count(),
      ]);
      setWalletCount(wCount);
      setTransactionCount(tCount);
      setPendingSyncCount(sCount);
    } catch (e) {
      console.warn('Could not read IndexedDB stats:', e);
    }
  };

  useEffect(() => {
    loadOfflineStats();
  }, []);

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setInfoSuccess(null);
    setInfoError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setInfoError('Họ và tên phải có ít nhất 2 ký tự');
      return;
    }

    try {
      setIsSavingInfo(true);
      await authService.updateProfile(user.id, { full_name: fullName });
      await refreshUser();
      setInfoSuccess('Cập nhật họ tên thành công!');
    } catch (err: any) {
      setInfoError(err.message || 'Lỗi khi cập nhật thông tin');
    } finally {
      setIsSavingInfo(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setPassSuccess(null);
    setPassError(null);

    if (!oldPassword) {
      setPassError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }

    if (newPassword.length < 6) {
      setPassError('Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setIsSavingPass(true);
      await authService.changePassword(user.email, oldPassword, newPassword);
      setPassSuccess('Đổi mật khẩu thành công! Mật khẩu mới có hiệu lực ngay lập tức.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassError(err.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleManualSync = async () => {
    try {
      setIsSyncing(true);
      setSyncMessage(null);
      await syncEngine.syncNow();
      await loadOfflineStats();
      setSyncMessage('Đồng bộ với máy chủ hoàn tất!');
    } catch (e: any) {
      setSyncMessage(`Lỗi đồng bộ: ${e.message || 'Không thể kết nối'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Bạn có chắc muốn xóa toàn bộ bộ nhớ đệm IndexedDB trên thiết bị này? Dữ liệu trên máy chủ sẽ không bị ảnh hưởng.')) {
      try {
        await Promise.all([
          db.wallets.clear(),
          db.transactions.clear(),
          db.categories.clear(),
          db.sync_queue.clear(),
        ]);
        await loadOfflineStats();
        alert('Đã xóa sạch bộ nhớ đệm cục bộ của thiết bị!');
      } catch (err: any) {
        alert('Lỗi khi xóa bộ nhớ đệm: ' + err.message);
      }
    }
  };

  if (!user) return null;

  const initialLetter = user.full_name ? user.full_name[0].toUpperCase() : 'U';

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Hồ Sơ Cá Nhân & Cài Đặt
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Quản lý thông tin tài khoản cá nhân, đổi mật khẩu và giám sát bộ nhớ dữ liệu offline
        </p>
      </div>

      {/* User Hero Banner Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-20 h-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-emerald-600/20">
            {initialLetter}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
              {isAdmin ? (
                <Badge variant="primary">Quản Trị Viên (Admin)</Badge>
              ) : (
                <Badge variant="success">Người Dùng</Badge>
              )}
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-gray-500">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </div>

            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-[11px] text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Gia nhập: {formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>

        <div className="flex sm:flex-col items-center sm:items-end gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tài khoản hoạt động</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('INFO')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'INFO'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <User className="w-4 h-4" />
          <span>Thông Tin Cá Nhân</span>
        </button>

        <button
          onClick={() => setActiveTab('PASSWORD')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'PASSWORD'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Đổi Mật Khẩu</span>
        </button>

        <button
          onClick={() => setActiveTab('OFFLINE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'OFFLINE'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>Bộ Nhớ & Thiết Bị Offline</span>
        </button>
      </div>

      {/* TAB 1: THÔNG TIN CÁ NHÂN */}
      {activeTab === 'INFO' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSaveInfo} className="space-y-5 max-w-lg">
            {infoSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{infoSuccess}</span>
              </div>
            )}

            {infoError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs sm:text-sm text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{infoError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Họ và Tên
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Địa chỉ Email (Định danh đăng nhập)
              </label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm cursor-not-allowed"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Email là định danh tài khoản duy nhất. Liên hệ Quản trị viên nếu cần thay đổi.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Vai trò tài khoản
              </label>
              <div className="flex items-center gap-2">
                <ShieldCheck className={`w-5 h-5 ${isAdmin ? 'text-indigo-600' : 'text-emerald-600'}`} />
                <span className="text-sm font-semibold text-gray-800">
                  {isAdmin ? 'Quản trị viên toàn hệ thống (System Administrator)' : 'Thành viên người dùng tiêu chuẩn'}
                </span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSavingInfo}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isSavingInfo ? 'Đang lưu...' : 'Lưu Thay Đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ĐỔI MẬT KHẨU */}
      {activeTab === 'PASSWORD' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
            {passSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5 text-xs sm:text-sm text-emerald-800 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passSuccess}</span>
              </div>
            )}

            {passError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-xs sm:text-sm text-red-700 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            {/* Mật khẩu cũ */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  type={showOldPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowOldPass(!showOldPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Tối thiểu 6 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu mới */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSavingPass}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                {isSavingPass ? 'Đang đổi...' : 'Cập Nhật Mật Khẩu'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: BỘ NHỚ & THIẾT BỊ OFFLINE */}
      {activeTab === 'OFFLINE' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Ví Quỹ Lưu Cục Bộ</span>
                <span className="text-2xl font-bold text-gray-900 block mt-1">{walletCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Giao Dịch Đã Cache</span>
                <span className="text-2xl font-bold text-emerald-600 block mt-1">{transactionCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Thao Tác Chờ Đồng Bộ</span>
                <span className="text-2xl font-bold text-amber-600 block mt-1">{pendingSyncCount}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Sync Status Banner */}
          {syncMessage && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{syncMessage}</span>
            </div>
          )}

          {/* Device Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Quản Trị Dữ Liệu Thiết Bị Cục Bộ
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Thiết bị này sử dụng cơ chế lưu trữ IndexedDB độc lập, cho phép bạn ghi chép thu chi ngay cả khi mất sóng Internet hoặc chuyển sang chế độ máy bay.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ Với Máy Chủ Ngay'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-semibold text-xs sm:text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa Cache Cục Bộ Thiết Bị</span>
              </button>
            </div>
          </div>

          {/* Device PWA info */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
            <Smartphone className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <span className="font-semibold block text-slate-900">Ứng dụng PWA (Progressive Web App):</span>
              Hỗ trợ cài đặt trực tiếp lên màn hình chính máy tính & điện thoại, tự động kích hoạt Service Worker và bộ nhớ đệm cache-first.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
