import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile } from '../types/database.types';
import { AuthContextType, LoginCredentials } from '../types/auth.types';
import { authService } from '../services/authService';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initAuth = () => {
    try {
      const activeUser = authService.getCurrentUser();
      setUser(activeUser);
    } catch (e) {
      console.error('Error restoring auth session:', e);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<Profile> => {
    const loggedInUser = await authService.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const switchAccount = async (email: string): Promise<Profile> => {
    const switchedUser = await authService.switchAccount(email);
    setUser(switchedUser);
    return switchedUser;
  };

  const refreshUser = async () => {
    const active = authService.getCurrentUser();
    setUser(active ? { ...active } : null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isAdmin: Boolean(user?.is_system_admin),
    isLoading,
    login,
    logout,
    switchAccount,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
