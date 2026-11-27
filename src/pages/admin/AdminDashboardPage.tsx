import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  Settings, 
  Lock, 
  Unlock, 
  UserCheck, 
  UserX, 
  Clock, 
  Search,
  UserPlus,
  Pencil,
  Trash2
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Profile } from '../../types/database.types';
import { AuditLogWithUser, SystemConfig, UserManagementStats } from '../../types/admin.types';
import { CreateUserInput, UpdateUserInput } from '../../types/auth.types';
import { formatDate } from '../../utils/formatters';
import { Badge } from '../../components/common/Badge';
import { CreateUserModal } from '../../components/admin/CreateUserModal';
import { EditUserModal } from '../../components/admin/EditUserModal';
import { useAuth } from '../../context/AuthContext';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentAuthUser, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'USERS' | 'AUDIT' | 'CONFIGS'>('USERS');
  const [users, setUsers] = useState<Profile[]>([]);
  const [stats, setStats] = useState<UserManagementStats | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogWithUser[]>([]);
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchUserQuery, setSearchUserQuery] = useState<string>('');
  const [editingConfigKey, setEditingConfigKey] = useState<string | null>(null);
  const [editingConfigValue, setEditingConfigValue] = useState<string>('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const [uList, uStats, aList, cList] = await Promise.all([
        adminService.getUsers(),
        adminService.getUserStats(),
        adminService.getAuditLogs(),
        adminService.getSystemConfigs(),
      ]);
      setUsers(uList);
      setStats(uStats);
      setAuditLogs(aList);
      setConfigs(cList);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCreateUser = async (data: CreateUserInput) => {
    await adminService.createUser(data);
    await loadAdminData();
  };

  const handleUpdateUser = async (userId: string, data: UpdateUserInput) => {
    await adminService.updateUser(userId, data);
    await loadAdminData();
    if (currentAuthUser && currentAuthUser.id === userId) {
      await refreshUser();
    }
  };

  const handleDeleteUser = async (user: Profile) => {
    if (currentAuthUser && currentAuthUser.id === user.id) {
      alert('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }
    if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản của ${user.full_name} (${user.email})?`)) {
      try {
        await adminService.deleteUser(user.id);
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Lỗi khi xóa tài khoản');
      }
    }
  };

  const handleToggleLock = async (user: Profile) => {
    if (currentAuthUser && currentAuthUser.id === user.id) {
      alert('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }
    const actionText = user.is_active ? 'Khóa' : 'Mở khóa';
    if (confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản của ${user.full_name} (${user.email})?`)) {
      await adminService.toggleUserLock(user.id);
      await loadAdminData();
    }
  };

  const handleToggleAdmin = async (user: Profile) => {
    if (currentAuthUser && currentAuthUser.id === user.id && user.is_system_admin) {
      alert('Bạn không thể tự thu hồi quyền Admin của chính mình!');
      return;
    }
    const actionText = user.is_system_admin ? 'Thu hồi quyền Admin' : 'Cấp quyền Admin';
    if (confirm(`Bạn có chắc chắn muốn ${actionText} cho ${user.full_name}?`)) {
      await adminService.toggleAdminRole(user.id);
      await loadAdminData();
      if (currentAuthUser && currentAuthUser.id === user.id) {
        await refreshUser();
      }
    }
  };

  const handleSaveConfig = async (key: string) => {
    await adminService.updateSystemConfig(key, editingConfigValue);
    setEditingConfigKey(null);
    await loadAdminData();
  };

  const filteredUsers = users.filter((u) => {
    if (!searchUserQuery) return true;
    const q = searchUserQuery.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
              Quản Trị Hệ Thống (Admin Portal)
            </h1>
            <Badge variant="primary">System Admin</Badge>
          </div>
          <p className="text-sm text-gray-500">
            Quản lý tài khoản người dùng, giám sát lịch sử kiểm toán và cấu hình tham số toàn cục
          </p>
        </div>

        {activeTab === 'USERS' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-600/20 transition-all self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Thêm Người Dùng</span>
          </button>
        )}
      </div>

      {/* Admin Stats Strip */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Tổng Người Dùng</span>
              <span className="text-2xl font-bold text-gray-900 block mt-1">{stats.totalUsers}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Đang Hoạt Động</span>
              <span className="text-2xl font-bold text-emerald-600 block mt-1">{stats.activeUsers}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Tài Khoản Bị Khóa</span>
              <span className="text-2xl font-bold text-red-600 block mt-1">{stats.lockedUsers}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <UserX className="w-5 h-5" />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider block">Quản Trị Viên</span>
              <span className="text-2xl font-bold text-indigo-600 block mt-1">{stats.adminUsers}</span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('USERS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'USERS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Quản Lý Người Dùng ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'AUDIT'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Lịch Sử Hoạt Động (Audit Logs)</span>
        </button>

        <button
          onClick={() => setActiveTab('CONFIGS')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'CONFIGS'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Cấu Hình Hệ Thống</span>
        </button>
      </div>

      {/* TABS CONTENT */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* TAB 1: USER MANAGEMENT */}
          {activeTab === 'USERS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc email người dùng..."
                    value={searchUserQuery}
                    onChange={(e) => setSearchUserQuery(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center border border-emerald-200">
                          {user.full_name ? user.full_name[0].toUpperCase() : 'U'}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-gray-900 text-sm">{user.full_name}</span>
                            {user.is_system_admin && <Badge variant="primary">Admin</Badge>}
                            {user.is_active ? (
                              <Badge variant="success">Hoạt động</Badge>
                            ) : (
                              <Badge variant="danger">Đã khóa</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-400 block mt-0.5">{user.email}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Edit Button */}
                        <button
                          onClick={() => setEditingUser(user)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-emerald-700 transition-colors"
                          title="Sửa thông tin tài khoản"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Sửa</span>
                        </button>

                        {/* Grant/Revoke Admin Role */}
                        <button
                          onClick={() => handleToggleAdmin(user)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          {user.is_system_admin ? 'Gỡ Admin' : 'Cấp Admin'}
                        </button>

                        {/* Lock / Unlock */}
                        <button
                          onClick={() => handleToggleLock(user)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                            user.is_active
                              ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          {user.is_active ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-red-600" />
                              <span>Khóa</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Mở khóa</span>
                            </>
                          )}
                        </button>

                        {/* Delete User */}
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={currentAuthUser?.id === user.id}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title={currentAuthUser?.id === user.id ? 'Không thể tự xóa chính mình' : 'Xóa tài khoản'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AUDIT LOGS */}
          {activeTab === 'AUDIT' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-100">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={log.action.includes('LOCK') || log.action.includes('DELETE') ? 'danger' : log.action.includes('CREATE') ? 'success' : 'info'}>
                          {log.action}
                        </Badge>
                        <span className="font-semibold text-gray-900">{log.entity_name}</span>
                        <span className="text-gray-400">• Bởi: {log.user_name || log.user_email || 'Hệ thống'}</span>
                      </div>

                      {log.new_values && (
                        <div className="p-2 rounded-lg bg-gray-50 border border-gray-100 font-mono text-[11px] text-gray-700 max-w-xl break-all">
                          {JSON.stringify(log.new_values)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-400 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDate(log.created_at, true)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM CONFIGS */}
          {activeTab === 'CONFIGS' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {configs.map((cfg) => {
                const isEditing = editingConfigKey === cfg.key;
                return (
                  <div key={cfg.key} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-gray-900 text-sm block">{cfg.name}</span>
                      <span className="text-xs text-gray-500 block">{cfg.description}</span>
                      <span className="font-mono text-[10px] text-gray-400">Khóa: {cfg.key}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editingConfigValue}
                            onChange={(e) => setEditingConfigValue(e.target.value)}
                            className="px-3 py-1.5 border border-emerald-500 rounded-lg text-xs font-mono font-semibold"
                          />
                          <button
                            onClick={() => handleSaveConfig(cfg.key)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg"
                          >
                            Lưu
                          </button>
                          <button
                            onClick={() => setEditingConfigKey(null)}
                            className="px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 rounded-lg"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            {cfg.value}
                          </span>
                          <button
                            onClick={() => {
                              setEditingConfigKey(cfg.key);
                              setEditingConfigValue(cfg.value);
                            }}
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                          >
                            Chỉnh sửa
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateUser}
      />

      <EditUserModal
        isOpen={Boolean(editingUser)}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleUpdateUser}
      />
    </div>
  );
};
