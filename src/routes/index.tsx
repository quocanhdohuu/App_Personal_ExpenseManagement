import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { WalletListPage } from '../pages/wallets/WalletListPage';
import { WalletDetailPage } from '../pages/wallets/WalletDetailPage';
import { TransactionListPage } from '../pages/transactions/TransactionListPage';
import { ReportPage } from '../pages/reports/ReportPage';
import { CategoryListPage } from '../pages/categories/CategoryListPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { ProfilePage } from '../pages/profile/ProfilePage';
import { LoginPage } from '../pages/auth/LoginPage';
import { ProtectedRoute } from './ProtectedRoute';
import { AdminRoute } from './AdminRoute';

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Route */}
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Routes Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/transactions" replace />} />
          <Route path="transactions" element={<TransactionListPage />} />
          <Route path="reports" element={<ReportPage />} />
          <Route path="profile" element={<ProfilePage />} />

          {/* Admin-Only Routes */}
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="wallets" element={<WalletListPage />} />
            <Route path="wallets/:id" element={<WalletDetailPage />} />
            <Route path="categories" element={<CategoryListPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/transactions" replace />} />
        </Route>
      </Route>
    </Routes>
  );
};
