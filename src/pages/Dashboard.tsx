import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, CheckCircle2, Clock3, Package, Plus, Archive } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';

export const Dashboard = () => {
  const { user } = useAuth();
  const { requests, users, items } = useData();
  if (!user) return null;

  const myRequests = requests.filter(request => request.userId === user.id);
  const countTickets = (list: typeof requests) => new Set(list.map(request => request.ticketId || request.id)).size;
  const totalRequests = countTickets(myRequests);
  const pendingRequests = countTickets(myRequests.filter(request => request.status === 'PENDING'));
  const approvedRequests = countTickets(myRequests.filter(request => request.status === 'APPROVED'));
  const collectedRequests = countTickets(myRequests.filter(request => request.status === 'COLLECTED'));
  const otherRequests = countTickets(myRequests.filter(request => ['REJECTED', 'CANCELLED'].includes(request.status)));
  const isManager = user.role.includes('ADMIN');
  const recentPendingRequests = isManager ? requests.filter(request => request.status === 'PENDING').sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()).slice(0, 5) : [];
  const recentMine = [...myRequests].sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()).slice(0, 4);

  const statistics = [
    { label: 'คำขอทั้งหมด', value: totalRequests, icon: Package, tone: 'bg-primary/10 text-primary' },
    { label: 'กำลังดำเนินการ', value: pendingRequests, icon: Clock3, tone: 'bg-warning/10 text-warning' },
    { label: 'รอรับของ', value: approvedRequests, icon: Package, tone: 'bg-blue-100 text-blue-600' },
    { label: 'รับของแล้ว', value: collectedRequests, icon: CheckCircle2, tone: 'bg-success/10 text-success' },
    { label: 'ปฏิเสธ/ยกเลิก', value: otherRequests, icon: Archive, tone: 'bg-error/10 text-error' },
  ];

  return <div className="space-y-7">
    <section className="relative overflow-hidden rounded-3xl bg-[#12314a] px-6 py-7 text-white shadow-xl shadow-secondary/15 sm:px-8 sm:py-9">
      <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full border-[28px] border-teal-300/10" />
      <div className="pointer-events-none absolute bottom-0 right-24 h-24 w-48 rounded-t-full bg-teal-400/10 blur-2xl" />
      <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-sm font-medium text-teal-100">ระบบเบิกอุปกรณ์สำนักงาน</p>
          <h1 className="text-3xl font-bold tracking-tight !text-white sm:text-4xl">สวัสดี, {user.name}</h1>
          <p className="mt-2 max-w-xl text-sm text-slate-300 sm:text-base">เลือกอุปกรณ์ที่ต้องการและติดตามสถานะคำขอได้ในที่เดียว</p>
        </div>
        <Link to="/requests/new"><Button className="w-full bg-white text-secondary hover:bg-teal-50 sm:w-auto"><Plus size={18} className="mr-2" />เริ่มเบิกอุปกรณ์</Button></Link>
      </div>
    </section>

    <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {statistics.map(({ label, value, icon: Icon, tone }) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><div><p className="text-xs sm:text-sm font-medium text-text-secondary">{label}</p><p className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">{value}</p></div><div className={`rounded-2xl p-3 ${tone}`}><Icon size={22} /></div></div></Card>)}
    </section>



    <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]"><Card className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-text-primary">คำขอล่าสุดของคุณ</h2><p className="text-sm text-text-secondary">ติดตามสถานะคำขอได้อย่างรวดเร็ว</p></div><Link to="/requests/my"><Button variant="ghost" size="sm">ดูประวัติ<ArrowRight size={15} className="ml-1" /></Button></Link></div>{recentMine.length ? <div className="divide-y divide-border">{recentMine.map(request => { const item = items.find(currentItem => currentItem.id === request.itemId); return <div key={request.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-text-primary">{item?.name || 'ไม่พบอุปกรณ์'}</p><p className="text-xs text-text-secondary">{formatDate(request.createdAt)} · {request.quantity} {item?.unit}</p></div><StatusBadge status={request.status} /></div>; })}</div> : <div className="rounded-xl bg-surface-alt px-4 py-8 text-center text-sm text-text-secondary">ยังไม่มีประวัติการเบิกอุปกรณ์</div>}</Card><Card className="flex flex-col justify-between bg-surface-alt p-6"><div><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-white"><Package size={21} /></div><h2 className="text-xl font-bold text-text-primary">เบิกของที่ใช้เป็นประจำ</h2><p className="mt-2 text-sm leading-6 text-text-secondary">ค้นหาอุปกรณ์ เลือกจำนวน และส่งคำขอได้ภายในไม่กี่ขั้นตอน</p></div><Link to="/requests/new" className="mt-6"><Button variant="outline" className="w-full">ไปหน้ารายการอุปกรณ์<ArrowRight size={16} className="ml-2" /></Button></Link></Card></section>
  </div>;
};
