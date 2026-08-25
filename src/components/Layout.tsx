import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Package, FileText, LayoutDashboard, Settings, Users, LogOut, PackagePlus, ClipboardList, Menu, X, Archive, Eye, EyeOff, History } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { cn } from '../lib/utils';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { NotificationCenter } from './NotificationCenter';

export const Layout = () => {
  const { user, logout, changePassword } = useAuth();
  const { requests, users, batches } = useData();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) return null;

  const closeSidebar = () => setIsSidebarOpen(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const isUser = user.role.includes('USER');
  const isAdmin = user.role.includes('ADMIN');

  const pendingRequests = requests.filter(request => request.status === 'PENDING').filter(request => { 
    const requester = users.find(currentUser => currentUser.id === request.userId || currentUser.employeeId === request.employeeId); 
    return isAdmin || requester?.departmentId === user.departmentId; 
  });
  const groupedTickets = new Map<string, boolean>();
  pendingRequests.forEach(request => { 
    const ticketId = request.ticketId || request.id; 
    groupedTickets.set(ticketId, true); 
  });
  const pendingTicketsCount = groupedTickets.size;
  
  const approvalBadge = pendingTicketsCount > 0 ? (
    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">{pendingTicketsCount}</span>
  ) : null;

  const pendingBatchesCount = batches?.filter(b => b.status === 'PENDING').length || 0;
  const batchBadge = pendingBatchesCount > 0 ? (
    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white shadow-sm">{pendingBatchesCount}</span>
  ) : null;

  return (
    <div className="min-h-screen bg-bg flex">
      <button type="button" aria-label="เปิดเมนู" onClick={() => setIsSidebarOpen(true)} className="fixed left-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface text-text-primary shadow-sm md:hidden">
        <Menu size={20} />
      </button>
      
      <div className="fixed right-4 top-4 md:right-8 md:top-8 z-30">
        <NotificationCenter />
      </div>

      {isSidebarOpen && <button type="button" aria-label="ปิดเมนู" onClick={closeSidebar} className="fixed inset-0 z-30 bg-slate-950/30 md:hidden" />}

      <aside className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r border-border bg-surface transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-white shadow-lg shadow-primary/25">R</div>
            <div>
              <span className="block font-bold tracking-tight text-text-primary">Requisition</span>
              <span className="text-[11px] font-semibold text-primary">Equipment Portal</span>
            </div>
          </div>
          <button type="button" aria-label="ปิดเมนู" onClick={closeSidebar} className="text-text-secondary md:hidden"><X size={20} /></button>
        </div>

        <nav className="flex flex-1 flex-col gap-0 overflow-y-auto py-3">
          <NavGroup label="เมนูหลัก" />
          <NavItem to="/dashboard" icon={<LayoutDashboard />} label="แดชบอร์ด" onNavigate={closeSidebar} />

          {isUser && <><NavGroup label="สำหรับพนักงาน" /><NavItem to="/requests/new" icon={<PackagePlus />} label="เบิกอุปกรณ์ใหม่" onNavigate={closeSidebar} /><NavItem to="/requests/my" icon={<FileText />} label="ประวัติการเบิก" onNavigate={closeSidebar} /></>}
          {isAdmin && (
            <>
              <NavGroup label="จัดการคำขอเบิก" />
              <NavItem to="/coordinator/requests" icon={<ClipboardList />} label="รายการเบิก" onNavigate={closeSidebar} badge={approvalBadge} />
              <NavItem to="/coordinator/batches" icon={<Package />} label="สรุปรายการเบิก" onNavigate={closeSidebar} badge={batchBadge} />
            </>
          )}
          {isAdmin && <><NavGroup label="ผู้ดูแลระบบ" /><NavItem to="/admin/reports" icon={<FileText />} label="รายงานและสรุปผล" onNavigate={closeSidebar} /><NavItem to="/admin/items" icon={<Archive />} label="จัดการอุปกรณ์" onNavigate={closeSidebar} /><NavItem to="/admin/stock" icon={<Archive />} label="ตรวจนับสต็อก" onNavigate={closeSidebar} /><NavItem to="/admin/users" icon={<Users />} label="จัดการผู้ใช้" onNavigate={closeSidebar} /><NavItem to="/admin/logs" icon={<History />} label="Log ระบบบันทึกประวัติ" onNavigate={closeSidebar} /><NavItem to="/admin/settings" icon={<Settings />} label="ตั้งค่าระบบ" onNavigate={closeSidebar} /></>}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-4 flex items-center gap-3 rounded-xl bg-surface-alt p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary">{user.name.charAt(0)}</div>
            <div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">{user.name}</p><p className="truncate text-xs text-text-secondary">{user.employeeId}</p></div>
          </div>
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-alt hover:text-text-primary"><LogOut size={14} />ออกจากระบบ</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-hidden"><div className="h-full overflow-y-auto px-4 pb-8 pt-20 md:p-8 lg:p-10"><div className="mx-auto max-w-7xl"><Outlet /></div></div></main>
      {user.mustChangePassword && <PasswordChangeDialog onSave={changePassword} />}
    </div>
  );
};

const NavGroup = ({ label }: { label: string }) => <h3 className="mb-1 mt-4 px-6 text-[10px] font-bold uppercase tracking-[0.14em] text-neutral first:mt-1">{label}</h3>;

const NavItem = ({ to, icon, label, onNavigate, badge }: { to: string; icon: React.ReactNode; label: string; onNavigate: () => void; badge?: React.ReactNode }) => (
  <NavLink to={to} onClick={onNavigate} className={({ isActive }) => cn('mx-3 flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors', isActive ? 'bg-primary/10 font-semibold text-primary' : 'text-text-secondary hover:bg-surface-alt hover:text-text-primary')}>
    <div className="flex items-center gap-3">
      {React.cloneElement(icon as React.ReactElement, { size: 18 })}<span>{label}</span>
    </div>
    {badge}
  </NavLink>
);

const PasswordChangeDialog = ({ onSave }: { onSave: (password: string) => Promise<void> }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const save = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (password.length < 8) return setError('รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
    if (password !== confirmation) return setError('ยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
    
    setIsSaving(true);
    await onSave(password);
    setIsSaving(false);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-3xl border border-white bg-surface p-7 shadow-2xl">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-xl font-bold text-white">R</div>
        <h2 className="text-xl font-bold">เปลี่ยนรหัสผ่านก่อนเริ่มใช้งาน</h2>
        <p className="mt-2 text-sm leading-6 text-text-secondary">บัญชีนี้ใช้รหัสผ่านเริ่มต้นแล้ว เพื่อความปลอดภัยกรุณาตั้งรหัสผ่านใหม่ของคุณ</p>
        
        <form onSubmit={save} className="mt-5 space-y-4">
          <Input 
            autoFocus 
            type={showPassword ? "text" : "password"} 
            value={password} 
            onChange={event => { setPassword(event.target.value); setError(''); }} 
            placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)" 
            rightElement={
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-text-secondary hover:text-text-primary">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          <Input 
            type={showConfirm ? "text" : "password"} 
            value={confirmation} 
            onChange={event => { setConfirmation(event.target.value); setError(''); }} 
            placeholder="ยืนยันรหัสผ่านใหม่" 
            rightElement={
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="text-text-secondary hover:text-text-primary">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />
          {error && <p className="text-sm text-error">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
          </Button>
        </form>
      </div>
    </div>
  );
};
