import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { useData } from './DataContext';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface AuthContextType {
  user: User | null;
  login: (employeeId: string, password: string) => Promise<boolean>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
  register: (employeeId: string, name: string, password?: string, departmentId?: string) => Promise<boolean>;
  updateUserRole: (userId: string, role: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const storedUser = localStorage.getItem('auth_user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const { users } = useData();

  // Whenever the users list updates from backend, if our current logged-in user changed role/password, update it.
  useEffect(() => {
    if (user && users.length > 0) {
      const dbUser = users.find(u => u.id === user.id);
      if (dbUser && JSON.stringify(dbUser.role) !== JSON.stringify(user.role)) {
        setUser(dbUser);
        localStorage.setItem('auth_user', JSON.stringify(dbUser));
      }
    }
  }, [users, user]);

  const login = async (employeeId: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId: employeeId.trim(), password })
      });
      if (!response.ok) return false;
      const { user: authenticatedUser, token } = await response.json();
      setUser(authenticatedUser);
      localStorage.setItem('auth_user', JSON.stringify(authenticatedUser));
      localStorage.setItem('auth_token', token);
      return true;
    } catch { return false; }
  };

  const changePassword = async (newPassword: string) => {
    if (user) {
      try {
        const response = await fetch(`${API_URL}/auth/password`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
          body: JSON.stringify({ password: newPassword })
        });
        if (!response.ok) throw new Error('Could not update password');
        const { user: updatedUser, token } = await response.json();
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        localStorage.setItem('auth_token', token);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const register = async (employeeId: string, name: string, password?: string, departmentId: string = 'd1') => {
    const trimmedId = String(employeeId).trim();
    if (users.find(u => String(u.employeeId).trim() === trimmedId)) return false;
    
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: trimmedId,
          name: name.trim(),
          role: ['USER'],
          departmentId,
          password: password || '1234',
          mustChangePassword: false
        })
      });
      
      if (!res.ok) return false;
      const { user: newUser, token } = await res.json();
      setUser(newUser);
      localStorage.setItem('auth_user', JSON.stringify(newUser));
      localStorage.setItem('auth_token', token);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const updateUserRole = async (userId: string, role: string[]) => {
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` },
        body: JSON.stringify({ role })
      });
      window.location.reload(); // Reload to refresh DataContext
    } catch (error) {
      console.error(error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, changePassword, register, updateUserRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
