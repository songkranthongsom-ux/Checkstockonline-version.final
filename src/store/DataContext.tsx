import React, { createContext, useContext, useEffect, useState } from 'react';
import { ConsolidatedBatch, Department, Item, RequisitionRequest, User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface DataContextType {
  departments: Department[];
  items: Item[];
  users: User[];
  requests: RequisitionRequest[];
  batches: ConsolidatedBatch[];
  categories: { id: string, name: string }[];
  settings: { key: string, value: string }[];
  
  // Mutations
  addRequest: (req: Omit<RequisitionRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => void;
  addRequests: (reqs: Omit<RequisitionRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>[]) => void;
  updateRequestStatus: (id: string, status: RequisitionRequest['status'], rejectReason?: string) => void;
  deleteRequest: (id: string) => void;
  
  createBatch: (departmentId: string, coordinatorId: string, requestIds: string[], isRestock?: boolean) => void;
  updateBatchStatus: (id: string, status: string) => Promise<void>;
  distributeBatch: (id: string) => Promise<void>;
  
  // Admin Mutations
  addItem: (item: Item, actorName?: string) => void;
  updateItem: (id: string, item: Partial<Item>, actorName?: string) => void;
  deleteItem: (id: string, actorName?: string) => void;
  addUser: (user: Omit<User, 'id'>) => Promise<boolean>;
  deleteUser: (id: string) => Promise<boolean>;
  updateUser: (id: string, updates: Partial<User>) => Promise<void>;
  
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateSetting: (key: string, value: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<RequisitionRequest[]>([]);
  const [batches, setBatches] = useState<ConsolidatedBatch[]>([]);
  const [categories, setCategories] = useState<{id: string, name: string}[]>([]);
  const [settings, setSettings] = useState<{key: string, value: string}[]>([]);

  const loadData = async (isBackground = false) => {
    try {
      const t = Date.now();
      const token = localStorage.getItem('auth_token');
      if (!token) {
        const response = await fetch(`${API_URL}/departments?t=${t}`, { cache: 'no-store' });
        if (response.ok) setDepartments(await response.json());
        return;
      }
      const res = await fetch(`${API_URL}/sync?t=${t}`, { cache: 'no-store', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
        throw new Error(`Sync failed: ${res.status}`);
      }
      const data = await res.json();
      
      if (!data.error) {
        setUsers(data.users || []);
        setDepartments(data.departments || []);
        setItems(data.items || []);
        setRequests(data.requests || []);
        setBatches(data.batches || []);
        setCategories(data.categories || []);
        setSettings(data.settings || []);

        // Update local storage auth user just in case roles changed
        const savedAuth = localStorage.getItem('auth_user');
        if (savedAuth && data.users && data.users.length > 0) {
            const authUser = JSON.parse(savedAuth);
            const dbUser = data.users.find((u: any) => u.employeeId === authUser.employeeId);
            if (dbUser) localStorage.setItem('auth_user', JSON.stringify(dbUser));
        }
      } else if (!isBackground) {
        console.error("API error:", data.error);
      }
    } catch (error) {
      if (!isBackground) console.error("Failed to load data from API:", error);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  const getHeaders = (extraHeaders = {}) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}`,
    ...extraHeaders
  });

  const addRequest = async (req: Omit<RequisitionRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => {
    await addRequests([req]);
  };

  const addRequests = async (reqs: Omit<RequisitionRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'ticketId'>[]) => {
    try {
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(reqs)
      });
      if (!response.ok) throw new Error('Could not create request');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const updateRequestStatus = async (id: string, status: RequisitionRequest['status'], rejectReason?: string) => {
    try {
      const response = await fetch(`${API_URL}/requests/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status, rejectReason })
      });
      if (!response.ok) throw new Error('Could not update request');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const deleteRequest = (id: string) => {
    console.warn("Delete request not implemented on backend");
    setRequests(prev => prev.filter(r => r.id !== id));
  };

  const createBatch = async (departmentId: string, coordinatorId: string, requestIds: string[], isRestock?: boolean) => {
    try {
      const response = await fetch(`${API_URL}/batches`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ departmentId, coordinatorId, requestIds, isRestock })
      });
      if (!response.ok) throw new Error('Could not create batch');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const distributeBatch = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/batches/${id}/distribute`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (!response.ok) throw new Error('Could not distribute batch');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const updateBatchStatus = async (id: string, status: string) => {
    if (status === 'COMPLETED') {
      setBatches(prev => prev.map(b => b.id === id ? { ...b, status: 'COMPLETED' } : b));
      setRequests(prev => prev.map(r => r.batchId === id ? { ...r, status: 'READY' } : r));
    }

    try {
      const response = await fetch(`${API_URL}/batches/${id}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ status })
      });
      if (!response.ok) throw new Error('Could not update batch');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const addItem = async (item: Item, _actorName?: string) => {
    try {
      const response = await fetch(`${API_URL}/items`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Could not create item');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const updateItem = async (id: string, item: Partial<Item>, _actorName?: string) => {
    try {
      const response = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Could not update item');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const deleteItem = async (id: string, _actorName?: string) => {
    try {
      const response = await fetch(`${API_URL}/items/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Could not delete item');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    if (users.some(existingUser => String(existingUser.employeeId) === String(user.employeeId))) return false;
    try {
      const response = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(user)
      });
      if (!response.ok) return false;
      await loadData();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/users/${encodeURIComponent(id)}`, { method: 'DELETE', headers: getHeaders() });
      if (!response.ok) return false;
      await loadData();
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const updateUser = async (id: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`${API_URL}/users/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Could not update user');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const addCategory = async (name: string) => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ name })
      });
      if (!response.ok) throw new Error('Could not create category');
      await loadData();
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const response = await fetch(`${API_URL}/categories/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (!response.ok) throw new Error('Failed to delete category');
      await loadData();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ key, value })
      });
      if (!response.ok) throw new Error('Failed to update setting');
      await loadData();
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  return (
    <DataContext.Provider value={{
      departments,
      items,
      users,
      requests,
      batches,
      categories,
      settings,
      addRequest,
      addRequests,
      updateRequestStatus,
      deleteRequest,
      createBatch,
      updateBatchStatus,
      distributeBatch,
      addItem,
      updateItem,
      deleteItem,
      addUser,
      deleteUser,
      updateUser,
      addCategory,
      deleteCategory,
      updateSetting
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
