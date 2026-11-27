import { createClient } from '@supabase/supabase-js';
import { Profile } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder-project.supabase.co', 'placeholder-anon-key');

// Current User State Helper (Defaults to User A from seed.sql)
export const CURRENT_TEST_USER: Profile = {
  id: '11111111-1111-4111-a111-111111111111',
  email: 'usera@expense.local',
  full_name: 'Người dùng A',
  avatar_url: null,
  is_system_admin: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

export const SECONDARY_TEST_USER: Profile = {
  id: '22222222-2222-4222-a222-222222222222',
  email: 'userb@expense.local',
  full_name: 'Người dùng B',
  avatar_url: null,
  is_system_admin: false,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

export const getCurrentAuthUser = (): Profile => {
  try {
    const raw = localStorage.getItem('app_expense_auth_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    }
  } catch {}
  return CURRENT_TEST_USER;
};

/**
 * Trả về danh sách wallet_id mà người dùng hiện tại có quyền truy cập trong chế độ Local/Offline.
 * Trả về null nếu là System Admin (có quyền xem toàn bộ quỹ).
 */
export const getAccessibleLocalWalletIds = (): Set<string> | null => {
  const user = getCurrentAuthUser();
  if (user.is_system_admin) {
    return null;
  }

  try {
    const rawMembers = localStorage.getItem('app_expense_wallet_members_v1');
    if (rawMembers) {
      const members = JSON.parse(rawMembers) as { wallet_id: string; user_id: string }[];
      return new Set(members.filter((m) => m.user_id === user.id).map((m) => m.wallet_id));
    }
  } catch {}

  if (user.id === CURRENT_TEST_USER.id) {
    return new Set(['44444444-4444-4444-a444-444444444444', '33333333-3333-4333-a333-333333333333']);
  }
  if (user.id === SECONDARY_TEST_USER.id) {
    return new Set(['55555555-5555-4555-a555-555555555555', '33333333-3333-4333-a333-333333333333']);
  }
  return new Set();
};
