import React from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, ShieldAlert, ArrowLeft } from 'lucide-react';

export const AdminRoute: React.FC = () => {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Đang xác thực quyền hạn...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-8 text-center shadow-lg shadow-red-500/5">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 border border-red-100">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Truy Cập Bị Từ Chối</h2>
          <p className="text-sm text-gray-600 mb-6 leading-relaxed">
            Khu vực Quản trị Hệ thống (Admin Portal) chỉ dành riêng cho tài khoản có vai trò <strong>System Administrator</strong>. Tài khoản của bạn không có quyền truy cập trang này.
          </p>
          <div className="flex justify-center">
            <Link
              to="/transactions"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại Giao dịch
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
