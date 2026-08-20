import React, { useState, useEffect, useRef } from 'react';
import { Bell, CheckCircle2, Clock, AlertCircle, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'success' | 'warning' | 'info';
  title: string;
  description: string;
  time: Date;
  link?: string;
  isRead: boolean;
}

export const NotificationCenter = () => {
  const { user } = useAuth();
  const { requests, batches } = useData();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'requests' | 'system'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;
    const notifs: Notification[] = [];
    const isAdmin = user.role.includes('ADMIN');
    
    if (isAdmin) {
      const pendingReqs = requests.filter(r => r.status === 'PENDING');
      if (pendingReqs.length > 0) {
        notifs.push({
          id: `req-pending-${pendingReqs.length}`,
          type: 'warning',
          title: 'คำร้องขอเบิกใหม่',
          description: `มีคำร้องเบิกอุปกรณ์ใหม่จำนวน ${pendingReqs.length} รายการที่รอการตรวจสอบ`,
          time: new Date(),
          link: '/coordinator/requests',
          isRead: false
        });
      }
      
      const pendingBatches = batches?.filter(b => b.status === 'PENDING') || [];
      if (pendingBatches.length > 0) {
        notifs.push({
          id: `batch-pending-${pendingBatches.length}`,
          type: 'info',
          title: 'รอบเบิกรอดำเนินการ',
          description: `มีรอบเบิกจำนวน ${pendingBatches.length} รอบที่รอดำเนินการจัดของ`,
          time: new Date(),
          link: '/coordinator/batches',
          isRead: false
        });
      }
    } else {
      const myReqs = requests.filter(r => (r.userId === user.id || r.employeeId === user.employeeId) && (r.status === 'APPROVED' || r.status === 'COMPLETED'));
      const uniqueTickets = Array.from(new Set(myReqs.map(r => r.ticketId || r.id)));
      if (uniqueTickets.length > 0) {
        notifs.push({
          id: `req-approved-${uniqueTickets.length}`,
          type: 'success',
          title: 'คำร้องได้รับการอนุมัติ',
          description: `คำร้องเบิกอุปกรณ์ของคุณจำนวน ${uniqueTickets.length} รายการได้รับการอนุมัติแล้ว`,
          time: new Date(),
          link: '/requests/my',
          isRead: false
        });
      }
    }

    setNotifications(notifs);
  }, [user, requests, batches]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = (link?: string) => {
    if (link) {
      navigate(link);
      setIsOpen(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={18} className="text-success" />;
      case 'warning': return <AlertCircle size={18} className="text-warning" />;
      case 'info': return <Clock size={18} className="text-primary" />;
      default: return <AlertCircle size={18} className="text-text-secondary" />;
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'requests' && (n.id.includes('req') || n.id.includes('batch'))) return true;
    if (activeTab === 'system' && !n.id.includes('req') && !n.id.includes('batch')) return true;
    return false;
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-surface-alt text-text-secondary transition-colors hover:bg-border/50 hover:text-text-primary"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2.5 w-2.5 rounded-full bg-error ring-2 ring-surface"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[380px] rounded-2xl border border-border bg-surface shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between p-4 pb-2">
            <h3 className="font-bold text-text-primary text-lg">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-text-secondary hover:text-text-primary">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex gap-4 border-b border-border px-4 pt-2">
            <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All notifications" count={notifications.length} />
            <TabButton active={activeTab === 'requests'} onClick={() => setActiveTab('requests')} label="Requests" />
            <TabButton active={activeTab === 'system'} onClick={() => setActiveTab('system')} label="System" />
          </div>

          <div className="max-h-[350px] overflow-y-auto py-2 custom-scrollbar">
            {filteredNotifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-text-secondary">
                ไม่มีการแจ้งเตือน
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  onClick={() => handleNotificationClick(notif.link)}
                  className={cn(
                    "flex gap-3 px-4 py-3 transition-colors hover:bg-surface-alt cursor-pointer",
                    !notif.isRead && "bg-primary/5"
                  )}
                >
                  <div className="mt-0.5 shrink-0">
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-sm font-semibold text-text-primary truncate">{notif.title}</p>
                      {!notif.isRead && <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 ml-2"></span>}
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-1">{notif.description}</p>
                    <p className="text-[10px] text-text-secondary font-medium">
                      {format(notif.time, 'h:mm a')} • {notif.type === 'info' ? 'System' : 'Requests'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border bg-surface-alt/50 p-3">
            <button 
              onClick={markAllAsRead}
              className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
            >
              <CheckCheck size={14} /> Mark all as read
            </button>
            <button className="rounded-lg bg-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-primary/90 transition-colors">
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count?: number }) => (
  <button 
    onClick={onClick}
    className={cn(
      "relative pb-3 text-sm font-semibold transition-colors flex items-center gap-1.5",
      active ? "text-primary" : "text-text-secondary hover:text-text-primary"
    )}
  >
    {label}
    {count !== undefined && (
      <span className={cn(
        "flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px]",
        active ? "bg-primary text-white" : "bg-border text-text-secondary"
      )}>
        {count}
      </span>
    )}
    {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-primary"></span>}
  </button>
);
