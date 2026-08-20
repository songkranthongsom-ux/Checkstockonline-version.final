import React, { useState } from 'react';
import { Check, ClipboardList, PackageX, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';

export const CoordinatorRequests = () => {
  const { user } = useAuth();
  const { requests, items, users, createBatch, updateRequestStatus } = useData();
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectingTicket, setRejectingTicket] = useState<{ id: string; requests: typeof requests } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'year' | 'all'>('all');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);

  React.useEffect(() => {
    if (filterMode === 'year') setFilterDate(`${new Date().getFullYear()}-01-01`);
    else if (filterMode === 'month') setFilterDate(`${new Date().toISOString().substring(0, 7)}-01`);
    else if (filterMode === 'day') setFilterDate(new Date().toISOString().split('T')[0]);
  }, [filterMode]);

  if (!user || !user.role.includes('ADMIN')) return null;
  const pendingRequests = requests.filter(request => {
    if (request.status !== 'PENDING') return false;
    if (filterMode === 'all') return true;
    const rDate = new Date(request.createdAt.includes('T') ? request.createdAt : request.createdAt.replace(' ', 'T'));
    const fDate = new Date(filterDate);
    if (filterMode === 'day') return rDate.toDateString() === fDate.toDateString();
    if (filterMode === 'month') return rDate.getMonth() === fDate.getMonth() && rDate.getFullYear() === fDate.getFullYear();
    if (filterMode === 'year') return rDate.getFullYear() === fDate.getFullYear();
    return true;
  }).sort((first, second) => new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime());
  
  const groupedTickets = new Map<string, typeof pendingRequests>();
  pendingRequests.forEach(request => { const ticketId = request.ticketId || request.id; groupedTickets.set(ticketId, [...(groupedTickets.get(ticketId) || []), request]); });
  const tickets = Array.from(groupedTickets.entries());
  const approve = async (ticketId: string, ticketRequests: typeof pendingRequests) => { 
    setApprovingId(ticketId); 
    try {
      const isRestock = ticketId.startsWith('RESTOCK_TICKET_');
      await createBatch(user.departmentId, user.id, ticketRequests.map(request => request.id), isRestock); 
      toast.success('อนุมัติรายการสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setApprovingId(null); 
    }
  };
  const reject = async () => { 
    if (!rejectingTicket || !rejectReason.trim()) return; 
    setIsRejecting(true); 
    try {
      await Promise.all(rejectingTicket.requests.map(request => updateRequestStatus(request.id, 'REJECTED', rejectReason.trim()))); 
      toast.success('ปฏิเสธรายการสำเร็จ');
      setRejectingTicket(null); 
      setRejectReason(''); 
    } catch {
      toast.error('เกิดข้อผิดพลาดในการปฏิเสธรายการ');
    } finally {
      setIsRejecting(false); 
    }
  };

  return <div className="space-y-6"><div><p className="mb-1 text-sm font-semibold text-primary">Approval queue</p><h1 className="text-3xl font-bold text-text-primary">รายการรอรวบรวม</h1><p className="mt-2 text-text-secondary">ตรวจสอบรายการ แล้วอนุมัติหรือปฏิเสธได้ทันทีทั้งใบเบิก</p></div>

      <div className="flex flex-wrap items-center gap-2 p-2 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-2 pl-2 pr-1 border-r border-border/50 text-text-secondary">
          <ClipboardList size={16} />
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30 shrink-0">
          <span className="text-text-secondary font-medium">ช่วงเวลา:</span>
          <select 
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none cursor-pointer"
            value={filterMode}
            onChange={e => setFilterMode(e.target.value as any)}
          >
            <option value="day">รายวัน</option>
            <option value="month">รายเดือน</option>
            <option value="year">รายปี</option>
            <option value="all">ทั้งหมด</option>
          </select>
        </div>

        {filterMode !== 'all' && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30 shrink-0">
            <input 
              type={filterMode === 'day' ? 'date' : filterMode === 'month' ? 'month' : 'number'}
              className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none cursor-pointer w-[130px]"
              placeholder={filterMode === 'year' ? "YYYY" : ""}
              value={filterMode === 'year' ? filterDate.substring(0, 4) : filterMode === 'month' ? filterDate.substring(0, 7) : filterDate}
              onChange={e => {
                if (filterMode === 'year') setFilterDate(`${e.target.value || new Date().getFullYear()}-01-01`);
                else if (filterMode === 'month') setFilterDate(`${e.target.value || new Date().toISOString().substring(0, 7)}-01`);
                else setFilterDate(e.target.value || new Date().toISOString().split('T')[0]);
              }}
              min="2020" max="2100"
            />
          </div>
        )}
      </div>

  <div className="grid gap-4 lg:grid-cols-2">{tickets.map(([ticketId, ticketRequests]) => { const firstRequest = ticketRequests[0]; const requester = users.find(currentUser => currentUser.id === firstRequest.userId); const isRestock = ticketId.startsWith('RESTOCK_TICKET_'); const requesterName = isRestock ? 'ระบบ (สั่งเติมคลัง)' : (requester?.name || 'ไม่ระบุผู้ขอ'); const requesterEmployeeId = isRestock ? 'ADMIN' : (requester?.employeeId || '-'); const totalQuantity = ticketRequests.reduce((sum, request) => sum + request.quantity, 0); const isApproving = approvingId === ticketId; return <Card key={ticketId} className="overflow-hidden"><div className="border-b border-border bg-surface-alt/70 p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-mono text-xs font-semibold text-primary">{ticketId}</p><h2 className="mt-1 text-lg font-bold">{requesterName}</h2><p className="mt-1 text-sm text-text-secondary">{requesterEmployeeId} · {formatDate(firstRequest.createdAt)}</p></div><Badge variant="warning">{ticketRequests.length} รายการ</Badge></div></div><div className="divide-y divide-border px-5">{ticketRequests.map(request => { const item = items.find(currentItem => currentItem.id === request.itemId); return <div key={request.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate font-semibold">{item?.name || 'ไม่พบอุปกรณ์'}</p>{request.reason && <p className="mt-0.5 truncate text-xs text-text-secondary">เหตุผล: {request.reason}</p>}</div><p className="shrink-0 font-bold text-primary">{request.quantity} <span className="text-sm font-medium text-text-secondary">{item?.unit}</span></p></div>; })}</div><div className="flex items-center justify-between gap-3 border-t border-border p-4"><p className="text-sm text-text-secondary">รวม <span className="font-bold text-text-primary">{totalQuantity}</span> หน่วย</p><div className="flex gap-2"><Button variant="ghost" size="sm" disabled={approvingId !== null} className="text-error hover:bg-error/10 hover:text-error" onClick={() => { setRejectingTicket({ id: ticketId, requests: ticketRequests }); setRejectReason(''); }}><X size={15} className="mr-1" />ปฏิเสธ</Button><Button size="sm" isLoading={isApproving} onClick={() => approve(ticketId, ticketRequests)}>อนุมัติ</Button></div></div></Card>; })}</div>{tickets.length === 0 && <Card className="flex flex-col items-center p-14 text-center text-text-secondary"><PackageX size={52} className="mb-4 text-primary/30" /><p className="text-lg font-bold text-text-primary">ไม่มีรายการรออนุมัติ</p><p className="mt-1 text-sm">คำขอทั้งหมดได้รับการจัดการเรียบร้อยแล้ว หรือไม่มีคำขอในช่วงเวลาที่เลือก</p></Card>}
    {rejectingTicket && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><Card className="w-full max-w-md p-6 shadow-2xl"><div className="flex items-start gap-3"><div className="rounded-xl bg-error/10 p-2 text-error"><ClipboardList size={20} /></div><div><h2 className="font-bold">ปฏิเสธใบเบิก</h2><p className="mt-1 text-sm text-text-secondary">กรุณาระบุเหตุผลเพื่อแจ้งผู้ขอเบิก</p></div></div><textarea autoFocus value={rejectReason} disabled={isRejecting} onChange={event => setRejectReason(event.target.value)} className="mt-5 min-h-28 w-full rounded-xl border border-border p-3 text-sm outline-none focus:ring-2 focus:ring-primary disabled:opacity-50" placeholder="เช่น สินค้าไม่เพียงพอ กรุณาปรับจำนวน..." /><div className="mt-4 flex justify-end gap-2"><Button variant="secondary" disabled={isRejecting} onClick={() => setRejectingTicket(null)}>ยกเลิก</Button><Button variant="destructive" isLoading={isRejecting} disabled={!rejectReason.trim()} onClick={reject}>ยืนยันการปฏิเสธ</Button></div></Card></div>}</div>;
};
