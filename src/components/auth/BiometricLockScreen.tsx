import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, LogOut, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { biometricService } from '../../services/biometricService';

interface BiometricLockScreenProps {
  onUnlocked: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({ onUnlocked }) => {
  const { user, logout } = useAuth();
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUnlock = useCallback(async () => {
    if (!user) return;
    try {
      setIsVerifying(true);
      setErrorMsg(null);
      const ok = await biometricService.verify(user.id);
      if (ok) {
        onUnlocked();
      } else {
        setErrorMsg('Xác thực không thành công. Vui lòng thử lại.');
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') {
        setErrorMsg('Bạn đã hủy xác thực. Bấm nút bên dưới để thử lại.');
      } else {
        setErrorMsg(err?.message || 'Không thể xác thực sinh trắc học.');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [user, onUnlocked]);

  useEffect(() => {
    // Tự động bật hộp thoại quét Vân tay / Khuôn mặt khi mở app
    handleUnlock();
  }, [handleUnlock]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl shadow-xl border border-gray-100 p-7 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
          <Fingerprint className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Bảo mật sinh trắc học</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">Mở khóa ExpensePro</h2>
          <p className="text-xs text-gray-500">
            Xin chào <strong className="text-gray-800">{user?.full_name}</strong>, vui lòng xác thực Vân tay hoặc Khuôn mặt để tiếp tục.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 text-left">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleUnlock}
            disabled={isVerifying}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <Fingerprint className="w-5 h-5" />
                <span>Mở khóa bằng Vân tay / Khuôn mặt</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={logout}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-xs transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4 text-gray-400" />
            <span>Đăng xuất để dùng mật khẩu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
