import { z } from 'zod';
import { Transaction, TransactionType } from './database.types';

export interface TransactionWithDetails extends Transaction {
  wallet_name?: string;
}

export const createTransactionSchema = z.object({
  wallet_id: z.string().min(1, 'Vui lòng chọn quỹ hợp lệ'),
  category_id: z.string().min(1, 'Vui lòng chọn danh mục hợp lệ'),
  type: z.enum(['INCOME', 'EXPENSE', 'ADJUSTMENT'] as const),
  amount: z.coerce.number().positive('Số tiền phải lớn hơn 0'),
  transaction_date: z.string().min(1, 'Vui lòng chọn ngày giao dịch'),
  description: z.string().min(1, 'Lý do giao dịch không được để trống').max(255, 'Lý do tối đa 255 ký tự'),
  notes: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export const editTransactionSchema = z.object({
  category_id: z.string().min(1, 'Vui lòng chọn danh mục hợp lệ'),
  type: z.enum(['INCOME', 'EXPENSE', 'ADJUSTMENT'] as const),
  amount: z.coerce.number().positive('Số tiền phải lớn hơn 0'),
  transaction_date: z.string().min(1, 'Vui lòng chọn ngày giao dịch'),
  description: z.string().min(1, 'Lý do giao dịch không được để trống').max(255, 'Lý do tối đa 255 ký tự'),
  notes: z.string().max(1000, 'Ghi chú tối đa 1000 ký tự').optional(),
});

export type EditTransactionInput = z.infer<typeof editTransactionSchema>;

export const transferFundsSchema = z.object({
  source_wallet_id: z.string().min(1, 'Vui lòng chọn quỹ chuyển'),
  destination_wallet_id: z.string().min(1, 'Vui lòng chọn quỹ nhận'),
  amount: z.coerce.number().positive('Số tiền chuyển phải lớn hơn 0'),
  description: z.string().min(1, 'Nội dung chuyển tiền không được để trống').max(255, 'Nội dung tối đa 255 ký tự'),
  transfer_date: z.string().min(1, 'Vui lòng chọn ngày chuyển'),
}).refine((data) => data.source_wallet_id !== data.destination_wallet_id, {
  message: 'Quỹ nguồn và quỹ đích không được trùng nhau',
  path: ['destination_wallet_id'],
});

export type TransferFundsInput = z.infer<typeof transferFundsSchema>;

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Tên danh mục ít nhất 2 ký tự').max(100, 'Tên danh mục tối đa 100 ký tự'),
  type: z.enum(['INCOME', 'EXPENSE', 'BOTH'] as const),
  icon: z.string().default('tag'),
  color: z.string().default('#10B981'),
  wallet_id: z.string().nullable().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export interface TransactionFilterOptions {
  walletId?: string;
  categoryId?: string;
  type?: TransactionType | 'ALL';
  startDate?: string;
  endDate?: string;
  searchQuery?: string;
  sortBy?: 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
}

export interface SuggestedDescription {
  description: string;
  usage_count: number;
}
