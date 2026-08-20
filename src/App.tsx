/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';
import { DataProvider } from './store/DataContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { NewRequest } from './pages/NewRequest';
import { MyRequests } from './pages/MyRequests';
import { CoordinatorRequests } from './pages/CoordinatorRequests';
import { CoordinatorBatches } from './pages/CoordinatorBatches';
import { BatchDetail } from './pages/BatchDetail';
import { AdminItems } from './pages/AdminItems';
import { AdminUsers } from './pages/AdminUsers';
import { AdminReports } from './pages/AdminReports';
import { AdminStock } from './pages/AdminStock';
import { SystemLogs } from './pages/SystemLogs';
import { Toaster } from 'sonner';

// Route Guard
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

export default function App() {
  return (
    <DataProvider>
      <Toaster position="top-right" richColors closeButton />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              
              {/* User Routes */}
              <Route path="requests/new" element={<NewRequest />} />
              <Route path="requests/my" element={<MyRequests />} />
              
              {/* Coordinator Routes */}
              <Route path="coordinator/requests" element={<CoordinatorRequests />} />
              <Route path="coordinator/batches" element={<CoordinatorBatches />} />
              <Route path="coordinator/batches/:id" element={<BatchDetail />} />
              
              {/* Admin Routes */}
              <Route path="admin/reports" element={<AdminReports />} />
              <Route path="admin/items" element={<AdminItems />} />
              <Route path="admin/stock" element={<AdminStock />} />
              <Route path="admin/users" element={<AdminUsers />} />
              <Route path="admin/logs" element={<SystemLogs />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DataProvider>
  );
}
