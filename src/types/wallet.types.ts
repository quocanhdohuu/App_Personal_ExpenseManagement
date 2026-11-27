import { z } from 'zod';
import { Wallet, WalletBalanceSummary, WalletMember, WalletMemberRole } from './database.types';

export interface WalletWithDetails extends Wallet {
  balanceSummary?: WalletBalanceSummary;
  members?: WalletMember[];
  userRole?: WalletMemberRole;
}

// Zod validation schemas
export const createWalletSchema = z.object({
  name: z.string().min(2, 'Tên quỹ phải có ít nhất 2 ký tự').max(100, 'Tên quỹ tối đa 100 ký tự'),
  description: z.string().max(500, 'Mô tả tối đa 500 ký tự').optional(),
  type: z.enum(['PERSONAL', 'SHARED'] as const),
  currency: z.string().default('VND'),
  initial_balance: z.number().min(0, 'Số dư ban đầu không được âm'),
});

export type CreateWalletInput = z.infer<typeof createWalletSchema>;

export const editWalletSchema = z.object({
  name: z.string().min(2, 'Tên quỹ phải có ít nhất 2 ký tự').max(100, 'Tên quỹ tối đa 100 ký tự'),
  description: z.string().max(500, 'Mô tả tối đa 500 ký tự').optional(),
});

export type EditWalletInput = z.infer<typeof editWalletSchema>;

export const adjustBalanceSchema = z.object({
  new_initial_balance: z.number().min(0, 'Số dư ban đầu không được âm'),
  reason: z.string().min(3, 'Lý do điều chỉnh tối thiểu 3 ký tự').max(255, 'Lý do tối đa 255 ký tự'),
});

export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;

export const inviteMemberSchema = z.object({
  email: z.string().email('Địa chỉ email không hợp lệ'),
  role: z.enum(['EDITOR', 'VIEWER'] as const),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
