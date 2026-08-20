import React, { useMemo, useState } from 'react';
import { Package, Search, Filter } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { Input } from '../components/ui/Input';

export const AdminLocalRequests = () => {
  const { user } = useAuth();
  const { requests, items, users, departments } = useData();
  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().substring(0, 7) + '-01');

  React.useEffect(() => {
    if (filterMode === 'year') setFilterDate(`${new Date().getFullYear()}-01-01`);
    else if (filterMode === 'month') setFilterDate(`${new Date().toISOString().substring(0, 7)}-01`);
    else if (filterMode === 'day') setFilterDate(new Date().toISOString().split('T')[0]);
  }, [filterMode]);

  if (!user || !user.role.includes('ADMIN')) return null;

  // Filter for local stock requests (COLLECTED and no batchId)
  const localRequests = useMemo(() => {
    return requests
      .filter(req => req.status === 'COLLECTED' && !req.batchId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests]);

  const visibleRequests = useMemo(() => {
    return localRequests.filter(req => {
      const item = items.find(i => i.id === req.itemId);
      const reqUser = users.find(u => u.id === req.userId);
      const searchString = `${item?.name || ''} ${reqUser?.name || ''} ${req.ticketId || ''}`.toLowerCase();
      
      const reqDate = new Date(req.createdAt.includes('T') ? req.createdAt : req.createdAt.replace(' ', 'T'));
      const fDate = new Date(filterDate);
      let matchDate = true;
      if (filterMode === 'day') matchDate = reqDate.toDateString() === fDate.toDateString();
      if (filterMode === 'month') matchDate = reqDate.getMonth() === fDate.getMonth() && reqDate.getFullYear() === fDate.getFullYear();
      if (filterMode === 'year') matchDate = reqDate.getFullYear() === fDate.getFullYear();

      return searchString.includes(search.toLowerCase()) && matchDate;
    });
  }, [localRequests, items, users, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Local stock</p>
          <h1 className="text-3xl font-bold text-text-primary">สรุปรายการเบิกจากสต็อก</h1>
          <p className="mt-2 text-text-secondary">ประวัติการเบิกอุปกรณ์ที่มีพร้อมจ่ายในสต็อกหน่วยงาน (ตัดสต็อกแล้ว)</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-2 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-2 pl-2 pr-1 border-r border-border/50 text-text-secondary">
          <Filter size={16} />
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

        <div className="flex flex-1 sm:flex-none sm:w-72 items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors focus-within:border-primary/50 hover:border-primary/30">
          <Search size={14} className="text-text-secondary shrink-0" />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none w-full placeholder:text-text-secondary/70"
            placeholder="ค้นหารายการ, ผู้เบิก..."
          />
        </div>

        <div className="text-xs text-text-secondary font-medium px-2 ml-auto">
          พบทั้งหมด {visibleRequests.length} รายการ
        </div>
      </div>

      <Card className="overflow-hidden">

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="border-b border-border bg-surface-alt/50">
              <tr>
                <th className="px-6 py-4 font-semibold text-text-secondary">หมายเลขใบเบิก</th>
                <th className="px-6 py-4 font-semibold text-text-secondary">วันที่ทำรายการ</th>
                <th className="px-6 py-4 font-semibold text-text-secondary">ผู้เบิก</th>
                <th className="px-6 py-4 font-semibold text-text-secondary">รายการอุปกรณ์</th>
                <th className="px-6 py-4 font-semibold text-text-secondary text-right">จำนวน</th>
                <th className="px-6 py-4 font-semibold text-text-secondary text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visibleRequests.map(request => {
                const item = items.find(i => i.id === request.itemId);
                const reqUser = users.find(u => u.id === request.userId);
                const dept = departments.find(d => d.id === reqUser?.departmentId);

                return (
                  <tr key={request.id} className="hover:bg-surface-alt/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-text-secondary">
                      {request.ticketId || request.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-text-secondary">
                      {formatDate(request.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-primary">{reqUser?.name || 'ไม่ทราบชื่อ'}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{dept?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-text-primary">{item?.name || 'ไม่พบอุปกรณ์'}</p>
                      <p className="text-xs text-text-secondary mt-0.5">{item?.category}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-text-primary">{request.quantity}</span>
                      <span className="text-text-secondary ml-1.5">{item?.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visibleRequests.length === 0 && (
            <div className="p-12 text-center text-text-secondary">
              <Package size={32} className="mx-auto mb-3 opacity-20" />
              <p>ไม่พบรายการเบิกจากสต็อก</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
