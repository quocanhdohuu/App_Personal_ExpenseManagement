import { Profile } from '../types/database.types';
import { LoginCredentials } from '../types/auth.types';
import { supabase, isSupabaseConfigured } from './supabase';

const SESSION_STORAGE_KEY = 'app_expense_auth_session';
const REMEMBER_ME_KEY = 'app_expense_remember_me';
const REMEMBERED_CREDS_KEY = 'app_expense_remembered_creds_v1';
const CREDENTIALS_STORAGE_KEY = 'app_expense_auth_credentials_v1';
const USERS_STORAGE_KEY = 'app_expense_admin_users_v1';

// Mật khẩu mặc định cho các tài khoản khởi tạo: Password123!
const DEFAULT_CREDENTIALS: Record<string, string> = {
  'admin@expense.local': 'Password123!',
  'usera@expense.local': 'Password123!',
  'userb@expense.local': 'Password123!',
};

const DEFAULT_USERS: Profile[] = [
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

function getStoredUsers(): Profile[] {
  const data = localStorage.getItem(USERS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_USERS;
  }
}

function getStoredCredentials(): Record<string, string> {
  const data = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(DEFAULT_CREDENTIALS));
    return DEFAULT_CREDENTIALS;
  }
  try {
    return JSON.parse(data);
  } catch {
    return DEFAULT_CREDENTIALS;
  }
}

function saveCredentials(creds: Record<string, string>): void {
  localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
}

export const authService = {
  /**
   * Đăng nhập bằng Email và Mật khẩu
   */
  async login(credentials: LoginCredentials, rememberMe: boolean = true): Promise<Profile> {
    const emailNorm = credentials.email.trim().toLowerCase();

    const saveSession = (profile: Profile) => {
      localStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');
      if (rememberMe) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(SESSION_STORAGE_KEY);
        }
      } else {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
        }
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    };

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNorm,
        password: credentials.password,
      });

      if (error || !data.user) {
        throw new Error(error?.message || 'Email hoặc mật khẩu không chính xác');
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profErr || !profile) {
        throw new Error('Không tìm thấy hồ sơ người dùng trên hệ thống');
      }

      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('Tài khoản này đã bị khóa bởi Quản trị viên. Vui lòng liên hệ Admin.');
      }

      saveSession(profile as Profile);
      return profile as Profile;
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === emailNorm);

    if (!user) {
      throw new Error('Tài khoản email không tồn tại trong hệ thống');
    }

    const creds = getStoredCredentials();
    const storedPassword = creds[emailNorm] || 'Password123!';

    if (storedPassword !== credentials.password) {
      throw new Error('Mật khẩu đăng nhập không chính xác');
    }

    if (!user.is_active) {
      throw new Error('Tài khoản này đã bị khóa bởi Quản trị viên. Vui lòng liên hệ Admin.');
    }

    saveSession(user);
    return user;
  },

  /**
   * Đăng xuất
   */
  logout(): void {
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch((err) => console.warn('Supabase signOut error:', err));
    }
    localStorage.removeItem(SESSION_STORAGE_KEY);
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  },

  /**
   * Lấy người dùng đang đăng nhập hiện tại
   */
  getCurrentUser(): Profile | null {
    const data =
      localStorage.getItem(SESSION_STORAGE_KEY) ||
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SESSION_STORAGE_KEY) : null);
    if (!data) return null;
    try {
      const user = JSON.parse(data) as Profile;
      if (isSupabaseConfigured) {
        return user && user.is_active ? user : null;
      }
      // Kiểm tra tính hợp lệ với danh sách người dùng mới nhất (Local mode)
      const latestUsers = getStoredUsers();
      const matched = latestUsers.find((u) => u.id === user.id);
      if (matched && matched.is_active) {
        return matched;
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Khôi phục phiên đăng nhập từ Supabase nếu user đã chọn "Ghi nhớ đăng nhập"
   */
  async restoreSupabaseSession(): Promise<Profile | null> {
    if (!isSupabaseConfigured) return null;
    if (localStorage.getItem(REMEMBER_ME_KEY) === 'false') return null;

    try {
      const { data } = await supabase.auth.getSession();
      const sessionUser = data?.session?.user;
      if (!sessionUser) return null;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .single();

      if (profile && profile.is_active) {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile));
        return profile as Profile;
      }
    } catch (err) {
      console.warn('Could not restore Supabase session:', err);
    }
    return null;
  },

  /**
   * Lưu / Lấy thông tin đăng nhập đã ghi nhớ (Ghi nhớ mật khẩu)
   */
  getRememberedCredentials(): { email: string; password: string } | null {
    try {
      const raw = localStorage.getItem(REMEMBERED_CREDS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed?.email && parsed?.password) return parsed;
    } catch {}
    return null;
  },

  saveRememberedCredentials(email: string, password: string): void {
    localStorage.setItem(REMEMBERED_CREDS_KEY, JSON.stringify({ email, password }));
  },

  clearRememberedCredentials(): void {
    localStorage.removeItem(REMEMBERED_CREDS_KEY);
  },

  /**
   * Cập nhật thông tin phiên người dùng hiện tại
   */
  updateSessionUser(user: Profile): void {
    const current = this.getCurrentUser();
    if (current && current.id === user.id) {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    }
  },

  /**
   * Lưu mật khẩu cho người dùng (được gọi từ Admin Service khi thêm/sửa user)
   */
  setUserPassword(email: string, password: string): void {
    const creds = getStoredCredentials();
    creds[email.toLowerCase()] = password;
    saveCredentials(creds);
  },

  /**
   * Xóa thông tin xác thực khi xóa người dùng
   */
  removeUserCredentials(email: string): void {
    const creds = getStoredCredentials();
    delete creds[email.toLowerCase()];
    saveCredentials(creds);
  },

  /**
   * Chuyển đổi nhanh tài khoản (dành cho thử nghiệm và demo)
   */
  async switchAccount(email: string): Promise<Profile> {
    const users = getStoredUsers();
    const target = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!target) {
      throw new Error('Không tìm thấy tài khoản để chuyển đổi');
    }
    if (!target.is_active) {
      throw new Error('Tài khoản này hiện đang bị khóa');
    }
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(target));
    return target;
  },

  /**
   * Cập nhật thông tin cá nhân của người dùng hiện tại
   */
  async updateProfile(userId: string, data: { full_name: string }): Promise<Profile> {
    if (isSupabaseConfigured) {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ full_name: data.full_name.trim(), updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select('*')
        .single();
      if (error || !updated) throw new Error(error?.message || 'Lỗi khi cập nhật hồ sơ');
      this.updateSessionUser(updated as Profile);
      return updated as Profile;
    }

    const users = getStoredUsers();
    const target = users.find((u) => u.id === userId);
    if (!target) throw new Error('Không tìm thấy người dùng');

    target.full_name = data.full_name.trim();
    target.updated_at = new Date().toISOString();
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    this.updateSessionUser(target);
    return target;
  },

  /**
   * Đổi mật khẩu tài khoản
   */
  async changePassword(email: string, oldPass: string, newPass: string): Promise<void> {
    if (newPass.length < 6) {
      throw new Error('Mật khẩu mới phải từ 6 ký tự trở lên');
    }
    if (oldPass === newPass) {
      throw new Error('Mật khẩu mới không được trùng với mật khẩu cũ');
    }

    if (isSupabaseConfigured) {
      // Xác thực lại mật khẩu cũ trước khi đổi
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: oldPass,
      });
      if (signInErr) {
        throw new Error('Mật khẩu hiện tại không chính xác');
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPass });
      if (updateErr) {
        throw new Error(updateErr.message || 'Lỗi khi đổi mật khẩu trên máy chủ');
      }
      return;
    }

    const emailNorm = email.toLowerCase().trim();
    const creds = getStoredCredentials();
    const currentPass = creds[emailNorm] || 'Password123!';

    if (currentPass !== oldPass) {
      throw new Error('Mật khẩu hiện tại không chính xác');
    }

    creds[emailNorm] = newPass;
    saveCredentials(creds);
  },

  /**
   * Lấy danh sách tài khoản demo
   */
  getDemoAccounts(): { email: string; name: string; role: string; isAdmin: boolean }[] {
    const users = getStoredUsers();
    return users.map((u) => ({
      email: u.email,
      name: u.full_name,
      role: u.is_system_admin ? 'Quản trị viên (Admin)' : 'Người dùng',
      isAdmin: u.is_system_admin,
    }));
  },
};
