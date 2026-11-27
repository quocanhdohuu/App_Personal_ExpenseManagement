import { z } from 'zod';
import { Profile } from './database.types';

export const loginSchema = z.object({
  email: z.string().min(1, 'Email không được để trống').email('Định dạng email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
});

export type LoginCredentials = z.infer<typeof loginSchema>;

export const createUserSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên'),
  email: z.string().min(1, 'Email không được để trống').email('Định dạng email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải từ 6 ký tự trở lên'),
  is_system_admin: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  full_name: z.string().min(2, 'Họ tên phải từ 2 ký tự trở lên'),
  email: z.string().min(1, 'Email không được để trống').email('Định dạng email không hợp lệ'),
  password: z.string().optional().refine((val) => !val || val.length >= 6, {
    message: 'Mật khẩu mới phải từ 6 ký tự trở lên nếu muốn thay đổi',
  }),
  is_system_admin: z.boolean().default(false),
  is_active: z.boolean().default(true),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export interface AuthContextType {
  user: Profile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials, rememberMe?: boolean) => Promise<Profile>;
  logout: () => void;
  switchAccount: (email: string) => Promise<Profile>;
  refreshUser: () => Promise<void>;
}
