import { describe, it, expect, beforeEach } from 'vitest';
import { transactionService } from '../../src/services/transactionService';
import { walletService } from '../../src/services/walletService';

describe('TransactionService - Giao dịch Thu Chi & Chuyển Tiền', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Thêm giao dịch chi tiêu mới hợp lệ', async () => {
    const wallets = await walletService.getWallets();
    const wallet = wallets[0];

    const tx = await transactionService.createTransaction({
      wallet_id: wallet.id,
      category_id: 'cat-exp-1',
      type: 'EXPENSE',
      amount: 45000,
      transaction_date: '2026-11-27',
      description: 'Cà phê sáng',
      notes: 'Uống cùng đồng nghiệp',
    });

    expect(tx.id).toBeDefined();
    expect(tx.amount).toBe(45000);
    expect(tx.type).toBe('EXPENSE');
    expect(tx.description).toBe('Cà phê sáng');
    expect(tx.is_deleted).toBe(false);
  });

  it('2. Chuyển tiền giữa các quỹ đảm bảo nguyên tử (Atomic)', async () => {
    const wallets = await walletService.getWallets();
    const sourceWallet = wallets[0];
    const destWallet = wallets[1] || wallets[0];

    const result = await transactionService.transferFunds({
      source_wallet_id: sourceWallet.id,
      destination_wallet_id: destWallet.id,
      amount: 200000,
      description: 'Chuyển tiền phụ cấp sinh hoạt',
      transfer_date: '2026-11-27',
    });

    expect(result.sourceTx).toBeDefined();
    expect(result.sourceTx.type).toBe('EXPENSE');
    expect(result.sourceTx.amount).toBe(200000);

    expect(result.destTx).toBeDefined();
    expect(result.destTx.type).toBe('INCOME');
    expect(result.destTx.amount).toBe(200000);

    expect(result.transfer).toBeDefined();
    expect(result.transfer.amount).toBe(200000);
    expect(result.transfer.source_wallet_id).toBe(sourceWallet.id);
    expect(result.transfer.destination_wallet_id).toBe(destWallet.id);
  });

  it('3. Xóa mềm giao dịch (Soft Delete) giữ lại lịch sử và version', async () => {
    const wallets = await walletService.getWallets();
    const tx = await transactionService.createTransaction({
      wallet_id: wallets[0].id,
      category_id: 'cat-exp-1',
      type: 'EXPENSE',
      amount: 100000,
      transaction_date: '2026-11-27',
      description: 'Giao dịch chuẩn bị xóa thử nghiệm',
    });

    await transactionService.softDeleteTransaction(tx.id);

    const list = await transactionService.getTransactions({ walletId: wallets[0].id });
    const found = list.find((t) => t.id === tx.id);
    // Danh sách mặc định đã lọc bỏ giao dịch bị soft delete
    expect(found).toBeUndefined();
  });
});
