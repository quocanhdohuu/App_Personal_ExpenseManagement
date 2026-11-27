import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Wallet as WalletIcon, 
  ArrowLeftRight, 
  PieChart, 
  Tags, 
  ShieldCheck,
  Wifi, 
  WifiOff, 
  Menu,
  X,
  LogOut,
  ChevronDown,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, logout } = useAuth();
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Danh sách điều hướng: Người dùng thường chỉ thấy Giao dịch & Báo cáo; Admin thấy đầy đủ
  const userNavLinks = [
    { name: 'Giao dịch', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Báo cáo', path: '/reports', icon: PieChart },
  ];

  const adminNavLinks = [
    { name: 'Quản lý Quỹ', path: '/wallets', icon: WalletIcon },
    { name: 'Giao dịch', path: '/transactions', icon: ArrowLeftRight },
    { name: 'Báo cáo', path: '/reports', icon: PieChart },
    { name: 'Danh mục', path: '/categories', icon: Tags },
    { name: 'Quản trị Admin', path: '/admin', icon: ShieldCheck, isAdminOnly: true },
  ];

  const activeNavLinks = isAdmin ? adminNavLinks : userNavLinks;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initialLetter = user?.full_name ? user.full_name[0].toUpperCase() : 'U';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to={isAdmin ? '/admin' : '/transactions'} className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200 group-hover:bg-emerald-700 transition-colors">
                <WalletIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-gray-900 tracking-tight block leading-tight">
                  Expense<span className="text-emerald-600">Pro</span>
                </span>
                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider block">
                  Quản lý chi tiêu
                </span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1 ml-6 lg:ml-8">
              {activeNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = location.pathname.startsWith(link.path);
                const isAdminLink = (link as any).isAdminOnly;

                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? isAdminLink
                          ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                          : 'bg-emerald-50 text-emerald-700 shadow-xs'
                        : isAdminLink
                          ? 'text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50/50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${
                      isActive 
                        ? isAdminLink ? 'text-indigo-600' : 'text-emerald-600' 
                        : isAdminLink ? 'text-indigo-500' : 'text-gray-400'
                    }`} />
                    <span>{link.name}</span>
                    {isAdminLink && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 ml-1">
                        Admin
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right Status & Profile */}
          <div className="hidden sm:flex items-center gap-4">
            {/* Online / Offline Status */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
            }`}>
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Trực tuyến</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Ngoại tuyến (Offline)</span>
                </>
              )}
            </div>

            {/* User Profile Pill & Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-left"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border ${
                  isAdmin 
                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                    : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                }`}>
                  {initialLetter}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-gray-800 leading-tight">
                      {user?.full_name || 'Khách'}
                    </span>
                    {isAdmin && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1.5 py-0.2 rounded-full">
                        Admin
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 block leading-tight">
                    {user?.email || ''}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Account Header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900">{user?.full_name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        isAdmin ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isAdmin ? 'Quản trị viên' : 'Người dùng'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 block break-all">{user?.email}</span>
                  </div>

                  {/* Profile Link */}
                  <div className="p-1 border-b border-gray-100">
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      <span>Hồ sơ cá nhân & Bảo mật</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất tài khoản</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu toggle */}
          <div className="flex sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-4 space-y-2">
          {activeNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname.startsWith(link.path);
            const isAdminLink = (link as any).isAdminOnly;

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? isAdminLink ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${
                    isActive 
                      ? isAdminLink ? 'text-indigo-600' : 'text-emerald-600' 
                      : isAdminLink ? 'text-indigo-500' : 'text-gray-400'
                  }`} />
                  <span>{link.name}</span>
                </div>
                {isAdminLink && (
                  <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Đang đăng nhập:</span>
              <span className="font-semibold text-gray-900">{user?.full_name}</span>
            </div>
            <Link
              to="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Hồ sơ cá nhân</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
