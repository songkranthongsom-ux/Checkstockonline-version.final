import React from 'react';
import { CalendarDays, PackageX, X, Filter } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card } from '../components/ui/Card';
import { Badge, StatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';

export const MyRequests = () => {
  const { user } = useAuth();
  const { requests, items, updateRequestStatus } = useData();
  const [filterMode, setFilterMode] = React.useState<'day' | 'month' | 'year' | 'all'>('month');
  const [filterDate, setFilterDate] = React.useState<string>(new Date().toISOString().substring(0, 7) + '-01');
  
  if (!user) return null;
  
  const filteredRequests = requests
    .filter(request => request.userId === user.id)
    .filter(request => {
      if (filterMode === 'all') return true;
      const rDate = new Date(request.createdAt);
      const fDate = new Date(filterDate);
      if (filterMode === 'day') return rDate.toDateString() === fDate.toDateString();
      if (filterMode === 'month') return rDate.getMonth() === fDate.getMonth() && rDate.getFullYear() === fDate.getFullYear();
      if (filterMode === 'year') return rDate.getFullYear() === fDate.getFullYear();
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const cancelRequest = async (requestId: string) => {
    if (!window.confirm('ต้องการยกเลิกคำขอนี้ใช่หรือไม่?')) return;
    await updateRequestStatus(requestId, 'CANCELLED');
  };

  const pendingCount = filteredRequests.filter(r => r.status === 'PENDING').length;
  const collectedCount = filteredRequests.filter(r => r.status === 'COLLECTED').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Request tracking</p>
          <h1 className="text-3xl font-bold text-text-primary">ประวัติการเบิก</h1>
          <p className="mt-2 text-text-secondary">ดูรายการและสถานะของแต่ละใบเบิกได้ทันที</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-2 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-2 pl-2 pr-1 border-r border-border/50 text-text-secondary">
          <Filter size={16} />
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30">
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
          <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30">
            <input 
              type={filterMode === 'day' ? 'date' : filterMode === 'month' ? 'month' : 'number'}
              className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none cursor-pointer w-[130px]"
              value={filterMode === 'year' ? filterDate.substring(0, 4) : filterMode === 'month' ? filterDate.substring(0, 7) : filterDate}
              onChange={e => {
                if (filterMode === 'year') setFilterDate(`${e.target.value}-01-01`);
                else if (filterMode === 'month') setFilterDate(`${e.target.value}-01`);
                else setFilterDate(e.target.value);
              }}
              min="2020" max="2100"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Summary label="จำนวนรายการทั้งหมด" value={filteredRequests.length} />
        <Summary label="รออนุมัติ / รอรับของ" value={pendingCount} tone="text-warning" />
        <Summary label="รับของแล้ว" value={collectedCount} tone="text-success" />
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-alt/50 text-sm text-text-secondary">
                <th className="py-3 px-4 font-semibold whitespace-nowrap">วันที่ทำรายการ</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">เลขที่ใบเบิก</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">รายการอุปกรณ์</th>
                <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">จำนวน</th>
                <th className="py-3 px-4 font-semibold whitespace-nowrap">สถานะ</th>
                <th className="py-3 px-4 font-semibold text-center whitespace-nowrap">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-sm">
              {filteredRequests.map(request => {
                const item = items.find(i => i.id === request.itemId);
                return (
                  <tr key={request.id} className="hover:bg-surface-alt/30 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <CalendarDays size={14} className="text-text-secondary" />
                        <span className="text-text-primary font-medium">{formatDate(request.createdAt).split(' ')[0]}</span>
                        <span className="text-text-secondary text-xs">{formatDate(request.createdAt).split(' ')[1]}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                        {request.ticketId || request.id}
                      </span>
                    </td>
                    <td className="py-4 px-4 min-w-[200px]">
                      <p className="font-semibold text-text-primary">{item?.name || 'ไม่พบอุปกรณ์'}</p>
                      {request.reason && <p className="text-xs text-text-secondary mt-0.5 truncate max-w-[200px]" title={request.reason}>เหตุผล: {request.reason}</p>}
                      {request.rejectReason && <p className="text-xs text-error mt-0.5">ถูกปฏิเสธ: {request.rejectReason}</p>}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span className="font-bold text-text-primary">{request.quantity}</span>
                      <span className="text-text-secondary ml-1">{item?.unit}</span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <StatusBadge 
                        status={request.status} 
                        labelOverride={request.status === 'COLLECTED' ? (request.batchId ? 'รับของแล้ว (ส่วนกลาง)' : 'รับของแล้ว (จากสต็อก)') : undefined} 
                      />
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      {request.status === 'PENDING' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-error hover:bg-error/10 hover:text-error h-8 px-2" 
                          onClick={() => cancelRequest(request.id)}
                          title="ยกเลิกคำขอ"
                        >
                          <X size={16} />
                        </Button>
                      ) : (
                        <span className="text-text-secondary text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-text-secondary">
                    <PackageX size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-base font-semibold">ยังไม่มีประวัติการเบิก</p>
                    <p className="text-sm mt-1">เมื่อส่งคำขอ รายการจะแสดงที่หน้านี้</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const Summary = ({ label, value, tone = 'text-primary' }: { label: string; value: number; tone?: string }) => (
  <Card className="p-5 flex flex-col justify-center">
    <p className="text-sm font-medium text-text-secondary">{label}</p>
    <p className={`mt-1 text-3xl font-bold ${tone}`}>{value}</p>
  </Card>
);
