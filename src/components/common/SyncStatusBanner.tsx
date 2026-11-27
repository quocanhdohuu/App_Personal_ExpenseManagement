import React, { useState, useEffect } from 'react';
import { syncEngine, SyncEngineStatus } from '../../services/syncEngine';
import { WifiOff, RefreshCw } from 'lucide-react';
import { ConflictResolutionModal } from './ConflictResolutionModal';

export const SyncStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<SyncEngineStatus>(syncEngine.getStatus());

  useEffect(() => {
    const unsubscribe = syncEngine.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    await syncEngine.syncNow();
  };

  return (
    <>
      {/* 1. Offline Notification Bar */}
      {!status.isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
            <span>
              <strong>Chế độ Ngoại tuyến (Offline):</strong> Bạn vẫn có thể ghi chép, xem số dư và thao tác bình thường qua IndexedDB.
              {status.pendingCount > 0 && ` (${status.pendingCount} thao tác đang chờ kết nối lại)`}
            </span>
          </div>
        </div>
      )}

      {/* 2. Pending Sync Items Bar (when online but pending items exist) */}
      {status.isOnline && status.pendingCount > 0 && (
        <div className="bg-blue-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-between shadow-sm">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div className="flex items-center gap-2">
              <RefreshCw className={`w-4 h-4 flex-shrink-0 ${status.isSyncing ? 'animate-spin' : ''}`} />
              <span>
                Hàng đợi có <strong>{status.pendingCount}</strong> thao tác chưa đồng bộ lên máy chủ.
              </span>
            </div>

            <button
              onClick={handleManualSync}
              disabled={status.isSyncing}
              className="px-3 py-1 bg-white text-blue-700 hover:bg-blue-50 font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              {status.isSyncing ? 'Đang gửi...' : 'Đồng bộ ngay'}
            </button>
          </div>
        </div>
      )}

      {/* Conflict Resolution Modal if conflict occurs */}
      <ConflictResolutionModal
        conflictItem={status.conflictItem}
        onClose={() => {}}
      />
    </>
  );
};
