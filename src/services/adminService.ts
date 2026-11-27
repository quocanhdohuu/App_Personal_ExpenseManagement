import { Profile } from '../types/database.types';
import { AuditLogWithUser, SystemConfig, UserManagementStats } from '../types/admin.types';
import { CreateUserInput, UpdateUserInput } from '../types/auth.types';
import { authService } from './authService';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY_USERS = 'app_expense_admin_users_v1';
const LOCAL_STORAGE_KEY_AUDIT = 'app_expense_admin_audit_v1';
const LOCAL_STORAGE_KEY_CONFIGS = 'app_expense_admin_configs_v1';

const INITIAL_MOCK_USERS: Profile[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    email: 'usera@expense.local',
    full_name: 'Người dùng A',
    avatar_url: null,
    is_system_admin: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    email: 'userb@expense.local',
    full_name: 'Người dùng B',
    avatar_url: null,
    is_system_admin: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: '99999999-9999-4999-a999-999999999999',
    email: 'admin@expense.local',
    full_name: 'Quản trị hệ thống',
    avatar_url: null,
    is_system_admin: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  },
];

const INITIAL_MOCK_AUDIT_LOGS: AuditLogWithUser[] = [
  {
    id: 'log-1',
    user_id: '99999999-9999-4999-a999-999999999999',
    user_name: 'Quản trị hệ thống',
    user_email: 'admin@expense.local',
    action: 'CREATE_WALLET',
    entity_name: 'wallets',
    entity_id: '33333333-3333-4333-a333-333333333333',
    new_values: { name: 'Quỹ sinh hoạt chung', type: 'SHARED', initial_balance: 10000000 },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'log-2',
    user_id: '99999999-9999-4999-a999-999999999999',
    user_name: 'Quản trị hệ thống',
    user_email: 'admin@expense.local',
    action: 'INVITE_MEMBER',
    entity_name: 'wallet_members',
    new_values: { email: 'userb@expense.local', role: 'EDITOR' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'log-3',
    user_id: '99999999-9999-4999-a999-999999999999',
    user_name: 'Quản trị hệ thống',
    user_email: 'admin@expense.local',
    action: 'TRANSFER_FUNDS',
    entity_name: 'wallet_transfers',
    new_values: { amount: 500000, description: 'Góp tiền sinh hoạt tuần này' },
    ip_address: '127.0.0.1',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

const INITIAL_CONFIGS: SystemConfig[] = [
  {
    key: 'DEFAULT_CURRENCY',
    name: 'Đơn vị tiền tệ mặc định',
    value: 'VND',
    description: 'Tiền tệ áp dụng cho các quỹ mới được khởi tạo',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'ALLOW_PUBLIC_REGISTRATION',
    name: 'Cho phép đăng ký tài khoản mới',
    value: 'TRUE',
    description: 'Bật/Tắt tính năng tự đăng ký của người dùng mới',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'MAX_WALLETS_PER_USER',
    name: 'Số quỹ tối đa mỗi người dùng',
    value: '20',
    description: 'Giới hạn số lượng quỹ cá nhân và quỹ chung được phép tạo',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'OFFLINE_SYNC_HEARTBEAT_SECONDS',
    name: 'Tần suất kiểm tra đồng bộ (giây)',
    value: '30',
    description: 'Khoảng thời gian tự động đồng bộ khi thiết bị kết nối mạng trở lại',
    updated_at: new Date().toISOString(),
  },
];

function loadLocalUsers(): Profile[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_USERS);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(INITIAL_MOCK_USERS));
    return INITIAL_MOCK_USERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_MOCK_USERS;
  }
}

function saveLocalUsers(users: Profile[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_USERS, JSON.stringify(users));
}

function loadLocalAudit(): AuditLogWithUser[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_AUDIT);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(INITIAL_MOCK_AUDIT_LOGS));
    return INITIAL_MOCK_AUDIT_LOGS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_MOCK_AUDIT_LOGS;
  }
}

function saveLocalAudit(logs: AuditLogWithUser[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_AUDIT, JSON.stringify(logs));
}

function loadLocalConfigs(): SystemConfig[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIGS);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY_CONFIGS, JSON.stringify(INITIAL_CONFIGS));
    return INITIAL_CONFIGS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_CONFIGS;
  }
}

function saveLocalConfigs(configs: SystemConfig[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_CONFIGS, JSON.stringify(configs));
}

export const adminService = {
  /**
   * Lấy danh sách toàn bộ người dùng
   */
  async getUsers(): Promise<Profile[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data) return data as Profile[];
      } catch (err) {
        console.warn('Supabase getUsers failed, falling back to local:', err);
      }
    }
    return loadLocalUsers();
  },

  /**
   * Tạo người dùng mới
   */
  async createUser(input: CreateUserInput): Promise<Profile> {
    const users = loadLocalUsers();
    const emailNorm = input.email.trim().toLowerCase();

    if (users.some((u) => u.email.toLowerCase() === emailNorm)) {
      throw new Error(`Email "${input.email}" đã tồn tại trong hệ thống!`);
    }

    const newUser: Profile = {
      id: crypto.randomUUID(),
      email: emailNorm,
      full_name: input.full_name.trim(),
      avatar_url: null,
      is_system_admin: Boolean(input.is_system_admin),
      is_active: input.is_active !== undefined ? Boolean(input.is_active) : true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    users.push(newUser);
    saveLocalUsers(users);

    // Lưu mật khẩu cho người dùng mới
    authService.setUserPassword(emailNorm, input.password);

    // Tự động khởi tạo Ví cá nhân mặc định cho người dùng mới
    try {
      const walletId = crypto.randomUUID();
      const now = new Date().toISOString();
      const rawWallets = localStorage.getItem('app_expense_wallets_v1');
      const wallets = rawWallets ? JSON.parse(rawWallets) : [];
      wallets.push({
        id: walletId,
        name: `Ví cá nhân - ${newUser.full_name}`,
        description: 'Quỹ chi tiêu cá nhân mặc định',
        type: 'PERSONAL',
        currency: 'VND',
        initial_balance: 0,
        is_archived: false,
        created_by: newUser.id,
        version: 1,
        created_at: now,
        updated_at: now,
      });
      localStorage.setItem('app_expense_wallets_v1', JSON.stringify(wallets));

      const rawMembers = localStorage.getItem('app_expense_wallet_members_v1');
      const members = rawMembers ? JSON.parse(rawMembers) : [];
      members.push({
        id: crypto.randomUUID(),
        wallet_id: walletId,
        user_id: newUser.id,
        role: 'OWNER',
        joined_at: now,
        updated_at: now,
        profile: newUser,
      });
      localStorage.setItem('app_expense_wallet_members_v1', JSON.stringify(members));
    } catch (e) {
      console.warn('Could not initialize default wallet for new user:', e);
    }

    // Ghi log kiểm toán
    this.addAuditLog({
      action: 'CREATE_USER',
      entity_name: 'profiles',
      entity_id: newUser.id,
      new_values: {
        email: newUser.email,
        full_name: newUser.full_name,
        is_system_admin: newUser.is_system_admin,
        is_active: newUser.is_active,
      },
    });

    return newUser;
  },

  /**
   * Cập nhật thông tin người dùng
   */
  async updateUser(userId: string, input: UpdateUserInput): Promise<Profile> {
    const users = loadLocalUsers();
    const targetIndex = users.findIndex((u) => u.id === userId);
    if (targetIndex === -1) {
      throw new Error('Không tìm thấy người dùng cần cập nhật');
    }

    const target = users[targetIndex];
    const emailNorm = input.email.trim().toLowerCase();

    // Kiểm tra trùng email nếu email thay đổi
    if (target.email.toLowerCase() !== emailNorm && users.some((u) => u.id !== userId && u.email.toLowerCase() === emailNorm)) {
      throw new Error(`Email "${input.email}" đã được sử dụng bởi người dùng khác!`);
    }

    const oldValues = { ...target };

    target.full_name = input.full_name.trim();
    target.email = emailNorm;
    target.is_system_admin = Boolean(input.is_system_admin);
    target.is_active = Boolean(input.is_active);
    target.updated_at = new Date().toISOString();

    users[targetIndex] = target;
    saveLocalUsers(users);

    // Cập nhật mật khẩu nếu có nhập mật khẩu mới
    if (input.password && input.password.trim().length >= 6) {
      authService.setUserPassword(emailNorm, input.password.trim());
    }

    // Cập nhật session nếu đây là user đang đăng nhập
    authService.updateSessionUser(target);

    // Ghi log kiểm toán
    this.addAuditLog({
      action: 'UPDATE_USER',
      entity_name: 'profiles',
      entity_id: target.id,
      old_values: {
        email: oldValues.email,
        full_name: oldValues.full_name,
        is_system_admin: oldValues.is_system_admin,
        is_active: oldValues.is_active,
      },
      new_values: {
        email: target.email,
        full_name: target.full_name,
        is_system_admin: target.is_system_admin,
        is_active: target.is_active,
      },
    });

    return target;
  },

  /**
   * Xóa người dùng khỏi hệ thống
   */
  async deleteUser(userId: string): Promise<void> {
    const users = loadLocalUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) {
      throw new Error('Không tìm thấy người dùng cần xóa');
    }

    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      throw new Error('Bạn không thể tự xóa tài khoản của chính mình!');
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    saveLocalUsers(updatedUsers);

    // Xóa credentials
    authService.removeUserCredentials(target.email);

    // Ghi log kiểm toán
    this.addAuditLog({
      action: 'DELETE_USER',
      entity_name: 'profiles',
      entity_id: target.id,
      old_values: { email: target.email, full_name: target.full_name },
    });
  },

  /**
   * Thống kê người dùng
   */
  async getUserStats(): Promise<UserManagementStats> {
    const users = loadLocalUsers();
    return {
      totalUsers: users.length,
      activeUsers: users.filter((u) => u.is_active).length,
      lockedUsers: users.filter((u) => !u.is_active).length,
      adminUsers: users.filter((u) => u.is_system_admin).length,
    };
  },

  /**
   * Khóa / Mở khóa tài khoản người dùng
   */
  async toggleUserLock(userId: string): Promise<boolean> {
    const users = loadLocalUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('Không tìm thấy người dùng');

    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      throw new Error('Bạn không thể tự khóa tài khoản của chính mình!');
    }

    target.is_active = !target.is_active;
    target.updated_at = new Date().toISOString();
    saveLocalUsers(users);

    // Ghi audit log
    this.addAuditLog({
      action: target.is_active ? 'UNLOCK_USER' : 'LOCK_USER',
      entity_name: 'profiles',
      entity_id: target.id,
      new_values: { email: target.email, is_active: target.is_active },
    });

    return target.is_active;
  },

  /**
   * Chuyển đổi vai trò Quản trị viên (Admin)
   */
  async toggleAdminRole(userId: string): Promise<boolean> {
    const users = loadLocalUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('Không tìm thấy người dùng');

    const currentUser = authService.getCurrentUser();
    if (currentUser && currentUser.id === userId && target.is_system_admin) {
      throw new Error('Bạn không thể tự thu hồi quyền Admin của chính mình!');
    }

    target.is_system_admin = !target.is_system_admin;
    target.updated_at = new Date().toISOString();
    saveLocalUsers(users);

    this.addAuditLog({
      action: target.is_system_admin ? 'GRANT_ADMIN' : 'REVOKE_ADMIN',
      entity_name: 'profiles',
      entity_id: target.id,
      new_values: { email: target.email, is_system_admin: target.is_system_admin },
    });

    return target.is_system_admin;
  },

  /**
   * Lấy danh sách lịch sử kiểm toán hệ thống
   */
  async getAuditLogs(): Promise<AuditLogWithUser[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*, profile:profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          return data.map((row: any) => ({
            ...row,
            user_name: row.profile?.full_name,
            user_email: row.profile?.email,
          })) as AuditLogWithUser[];
        }
      } catch (err) {
        console.warn('Supabase getAuditLogs failed, falling back to local:', err);
      }
    }
    const logs = loadLocalAudit();
    return logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Ghi log kiểm toán mới
   */
  addAuditLog(entry: Omit<AuditLogWithUser, 'id' | 'created_at' | 'user_name' | 'user_email'>): void {
    const logs = loadLocalAudit();
    const currentUser = authService.getCurrentUser() || {
      id: '99999999-9999-4999-a999-999999999999',
      full_name: 'Quản trị hệ thống',
      email: 'admin@expense.local',
    };

    const newLog: AuditLogWithUser = {
      ...entry,
      id: crypto.randomUUID(),
      user_id: currentUser.id,
      user_name: currentUser.full_name,
      user_email: currentUser.email,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    saveLocalAudit(logs);
  },

  /**
   * Lấy cấu hình hệ thống
   */
  async getSystemConfigs(): Promise<SystemConfig[]> {
    return loadLocalConfigs();
  },

  /**
   * Cập nhật cấu hình hệ thống
   */
  async updateSystemConfig(key: string, value: string): Promise<void> {
    const configs = loadLocalConfigs();
    const target = configs.find((c) => c.key === key);
    if (!target) throw new Error('Không tìm thấy cấu hình');

    const oldValue = target.value;
    target.value = value;
    target.updated_at = new Date().toISOString();
    saveLocalConfigs(configs);

    this.addAuditLog({
      action: 'UPDATE_SYSTEM_CONFIG',
      entity_name: 'system_configs',
      old_values: { key, value: oldValue },
      new_values: { key, value },
    });
  },
};
