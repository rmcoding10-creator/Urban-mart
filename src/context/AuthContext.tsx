import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/db';
import { User, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  activeRole: UserRole | null;
  login: (username: string, pin: string) => { success: boolean; error?: string };
  quickLoginAs: (role: UserRole) => void;
  logout: () => void;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_SESSION_KEY = 'um_current_session_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem(CURRENT_USER_SESSION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    // Default to Cashier for instant POS display, or Admin
    const users = db.getUsers();
    return users.find((u) => u.role === 'cashier') || users[0] || null;
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_SESSION_KEY);
    }
  }, [currentUser]);

  const login = (username: string, pin: string): { success: boolean; error?: string } => {
    const user = db.authenticate(username, pin);
    if (user) {
      setCurrentUser(user);
      return { success: true };
    }
    return { success: false, error: 'Invalid username or PIN code. Please verify credentials.' };
  };

  const quickLoginAs = (role: UserRole) => {
    const user = db.getUsers().find((u) => u.role === role);
    if (user) {
      setCurrentUser(user);
      db.addAuditLog(user.id, user.fullName, user.role, 'SWITCH_PROFILE', 'Navigation', `Switched active counter profile to ${role.toUpperCase()}`);
    }
  };

  const logout = () => {
    if (currentUser) {
      db.addAuditLog(currentUser.id, currentUser.fullName, currentUser.role, 'LOGOUT', 'Authentication', 'User logged out');
    }
    setCurrentUser(null);
  };

  const canAccess = (allowedRoles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return allowedRoles.includes(currentUser.role);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeRole: currentUser?.role || null,
        login,
        quickLoginAs,
        logout,
        canAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
};
