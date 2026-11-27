import Dexie, { Table } from 'dexie';
import { Wallet, Category, Transaction, WalletMember } from '../types/database.types';

export interface LocalSyncQueueItem {
  queue_id?: number;
  id: string; // Client operation UUID
  entity_name: 'TRANSACTION' | 'WALLET' | 'CATEGORY';
  entity_id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  base_version: number;
  created_at: string;
  attempts: number;
  status: 'PENDING' | 'SYNCING' | 'SUCCESS' | 'CONFLICT' | 'FAILED';
  error_message?: string;
  conflict_data?: any;
}

export interface AppMetadataItem {
  key: string;
  value: any;
}

export class ExpenseDexieDatabase extends Dexie {
  wallets!: Table<Wallet, string>;
  wallet_members!: Table<WalletMember, string>;
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;
  sync_queue!: Table<LocalSyncQueueItem, number>;
  app_metadata!: Table<AppMetadataItem, string>;

  constructor() {
    super('ExpenseAppLocalIndexedDB');
    this.version(1).stores({
      wallets: 'id, type, is_archived, created_by, updated_at',
      wallet_members: 'id, wallet_id, user_id, role',
      categories: 'id, wallet_id, type, is_active',
      transactions: 'id, wallet_id, category_id, type, transaction_date, is_deleted, version, idempotency_key, updated_at',
      sync_queue: '++queue_id, id, entity_name, entity_id, operation, status, created_at',
      app_metadata: 'key',
    });
  }
}

export const db = new ExpenseDexieDatabase();
