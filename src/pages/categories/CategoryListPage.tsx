import React, { useState, useEffect } from 'react';
import { Plus, Tag, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import { Category } from '../../types/database.types';
import { CreateCategoryInput } from '../../types/transaction.types';
import { Badge } from '../../components/common/Badge';
import { CreateCategoryModal } from '../../components/category/CreateCategoryModal';

export const CategoryListPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const list = await categoryService.getCategories();
      setCategories(list);
    } catch (err) {
      console.error('Error loading categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleCreateCategory = async (input: CreateCategoryInput) => {
    await categoryService.createCategory(input);
    await loadCategories();
  };

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCategories = categories.filter((c) => c.type === 'INCOME');
  const bothCategories = categories.filter((c) => c.type === 'BOTH');

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            Quản Lý Danh Mục
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Danh mục thu nhập, chi phí và luân chuyển tài chính được phân loại chuẩn mực
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          <span>Tạo Danh Mục Mới</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Expense Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-600 font-bold text-base">
              <ArrowDownRight className="w-5 h-5" />
              <h2>Danh Mục Chi Tiêu ({expenseCategories.length})</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {expenseCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between gap-3 hover:border-red-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: cat.color || '#EF4444' }}
                    >
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">{cat.name}</span>
                      <span className="text-[10px] text-gray-400">
                        {cat.wallet_id ? 'Quỹ riêng' : 'Mặc định hệ thống'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="danger">Chi tiêu</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Income Categories */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-base">
              <ArrowUpRight className="w-5 h-5" />
              <h2>Danh Mục Thu Nhập ({incomeCategories.length})</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {incomeCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between gap-3 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: cat.color || '#10B981' }}
                    >
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">{cat.name}</span>
                      <span className="text-[10px] text-gray-400">
                        {cat.wallet_id ? 'Quỹ riêng' : 'Mặc định hệ thống'}
                      </span>
                    </div>
                  </div>
                  <Badge variant="success">Thu nhập</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Special Both Categories (Chuyển tiền, Điều chỉnh) */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-base">
              <ArrowRightLeft className="w-5 h-5" />
              <h2>Nghiệp Vụ Luân Chuyển & Điều Chỉnh ({bothCategories.length})</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {bothCategories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-between gap-3 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: cat.color || '#64748B' }}
                    >
                      <Tag className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900 block">{cat.name}</span>
                      <span className="text-[10px] text-gray-400">Toàn hệ thống</span>
                    </div>
                  </div>
                  <Badge variant="info">Hai chiều</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Create Category Modal */}
      <CreateCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateCategory}
      />
    </div>
  );
};
