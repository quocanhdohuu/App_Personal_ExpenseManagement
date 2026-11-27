import { db, LocalSyncQueueItem } from '../database/dexieDb';
import { supabase, isSupabaseConfigured } from './supabase';
import { loadLocalTransactions } from './transactionService';

export interface SyncEngineStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  conflictItem: LocalSyncQueueItem | null;
}

type SyncListener = (status: SyncEngineStatus) => void;

class SyncEngineService {
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private pendingCount: number = 0;
  private lastSyncedAt: string | null = null;
  private deviceId: string = '';
  private conflictItem: LocalSyncQueueItem | null = null;
  private listeners: Set<SyncListener> = new Set();
  private heartbeatTimer: any = null;

  constructor() {
    this.init();
  }

  /**
   * Khởi tạo Sync Engine
   */
  async init(): Promise<void> {
    // 1. Lấy hoặc sinh deviceId cố định cho thiết bị này
    const devIdItem = await db.app_metadata.get('device_id');
    if (!devIdItem) {
      this.deviceId = `device_${crypto.randomUUID()}`;
      await db.app_metadata.put({ key: 'device_id', value: this.deviceId });
    } else {
      this.deviceId = devIdItem.value;
    }

    // 2. Lấy thời điểm đồng bộ gần nhất
    const lastSyncItem = await db.app_metadata.get('last_synced_at');
    if (lastSyncItem) {
      this.lastSyncedAt = lastSyncItem.value;
    }

    // 3. Đồng bộ dữ liệu ban đầu từ local storage vào Dexie nếu IndexedDB chưa có
    await this.seedDexieFromLocalStorage();

    // 4. Lắng nghe sự kiện Online / Offline
    window.addEventListener('online', () => this.handleNetworkChange(true));
    window.addEventListener('offline', () => this.handleNetworkChange(false));

    // 5. Cập nhật số lượng tác vụ đang chờ
    await this.updatePendingCount();

    // 6. Bật Heartbeat kiểm tra định kỳ mỗi 30 giây
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (navigator.onLine && !this.isSyncing) {
        this.processQueue();
      }
    }, 30000);

    // Nếu mạng đang sẵn sàng, xử lý ngay
    if (this.isOnline) {
      this.processQueue();
    }
  }

  /**
   * Xử lý khi trạng thái mạng thay đổi
   */
  private async handleNetworkChange(online: boolean): Promise<void> {
    this.isOnline = online;
    this.notify();

    if (online) {
      console.log('[SyncEngine] Đã có kết nối Internet trở lại! Kích hoạt đồng bộ tự động...');
      await this.processQueue();
    } else {
      console.log('[SyncEngine] Thiết bị chuyển sang chế độ Ngoại tuyến (Offline).');
    }
  }

  /**
   * Thêm tác vụ vào hàng đợi Sync Queue (khi Thêm / Sửa / Xóa)
   */
  async enqueue(
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    entityName: 'TRANSACTION' | 'WALLET' | 'CATEGORY',
    entityId: string,
    payload: any,
    baseVersion: number = 1
  ): Promise<void> {
    const queueItem: LocalSyncQueueItem = {
      id: crypto.randomUUID(), // Unique client operation id
      entity_name: entityName,
      entity_id: entityId,
      operation,
      payload,
      base_version: baseVersion,
      created_at: new Date().toISOString(),
      attempts: 0,
      status: 'PENDING',
    };

    await db.sync_queue.add(queueItem);
    await this.updatePendingCount();

    // Nếu đang online, cố gắng đẩy ngay
    if (this.isOnline && !this.isSyncing) {
      this.processQueue();
    }
  }

  /**
   * Thực thi đẩy hàng đợi lên Server (Supabase RPC hoặc Simulation)
   */
  async processQueue(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    const pendingItems = await db.sync_queue
      .where('status')
      .equals('PENDING')
      .sortBy('created_at');

    if (pendingItems.length === 0) {
      // Cập nhật mốc thời gian hoàn thành
      this.lastSyncedAt = new Date().toISOString();
      await db.app_metadata.put({ key: 'last_synced_at', value: this.lastSyncedAt });
      this.notify();
      return;
    }

    this.isSyncing = true;
    this.notify();

    try {
      console.log(`[SyncEngine] Đang xử lý ${pendingItems.length} tác vụ đồng bộ...`);

      for (const item of pendingItems) {
        // Cập nhật trạng thái SYNCING
        await db.sync_queue.update(item.queue_id!, {
          status: 'SYNCING',
          attempts: item.attempts + 1,
        });

        if (isSupabaseConfigured) {
          // Gửi lên RPC Supabase
          try {
            const { data, error } = await supabase.rpc('sync_batch_transactions', {
              p_device_id: this.deviceId,
              p_operations: [item],
            });

            if (error) throw error;
            const res = Array.isArray(data) ? data[0] : null;

            if (res?.status === 'SUCCESS') {
              await db.sync_queue.delete(item.queue_id!);
            } else if (res?.status === 'CONFLICT') {
              console.warn('[SyncEngine] Phát hiện xung đột phiên bản (OCC):', res);
              item.status = 'CONFLICT';
              item.conflict_data = res.server_record;
              await db.sync_queue.update(item.queue_id!, {
                status: 'CONFLICT',
                conflict_data: res.server_record,
              });
              this.conflictItem = item;
              this.notify();
              break; // Dừng lại để người dùng chọn giải quyết xung đột
            } else if (res?.status === 'FAILED_PERMISSION_REVOKED') {
              console.error('[SyncEngine] Người dùng bị thu hồi quyền trong lúc offline:', res);
              await db.sync_queue.update(item.queue_id!, {
                status: 'FAILED',
                error_message: 'Bạn không còn quyền truy cập quỹ này.',
              });
            }
          } catch (err: any) {
            console.warn('[SyncEngine] Lỗi khi đồng bộ lên Supabase:', err);
            await db.sync_queue.update(item.queue_id!, {
              status: 'PENDING',
              error_message: err.message,
            });
            break;
          }
        } else {
          // Mock / Local Sync Mode: Tự động xác nhận thành công sau 300ms mô phỏng
          await new Promise((resolve) => setTimeout(resolve, 300));
          await db.sync_queue.delete(item.queue_id!);
        }
      }

      this.lastSyncedAt = new Date().toISOString();
      await db.app_metadata.put({ key: 'last_synced_at', value: this.lastSyncedAt });
    } catch (err) {
      console.error('[SyncEngine] Lỗi trong quá trình processQueue:', err);
    } finally {
      this.isSyncing = false;
      await this.updatePendingCount();
      this.notify();
    }
  }

  /**
   * GIẢI QUYẾT XUNG ĐỘT (Conflict Resolution)
   * 1. SERVER_WINS: Ghi đè cục bộ bằng bản ghi máy chủ
   * 2. CLIENT_WINS: Giữ bản sửa cục bộ (ép tăng version)
   * 3. FORK_NEW: Tách thành giao dịch mới độc lập
   */
  async resolveConflict(
    queueId: number,
    strategy: 'SERVER_WINS' | 'CLIENT_WINS' | 'FORK_NEW'
  ): Promise<void> {
    const item = await db.sync_queue.get(queueId);
    if (!item) return;

    if (strategy === 'SERVER_WINS') {
      if (item.conflict_data) {
        await db.transactions.put(item.conflict_data);
      }
      await db.sync_queue.delete(queueId);
    } else if (strategy === 'CLIENT_WINS') {
      // Cập nhật base_version tăng lên để khớp server
      const serverVer = item.conflict_data?.version || item.base_version + 1;
      await db.sync_queue.update(queueId, {
        base_version: serverVer,
        status: 'PENDING',
      });
    } else if (strategy === 'FORK_NEW') {
      // Tạo giao dịch mới với UUID mới
      const newId = crypto.randomUUID();
      const forkedPayload = {
        ...item.payload,
        id: newId,
        description: `${item.payload.description} (Bản tách)`,
      };
      await db.transactions.put({
        ...forkedPayload,
        version: 1,
        is_deleted: false,
      });
      await db.sync_queue.delete(queueId);
      await this.enqueue('CREATE', 'TRANSACTION', newId, forkedPayload, 1);
    }

    this.conflictItem = null;
    await this.updatePendingCount();
    this.notify();

    // Tiếp tục hàng đợi
    this.processQueue();
  }

  /**
   * Cưỡng bức đồng bộ ngay khi người dùng nhấn nút
   */
  async syncNow(): Promise<void> {
    if (!this.isOnline) {
      alert('Thiết bị đang Ngoại tuyến (Offline). Hệ thống sẽ tự động đồng bộ khi có Internet.');
      return;
    }
    await this.processQueue();
  }

  /**
   * Đếm số tác vụ còn PENDING
   */
  private async updatePendingCount(): Promise<void> {
    this.pendingCount = await db.sync_queue.where('status').equals('PENDING').count();
    this.notify();
  }

  /**
   * Khởi tạo dữ liệu Dexie từ Local Storage
   */
  private async seedDexieFromLocalStorage(): Promise<void> {
    const count = await db.transactions.count();
    if (count === 0) {
      const initial = loadLocalTransactions();
      if (initial.length > 0) {
        await db.transactions.bulkPut(initial);
      }
    }
  }

  /**
   * Lấy trạng thái hiện tại
   */
  getStatus(): SyncEngineStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingCount: this.pendingCount,
      lastSyncedAt: this.lastSyncedAt,
      conflictItem: this.conflictItem,
    };
  }

  /**
   * Đăng ký lắng nghe thay đổi trạng thái
   */
  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const status = this.getStatus();
    this.listeners.forEach((listener) => listener(status));
  }
}

export const syncEngine = new SyncEngineService();
