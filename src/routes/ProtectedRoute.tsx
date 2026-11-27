import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2 } from 'lucide-react';
import { BiometricLockScreen } from '../components/auth/BiometricLockScreen';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, isBiometricLocked, unlockBiometric } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Đang tải phiên làm việc...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isBiometricLocked) {
    return <BiometricLockScreen onUnlocked={unlockBiometric} />;
  }

  return <Outlet />;
};
