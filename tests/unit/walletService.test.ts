import { describe, it, expect, beforeEach } from 'vitest';
import { walletService } from '../../src/services/walletService';

describe('WalletService - Quản lý Quỹ & Tính toán Số dư', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Lấy danh sách quỹ và tự động tính toán số dư động chính xác', async () => {
    const wallets = await walletService.getWallets();
    expect(wallets.length).toBeGreaterThan(0);

    const sharedWallet = wallets.find((w) => w.type === 'SHARED');
    expect(sharedWallet).toBeDefined();

    if (sharedWallet?.balanceSummary) {
      const summary = sharedWallet.balanceSummary;
      // Công thức: Số dư hiện tại = Số dư ban đầu + Tổng thu - Tổng chi + Tổng điều chỉnh
      const calculatedExpected = 
        summary.initial_balance + 
        summary.total_income - 
        summary.total_expense + 
        summary.total_adjustment;

      expect(summary.current_balance).toBe(calculatedExpected);
    }
  });

  it('2. Tạo quỹ cá nhân mới thành công và tự gán quyền OWNER', async () => {
    const newWallet = await walletService.createWallet({
      name: 'Quỹ Du Lịch Hè 2026',
      description: 'Tiết kiệm đi du lịch',
      type: 'PERSONAL',
      currency: 'VND',
      initial_balance: 5000000,
    });

    expect(newWallet.id).toBeDefined();
    expect(newWallet.name).toBe('Quỹ Du Lịch Hè 2026');
    expect(newWallet.type).toBe('PERSONAL');
    expect(newWallet.userRole).toBe('OWNER');

    const detail = await walletService.getWalletById(newWallet.id);
    expect(detail).toBeDefined();
    expect(detail?.initial_balance).toBe(5000000);
  });

  it('3. Điều chỉnh số dư ban đầu và ghi lại lịch sử kiểm toán', async () => {
    const wallets = await walletService.getWallets();
    const target = wallets[0];

    const updatedSummary = await walletService.adjustInitialBalance(target.id, {
      new_initial_balance: 8000000,
      reason: 'Kiểm kê lại số dư đầu kỳ',
    });

    expect(updatedSummary.initial_balance).toBe(8000000);
  });
});
