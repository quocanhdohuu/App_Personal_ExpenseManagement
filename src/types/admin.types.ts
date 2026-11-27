export interface AuditLogWithUser {
  id: string;
  user_id?: string | null;
  user_name?: string;
  user_email?: string;
  action: string;
  entity_name: string;
  entity_id?: string | null;
  old_values?: any;
  new_values?: any;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface SystemConfig {
  key: string;
  name: string;
  value: string;
  description: string;
  updated_at: string;
}

export interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  adminUsers: number;
}
