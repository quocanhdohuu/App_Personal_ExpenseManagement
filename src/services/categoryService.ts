import { Category } from '../types/database.types';
import { CreateCategoryInput } from '../types/transaction.types';
import { supabase, isSupabaseConfigured } from './supabase';

const LOCAL_STORAGE_KEY_CATEGORIES = 'app_expense_categories_v1';

export const INITIAL_DEFAULT_CATEGORIES: Category[] = [
  // Thu nhập (INCOME)
  {
    id: 'cat-inc-1',
    wallet_id: null,
    name: 'Tiền lương',
    type: 'INCOME',
    icon: 'briefcase',
    color: '#10B981',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-inc-2',
    wallet_id: null,
    name: 'Tiền thưởng',
    type: 'INCOME',
    icon: 'gift',
    color: '#3B82F6',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-inc-3',
    wallet_id: null,
    name: 'Thu nhập phụ',
    type: 'INCOME',
    icon: 'cash',
    color: '#6366F1',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-inc-4',
    wallet_id: null,
    name: 'Tiền lãi / Đầu tư',
    type: 'INCOME',
    icon: 'chart-bar',
    color: '#8B5CF6',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-inc-5',
    wallet_id: null,
    name: 'Thu nhập khác',
    type: 'INCOME',
    icon: 'plus-circle',
    color: '#14B8A6',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },

  // Chi tiêu (EXPENSE)
  {
    id: 'cat-exp-1',
    wallet_id: null,
    name: 'Ăn uống',
    type: 'EXPENSE',
    icon: 'utensils',
    color: '#EF4444',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-2',
    wallet_id: null,
    name: 'Đi lại / Xăng xe',
    type: 'EXPENSE',
    icon: 'truck',
    color: '#F97316',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-3',
    wallet_id: null,
    name: 'Nhà cửa & Hóa đơn',
    type: 'EXPENSE',
    icon: 'home',
    color: '#F59E0B',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-4',
    wallet_id: null,
    name: 'Mua sắm cá nhân',
    type: 'EXPENSE',
    icon: 'shopping-bag',
    color: '#EC4899',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-5',
    wallet_id: null,
    name: 'Sức khỏe & Y tế',
    type: 'EXPENSE',
    icon: 'heart',
    color: '#06B6D4',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-6',
    wallet_id: null,
    name: 'Giáo dục & Học tập',
    type: 'EXPENSE',
    icon: 'academic-cap',
    color: '#3B82F6',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-7',
    wallet_id: null,
    name: 'Giải trí & Du lịch',
    type: 'EXPENSE',
    icon: 'film',
    color: '#84CC16',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-exp-8',
    wallet_id: null,
    name: 'Chi phí khác',
    type: 'EXPENSE',
    icon: 'minus-circle',
    color: '#6B7280',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },

  // BOTH (Chuyển tiền & Điều chỉnh)
  {
    id: 'cat-both-1',
    wallet_id: null,
    name: 'Chuyển tiền',
    type: 'BOTH',
    icon: 'arrows-right-left',
    color: '#64748B',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
  {
    id: 'cat-both-2',
    wallet_id: null,
    name: 'Điều chỉnh số dư',
    type: 'BOTH',
    icon: 'adjustments-horizontal',
    color: '#0EA5E9',
    is_default: true,
    is_active: true,
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: new Date('2026-01-01').toISOString(),
  },
];

function loadLocalCategories(): Category[] {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY_CATEGORIES);
  if (!data) {
    localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(INITIAL_DEFAULT_CATEGORIES));
    return INITIAL_DEFAULT_CATEGORIES;
  }
  try {
    return JSON.parse(data);
  } catch {
    return INITIAL_DEFAULT_CATEGORIES;
  }
}

function saveLocalCategories(categories: Category[]): void {
  localStorage.setItem(LOCAL_STORAGE_KEY_CATEGORIES, JSON.stringify(categories));
}

export const categoryService = {
  /**
   * Lấy danh sách danh mục (Hệ thống + Danh mục riêng của quỹ nếu có)
   */
  async getCategories(walletId?: string): Promise<Category[]> {
    if (isSupabaseConfigured) {
      try {
        let query = supabase
          .from('categories')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (walletId) {
          query = query.or(`wallet_id.is.null,wallet_id.eq.${walletId}`);
        } else {
          query = query.is('wallet_id', null);
        }

        const { data, error } = await query;
        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase categories fetch failed, using local fallback:', err);
      }
    }

    const categories = loadLocalCategories();
    return categories.filter((c) => {
      if (!c.is_active) return false;
      if (!walletId) return c.wallet_id === null;
      return c.wallet_id === null || c.wallet_id === walletId;
    });
  },

  /**
   * Tạo danh mục mới
   */
  async createCategory(input: CreateCategoryInput): Promise<Category> {
    const newCategory: Category = {
      id: crypto.randomUUID(),
      wallet_id: input.wallet_id || null,
      name: input.name,
      type: input.type,
      icon: input.icon || 'tag',
      color: input.color || '#10B981',
      is_default: false,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('categories')
          .insert([newCategory])
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase createCategory failed, storing locally:', err);
      }
    }

    const categories = loadLocalCategories();
    categories.push(newCategory);
    saveLocalCategories(categories);
    return newCategory;
  },

  /**
   * Cập nhật danh mục
   */
  async updateCategory(id: string, updates: Partial<Category>): Promise<Category> {
    const categories = loadLocalCategories();
    const idx = categories.findIndex((c) => c.id === id);
    if (idx === -1) throw new Error('Không tìm thấy danh mục');

    categories[idx] = {
      ...categories[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    saveLocalCategories(categories);
    return categories[idx];
  },
};
