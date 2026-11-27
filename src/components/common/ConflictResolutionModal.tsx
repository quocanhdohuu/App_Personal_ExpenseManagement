import React from 'react';
import { Modal } from './Modal';
import { LocalSyncQueueItem } from '../../database/dexieDb';
import { syncEngine } from '../../services/syncEngine';
import { AlertTriangle, Server, Smartphone, GitBranch, ArrowRight } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface ConflictResolutionModalProps {
  conflictItem: LocalSyncQueueItem | null;
  onClose: () => void;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  conflictItem,
  onClose,
}) => {
  if (!conflictItem) return null;

  const local = conflictItem.payload || {};
  const server = conflictItem.conflict_data || {};

  const handleResolve = async (strategy: 'SERVER_WINS' | 'CLIENT_WINS' | 'FORK_NEW') => {
    if (!conflictItem.queue_id) return;
    await syncEngine.resolveConflict(conflictItem.queue_id, strategy);
    onClose();
  };

  return (
    <Modal
      isOpen={Boolean(conflictItem)}
      onClose={onClose}
      title="Phát Hiện Xung Đột Dữ Liệu (Data Conflict)"
      description="Giao dịch này đã được chỉnh sửa trên một thiết bị khác trong thời gian bạn ngoại tuyến."
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Warning Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Kiểm soát tương tranh lạc quan (OCC):</span>
            Số hiệu phiên bản máy chủ (v{server.version || 2}) cao hơn phiên bản gốc lúc bạn đọc (v{conflictItem.base_version}). Vui lòng chọn cách xử lý để bảo toàn dữ liệu.
          </div>
        </div>

        {/* Side by side comparison */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Local Edit */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-gray-800">
              <Smartphone className="w-4 h-4 text-blue-600" />
              <span>Bản Sửa Cục Bộ (Thiết Bị Này)</span>
            </div>
            <div className="space-y-1 text-gray-600">
              <div><span className="text-gray-400">Lý do:</span> <span className="font-semibold text-gray-900">{local.description}</span></div>
              <div><span className="text-gray-400">Số tiền:</span> <span className="font-bold text-gray-900">{formatCurrency(local.amount || 0)}</span></div>
              <div><span className="text-gray-400">Loại:</span> {local.type}</div>
              <div><span className="text-gray-400">Phiên bản:</span> v{conflictItem.base_version}</div>
            </div>
          </div>

          {/* Server Version */}
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-emerald-900">
              <Server className="w-4 h-4 text-emerald-600" />
              <span>Bản Ghi Trên Máy Chủ (Server)</span>
            </div>
            <div className="space-y-1 text-gray-600">
              <div><span className="text-gray-400">Lý do:</span> <span className="font-semibold text-gray-900">{server.description}</span></div>
              <div><span className="text-gray-400">Số tiền:</span> <span className="font-bold text-gray-900">{formatCurrency(server.amount || 0)}</span></div>
              <div><span className="text-gray-400">Loại:</span> {server.type}</div>
              <div><span className="text-gray-400">Phiên bản:</span> v{server.version || 2}</div>
            </div>
          </div>
        </div>

        {/* 3 Strategy Choices */}
        <div className="space-y-2.5 pt-2">
          {/* Choice 1: Server Wins */}
          <button
            onClick={() => handleResolve('SERVER_WINS')}
            className="w-full p-3.5 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-gray-900 block group-hover:text-emerald-700">
                1. Giữ dữ liệu máy chủ (Server Wins - Khuyên dùng)
              </span>
              <span className="text-[11px] text-gray-500">
                Hủy bỏ thay đổi cục bộ và cập nhật theo bản ghi mới nhất của máy chủ.
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-emerald-600" />
          </button>

          {/* Choice 2: Client Wins */}
          <button
            onClick={() => handleResolve('CLIENT_WINS')}
            className="w-full p-3.5 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50/40 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-gray-900 block group-hover:text-blue-700">
                2. Ghi đè bằng dữ liệu này (Client Wins)
              </span>
              <span className="text-[11px] text-gray-500">
                Ép máy chủ cập nhật theo phiên bản cục bộ của thiết bị này.
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
          </button>

          {/* Choice 3: Fork New */}
          <button
            onClick={() => handleResolve('FORK_NEW')}
            className="w-full p-3.5 rounded-xl border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50/40 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <span className="text-xs font-bold text-gray-900 block group-hover:text-indigo-700">
                3. Tách thành giao dịch mới (Fork New Transaction)
              </span>
              <span className="text-[11px] text-gray-500">
                Lưu giữ cả 2: bản trên máy chủ giữ nguyên, bản này lưu thành giao dịch mới độc lập.
              </span>
            </div>
            <GitBranch className="w-4 h-4 text-gray-400 group-hover:text-indigo-600" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
