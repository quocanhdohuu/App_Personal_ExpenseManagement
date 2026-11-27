export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WalletType = 'PERSONAL' | 'SHARED';
export type WalletMemberRole = 'OWNER' | 'EDITOR' | 'VIEWER';
export type TransactionType = 'INCOME' | 'EXPENSE' | 'ADJUSTMENT';
export type CategoryType = 'INCOME' | 'EXPENSE' | 'BOTH';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  is_system_admin: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  name: string;
  description?: string | null;
  type: WalletType;
  currency: string;
  initial_balance: number;
  is_archived: boolean;
  created_by: string;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WalletMember {
  id: string;
  wallet_id: string;
  user_id: string;
  role: WalletMemberRole;
  joined_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface WalletInvitation {
  id: string;
  wallet_id: string;
  invitee_email: string;
  invited_by: string;
  role: 'EDITOR' | 'VIEWER';
  status: InvitationStatus;
  token: string;
  expires_at: string;
  created_at: string;
}

export interface Category {
  id: string;
  wallet_id?: string | null;
  name: string;
  type: CategoryType;
  icon?: string | null;
  color?: string | null;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  category_id: string;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  description: string;
  notes?: string | null;
  created_by: string;
  is_deleted: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  version: number;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
  creator?: Profile;
}

export interface WalletTransfer {
  id: string;
  source_wallet_id: string;
  destination_wallet_id: string;
  amount: number;
  transfer_date: string;
  description: string;
  source_transaction_id: string;
  destination_transaction_id: string;
  created_by: string;
  created_at: string;
}

export interface WalletBalanceSummary {
  wallet_id: string;
  wallet_name: string;
  is_archived: boolean;
  initial_balance: number;
  total_income: number;
  total_expense: number;
  total_adjustment: number;
  current_balance: number;
  transaction_count: number;
}
