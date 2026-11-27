import { 
  Wallet, 
  WalletMember, 
  WalletBalanceSummary, 
  WalletMemberRole 
} from '../types/database.types';
import { 
  CreateWalletInput, 
  EditWalletInput, 
  AdjustBalanceInput, 
  WalletWithDetails 
} from '../types/wallet.types';
import { supabase, isSupabaseConfigured, getCurrentAuthUser, CURRENT_TEST_USER, SECONDARY_TEST_USER } from './supabase';
import { loadLocalTransactions } from './transactionService';
import { syncEngine } from './syncEngine';

const LOCAL_STORAGE_KEY_WALLETS = 'app_expense_wallets_v1';
const LOCAL_STORAGE_KEY_MEMBERS = 'app_expense_wallet_members_v1';

// Initial Mock Seed Data matching seed.sql
function getInitialMockWallets(): Wallet[] {
  return [
    {
      id: '44444444-4444-4444-a444-444444444444',
      name: 'Ví cá nhân User A',
      description: 'Quỹ chi tiêu riêng của User A',
      type: 'PERSONAL',
      currency: 'VND',
      initial_balance: 5000000,
      is_archived: false,
      created_by: CURRENT_TEST_USER.id,
      version: 1,
      created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: '33333333-3333-4333-a333-333333333333',
      name: 'Quỹ sinh hoạt chung',
      description: 'Quỹ chung cho User A và User B',
      type: 'SHARED',
      currency: 'VND',
      initial_balance: 10000000,
      is_archived: false,
      created_by: CURRENT_TEST_USER.id,
      version: 1,
      created_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
    {
      id: '55555555-5555-4555-a555-555555555555',
      name: 'Ví cá nhân User B',
      description: 'Quỹ chi tiêu riêng của User B',
      type: 'PERSONAL',
      currency: 'VND',
      initial_balance: 3000000,
      is_archived: false,
      created_by: SECONDARY_TEST_USER.id,
      version: 1,
      created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ];
}

function getInitialMockMembers(): WalletMember[] {
  return [
    {
      id: 'm-1',
      wallet_id: '44444444-4444-4444-a444-444444444444',
      user_id: CURRENT_TEST_USER.id,
      role: 'OWNER',
      joined_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      profile: CURRENT_TEST_USER,
    },
    {
      id: 'm-2',
      wallet_id: '33333333-3333-4333-a333-333333333333',
      user_id: CURRENT_TEST_USER.id,
      role: 'OWNER',
      joined_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString(),
      profile: CURRENT_TEST_USER,
    },
    {
      id: 'm-3',
      wallet_id: '33333333-3333-4333-a333-333333333333',
      user_id: SECONDARY_TEST_USER.id,
      role: 'EDITOR',
      joined_at: new Date(Date.now() - 86400000 * 9).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 9).toISOString(),
      profile: SECONDARY_TEST_USER,
    },
    {
      id: 'm-4',
      wallet_id: '55555555-5555-4555-a555-555555555555',
      user_id: SECONDARY_TEST_USER.id,
      role: 'OWNER',
      joined_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
      profile: SECONDARY_TEST_USER,
    },
  ];
}

// Local storage helpers for mock mode
function loadLocalWallets(): Wallet[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_WALLETS);
  if (!data) {
    const initial = getInitialMockWallets();
    localStorage.setItem(LOCAL_STORAGE_KEY_WALLETS, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return getInitialMockWallets();
  }
}

function saveLocalWallets(wallets: Wallet[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_WALLETS, JSON.stringify(wallets));
}

function loadLocalMembers(): WalletMember[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_MEMBERS);
  if (!data) {
    const initial = getInitialMockMembers();
    localStorage.setItem(LOCAL_STORAGE_KEY_MEMBERS, JSON.stringify(initial));
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch {
    return getInitialMockMembers();
  }
}

function saveLocalMembers(members: WalletMember[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_MEMBERS, JSON.stringify(members));
}

export const walletService = {
  /**
   * Lấy danh sách toàn bộ quỹ của người dùng hiện tại
   */
  async getWallets(): Promise<WalletWithDetails[]> {
    const currentUserId = getCurrentAuthUser().id;

    if (isSupabaseConfigured) {
      try {
        const { data: memberRows, error: memberErr } = await supabase
          .from('wallet_members')
          .select('wallet_id, role')
          .eq('user_id', currentUserId);

        if (memberErr) throw memberErr;

        const walletIds = (memberRows || []).map((r) => r.wallet_id);
        if (walletIds.length === 0) return [];

        const { data: wallets, error: walletErr } = await supabase
          .from('wallets')
          .select('*')
          .in('id', walletIds)
          .order('created_at', { ascending: false });

        if (walletErr) throw walletErr;

        const results: WalletWithDetails[] = [];
        for (const w of wallets || []) {
          const balance = await this.getWalletBalance(w.id);
          const role = memberRows?.find((m) => m.wallet_id === w.id)?.role as WalletMemberRole;
          results.push({
            ...w,
            balanceSummary: balance,
            userRole: role,
          });
        }
        return results;
      } catch (err) {
        console.warn('Supabase fetch failed, falling back to local replica:', err);
      }
    }

    // Local / Offline / Mock Mode
    const currentUser = getCurrentAuthUser();
    const wallets = loadLocalWallets();
    const members = loadLocalMembers();

    const myMemberships = members.filter((m) => m.user_id === currentUserId);
    const myWalletIds = new Set(myMemberships.map((m) => m.wallet_id));

    // System Admin có quyền xem toàn bộ quỹ trong hệ thống
    const userWallets = currentUser.is_system_admin
      ? wallets
      : wallets.filter((w) => myWalletIds.has(w.id));

    return userWallets.map((w) => {
      const role = myMemberships.find((m) => m.wallet_id === w.id)?.role || (currentUser.is_system_admin ? 'OWNER' : 'VIEWER');
      const balance = this.calculateLocalBalance(w.id, w.initial_balance);
      const walletMembers = members.filter((m) => m.wallet_id === w.id);

      return {
        ...w,
        balanceSummary: balance,
        members: walletMembers,
        userRole: role,
      };
    });
  },

  /**
   * Lấy thông tin chi tiết của 1 quỹ kèm số dư và thành viên
   */
  async getWalletById(walletId: string): Promise<WalletWithDetails | null> {
    const currentUserId = getCurrentAuthUser().id;

    if (isSupabaseConfigured) {
      try {
        const { data: wallet, error: wErr } = await supabase
          .from('wallets')
          .select('*')
          .eq('id', walletId)
          .single();

        if (wErr || !wallet) throw wErr;

        const { data: memberRows } = await supabase
          .from('wallet_members')
          .select('*, profile:profiles(*)')
          .eq('wallet_id', walletId);

        const myRole = memberRows?.find((m) => m.user_id === currentUserId)?.role as WalletMemberRole;
        const balance = await this.getWalletBalance(walletId);

        return {
          ...wallet,
          members: memberRows || [],
          balanceSummary: balance,
          userRole: myRole,
        };
      } catch (err) {
        console.warn('Supabase getWalletById failed, using local fallback:', err);
      }
    }

    // Fallback mode
    const wallets = loadLocalWallets();
    const wallet = wallets.find((w) => w.id === walletId);
    if (!wallet) return null;

    const members = loadLocalMembers().filter((m) => m.wallet_id === walletId);
    const myRole = members.find((m) => m.user_id === currentUserId)?.role || (getCurrentAuthUser().is_system_admin ? 'OWNER' : 'VIEWER');
    const balance = this.calculateLocalBalance(wallet.id, wallet.initial_balance);

    return {
      ...wallet,
      members,
      balanceSummary: balance,
      userRole: myRole,
    };
  },

  /**
   * Tính toán hoặc gọi RPC lấy số dư chuẩn
   */
  async getWalletBalance(walletId: string): Promise<WalletBalanceSummary> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc('get_wallet_balance_summary', {
          p_wallet_id: walletId,
        });
        if (!error && data) return data as WalletBalanceSummary;
      } catch (err) {
        console.warn('RPC balance calculation failed:', err);
      }
    }

    const wallets = loadLocalWallets();
    const w = wallets.find((item) => item.id === walletId);
    return this.calculateLocalBalance(walletId, w?.initial_balance || 0);
  },

  /**
   * Tạo quỹ mới (Cá nhân hoặc Quỹ chung)
   */
  async createWallet(input: CreateWalletInput): Promise<WalletWithDetails> {
    const currentUser = getCurrentAuthUser();
    const currentUserId = currentUser.id;

    if (isSupabaseConfigured) {
      try {
        const { data: newWalletId, error } = await supabase.rpc('create_wallet_with_owner', {
          p_name: input.name,
          p_description: input.description || null,
          p_type: input.type,
          p_currency: input.currency,
          p_initial_balance: input.initial_balance,
        });

        if (error) throw error;
        const created = await this.getWalletById(newWalletId);
        if (created) return created;
      } catch (err) {
        console.warn('Supabase create_wallet_with_owner failed, creating locally:', err);
      }
    }

    // Local / Offline fallback
    const newWallet: Wallet = {
      id: crypto.randomUUID(),
      name: input.name,
      description: input.description || null,
      type: input.type,
      currency: input.currency || 'VND',
      initial_balance: input.initial_balance,
      is_archived: false,
      created_by: currentUserId,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const newMember: WalletMember = {
      id: crypto.randomUUID(),
      wallet_id: newWallet.id,
      user_id: currentUserId,
      role: 'OWNER',
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: currentUser,
    };

    const wallets = loadLocalWallets();
    wallets.unshift(newWallet);
    saveLocalWallets(wallets);

    const members = loadLocalMembers();
    members.push(newMember);
    saveLocalMembers(members);

    // Ghi nhận vào Sync Queue
    await syncEngine.enqueue('CREATE', 'WALLET', newWallet.id, newWallet, 1);

    return {
      ...newWallet,
      members: [newMember],
      userRole: 'OWNER',
      balanceSummary: this.calculateLocalBalance(newWallet.id, newWallet.initial_balance),
    };
  },

  /**
   * Chỉnh sửa thông tin quỹ (Tên, mô tả)
   */
  async updateWallet(walletId: string, input: EditWalletInput): Promise<Wallet> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('wallets')
          .update({
            name: input.name,
            description: input.description || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walletId)
          .select()
          .single();

        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.warn('Supabase updateWallet failed, updating locally:', err);
      }
    }

    const wallets = loadLocalWallets();
    const idx = wallets.findIndex((w) => w.id === walletId);
    if (idx === -1) throw new Error('Không tìm thấy quỹ cần sửa');

    wallets[idx] = {
      ...wallets[idx],
      name: input.name,
      description: input.description || null,
      version: wallets[idx].version + 1,
      updated_at: new Date().toISOString(),
    };

    saveLocalWallets(wallets);

    // Ghi nhận vào Sync Queue với OCC version
    await syncEngine.enqueue('UPDATE', 'WALLET', walletId, input, wallets[idx].version - 1);

    return wallets[idx];
  },

  /**
   * Đóng quỹ (Archive) hoặc Mở lại quỹ
   */
  async toggleArchiveWallet(walletId: string): Promise<boolean> {
    const wallets = loadLocalWallets();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) throw new Error('Không tìm thấy quỹ');

    const nextState = !target.is_archived;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('wallets')
          .update({ is_archived: nextState })
          .eq('id', walletId);

        if (error) throw error;
      } catch (err) {
        console.warn('Supabase archive failed, archiving locally:', err);
      }
    }

    target.is_archived = nextState;
    target.version += 1;
    target.updated_at = new Date().toISOString();
    saveLocalWallets(wallets);

    return nextState;
  },

  /**
   * Điều chỉnh số dư ban đầu của quỹ (kèm lý do)
   */
  async adjustInitialBalance(walletId: string, input: AdjustBalanceInput): Promise<WalletBalanceSummary> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('wallets')
          .update({ 
            initial_balance: input.new_initial_balance,
            updated_at: new Date().toISOString(),
          })
          .eq('id', walletId);

        if (error) throw error;
        return await this.getWalletBalance(walletId);
      } catch (err) {
        console.warn('Supabase adjustInitialBalance failed, adjusting locally:', err);
      }
    }

    const wallets = loadLocalWallets();
    const target = wallets.find((w) => w.id === walletId);
    if (!target) throw new Error('Không tìm thấy quỹ');

    target.initial_balance = input.new_initial_balance;
    target.version += 1;
    target.updated_at = new Date().toISOString();
    saveLocalWallets(wallets);

    return this.calculateLocalBalance(walletId, target.initial_balance);
  },

  /**
   * Mời thành viên vào quỹ chung
   */
  async inviteMember(walletId: string, email: string, role: 'EDITOR' | 'VIEWER'): Promise<WalletMember> {
    // Tìm profile người được mời
    const inviteeProfile = email.toLowerCase().includes('userb') 
      ? SECONDARY_TEST_USER 
      : {
          id: crypto.randomUUID(),
          email,
          full_name: email.split('@')[0],
          avatar_url: null,
          is_system_admin: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

    const members = loadLocalMembers();
    const existing = members.find((m) => m.wallet_id === walletId && m.user_id === inviteeProfile.id);
    if (existing) {
      throw new Error('Thành viên này đã tham gia quỹ');
    }

    const newMember: WalletMember = {
      id: crypto.randomUUID(),
      wallet_id: walletId,
      user_id: inviteeProfile.id,
      role: role,
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      profile: inviteeProfile,
    };

    members.push(newMember);
    saveLocalMembers(members);

    return newMember;
  },

  /**
   * Thay đổi vai trò thành viên trong quỹ (chỉ OWNER mới có quyền)
   */
  async updateMemberRole(memberId: string, newRole: WalletMemberRole): Promise<void> {
    const members = loadLocalMembers();
    const target = members.find((m) => m.id === memberId);
    if (!target) throw new Error('Không tìm thấy thành viên');

    target.role = newRole;
    target.updated_at = new Date().toISOString();
    saveLocalMembers(members);
  },

  /**
   * Xóa thành viên khỏi quỹ
   */
  async removeMember(memberId: string): Promise<void> {
    const members = loadLocalMembers();
    const filtered = members.filter((m) => m.id !== memberId);
    saveLocalMembers(filtered);
  },

  // Helper tính số dư cục bộ
  calculateLocalBalance(walletId: string, initialBalance: number): WalletBalanceSummary {
    const wallets = loadLocalWallets();
    const wallet = wallets.find((w) => w.id === walletId);

    // Tính toán động từ các giao dịch chưa bị xóa mềm của ví
    const allTx = loadLocalTransactions().filter(
      (t) => t.wallet_id === walletId && !t.is_deleted
    );

    let income = 0;
    let expense = 0;
    let adjustment = 0;

    for (const t of allTx) {
      if (t.type === 'INCOME') {
        income += t.amount;
      } else if (t.type === 'EXPENSE') {
        expense += t.amount;
      } else if (t.type === 'ADJUSTMENT') {
        adjustment += t.amount;
      }
    }

    const currentBalance = initialBalance + income - expense + adjustment;

    return {
      wallet_id: walletId,
      wallet_name: wallet?.name || 'Quỹ',
      is_archived: wallet?.is_archived || false,
      initial_balance: initialBalance,
      total_income: income,
      total_expense: expense,
      total_adjustment: adjustment,
      current_balance: currentBalance,
      transaction_count: allTx.length,
    };
  },
};
