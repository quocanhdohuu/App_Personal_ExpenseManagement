import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../common/Navbar';
import { SyncStatusBanner } from '../common/SyncStatusBanner';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      <SyncStatusBanner />
      <Navbar />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-200 py-6 text-center text-xs text-gray-400 mt-auto">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2026 Expense Management App • Kiến trúc Offline-First • Hỗ trợ Quỹ cá nhân & Quỹ chung</p>
        </div>
      </footer>
    </div>
  );
};
