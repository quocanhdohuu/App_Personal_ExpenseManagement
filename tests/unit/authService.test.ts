import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../../src/services/authService';

describe('AuthService - Xác thực & Quản lý Phiên làm việc', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('1. Đăng nhập thành công với tài khoản Admin mặc định', async () => {
    const user = await authService.login({
      email: 'admin@expense.local',
      password: 'Password123!',
    });

    expect(user).toBeDefined();
    expect(user.email).toBe('admin@expense.local');
    expect(user.is_system_admin).toBe(true);
    expect(user.is_active).toBe(true);

    const currentUser = authService.getCurrentUser();
    expect(currentUser?.id).toBe(user.id);
  });

  it('2. Đăng nhập thành công với tài khoản Người dùng A', async () => {
    const user = await authService.login({
      email: 'usera@expense.local',
      password: 'Password123!',
    });

    expect(user).toBeDefined();
    expect(user.full_name).toBe('Người dùng A');
    expect(user.is_system_admin).toBe(false);
  });

  it('3. Từ chối đăng nhập khi sai mật khẩu', async () => {
    await expect(
      authService.login({
        email: 'admin@expense.local',
        password: 'WrongPassword!',
      })
    ).rejects.toThrow('Mật khẩu đăng nhập không chính xác');
  });

  it('4. Từ chối đăng nhập khi email không tồn tại', async () => {
    await expect(
      authService.login({
        email: 'nonexistent@expense.local',
        password: 'Password123!',
      })
    ).rejects.toThrow('Tài khoản email không tồn tại trong hệ thống');
  });

  it('5. Cập nhật họ tên cá nhân thành công', async () => {
    const user = await authService.login({
      email: 'usera@expense.local',
      password: 'Password123!',
    });

    const updated = await authService.updateProfile(user.id, {
      full_name: 'Nguyễn Văn A (Đã cập nhật)',
    });

    expect(updated.full_name).toBe('Nguyễn Văn A (Đã cập nhật)');
    const session = authService.getCurrentUser();
    expect(session?.full_name).toBe('Nguyễn Văn A (Đã cập nhật)');
  });

  it('6. Đổi mật khẩu cá nhân thành công và đăng nhập lại bằng mật khẩu mới', async () => {
    await authService.changePassword('usera@expense.local', 'Password123!', 'NewPassword456!');

    // Đăng nhập bằng mật khẩu cũ phải bị từ chối
    await expect(
      authService.login({
        email: 'usera@expense.local',
        password: 'Password123!',
      })
    ).rejects.toThrow('Mật khẩu đăng nhập không chính xác');

    // Đăng nhập bằng mật khẩu mới phải thành công
    const user = await authService.login({
      email: 'usera@expense.local',
      password: 'NewPassword456!',
    });
    expect(user.email).toBe('usera@expense.local');
  });

  it('7. Đăng xuất xóa phiên làm việc', async () => {
    await authService.login({
      email: 'admin@expense.local',
      password: 'Password123!',
    });
    expect(authService.getCurrentUser()).not.toBeNull();

    authService.logout();
    expect(authService.getCurrentUser()).toBeNull();
  });
});
