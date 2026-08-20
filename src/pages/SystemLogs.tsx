import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Search, Download, RefreshCw, History, Package, Settings, Database, Filter } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatDateOnly, formatTimeOnly } from '../lib/utils';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface SystemLogEntry {
  id: string;
  actionType: string;
  userId: string;
  details: string;
  status: string;
  createdAt: string;
}

type TabType = 'requests' | 'system' | 'all';

export const SystemLogs = () => {
  const { user } = useAuth();
  const { requests, users, items } = useData();
  const [systemLogs, setSystemLogs] = useState<SystemLogEntry[]>([]);
  
  const [activeTab, setActiveTab] = useState<TabType>('requests');
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Filters for Requests
  const [searchRequester, setSearchRequester] = useState('');
  const [searchEmployeeId, setSearchEmployeeId] = useState('');
  const [searchItemName, setSearchItemName] = useState('');
  const [searchRequestId, setSearchRequestId] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMode, setFilterMode] = useState<'day' | 'month' | 'year' | 'all'>('month');
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().substring(0, 7) + '-01');

  useEffect(() => {
    if (filterMode === 'all') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (filterMode === 'day') {
      setFilterStartDate(filterDate);
      setFilterEndDate(filterDate);
    } else if (filterMode === 'month') {
      const [year, month] = filterDate.split('-');
      setFilterStartDate(`${year}-${month}-01`);
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      setFilterEndDate(`${year}-${month}-${lastDay}`);
    } else if (filterMode === 'year') {
      const year = filterDate.split('-')[0];
      setFilterStartDate(`${year}-01-01`);
      setFilterEndDate(`${year}-12-31`);
    }
  }, [filterMode, filterDate]);

  if (!user || !user.role.includes('ADMIN')) return null;

  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`${API_URL}/logs?t=${Date.now()}`, { cache: 'no-store', headers: { Authorization: `Bearer ${localStorage.getItem('auth_token') || ''}` } });
      const data = await res.json();
      if (!data.error) {
        setSystemLogs(data);
      }
    } catch (err) {
      console.error('Failed to load logs', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Process Requests
  const filteredRequests = useMemo(() => {
    return requests
      .map(req => {
        const requester = users.find(u => u.id === req.userId);
        const item = items.find(i => i.id === req.itemId);
        return {
          ...req,
          name: requester?.name || '',
          employeeId: requester?.employeeId || '',
          itemName: item?.name || ''
        };
      })
      .filter(req => {
        const matchName = req.name.toLowerCase().includes(searchRequester.toLowerCase());
        const matchEmpId = req.employeeId.toLowerCase().includes(searchEmployeeId.toLowerCase());
        const matchItem = req.itemName.toLowerCase().includes(searchItemName.toLowerCase());
        const reqTicketId = req.ticketId || '';
        const reqId = req.id || '';
        const matchReqId = reqId.toLowerCase().includes(searchRequestId.toLowerCase()) || reqTicketId.toLowerCase().includes(searchRequestId.toLowerCase());
        const matchStatus = filterStatus === 'all' || req.status === filterStatus;
        
        let matchDate = true;
        if (filterStartDate || filterEndDate) {
          const reqDateStr = req.createdAt.includes('T') ? req.createdAt : req.createdAt.replace(' ', 'T');
          const reqDate = new Date(reqDateStr).getTime();
          const start = filterStartDate ? new Date(filterStartDate).getTime() : 0;
          const end = filterEndDate ? new Date(filterEndDate).getTime() + 86400000 : Infinity;
          matchDate = reqDate >= start && reqDate <= end;
        }
        
        return matchName && matchEmpId && matchItem && matchReqId && matchStatus && matchDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [requests, users, items, searchRequester, searchEmployeeId, searchItemName, searchRequestId, filterStatus, filterStartDate, filterEndDate]);

  // Process System Logs
  const sortedSystemLogs = useMemo(() => {
    const requestActionTypes = ['เบิกอุปกรณ์', 'อัปเดตคำขอเบิก', 'ยกเลิกคำขอเบิก', 'ปฏิเสธคำขอเบิก', 'รวมใบเบิก', 'อัปเดต Batch'];
    return systemLogs
      .filter(l => !requestActionTypes.includes(l.actionType))
      .filter(l => {
        const matchName = l.userId.toLowerCase().includes(searchRequester.toLowerCase());
        const matchItem = l.details.toLowerCase().includes(searchItemName.toLowerCase()) || l.actionType.toLowerCase().includes(searchItemName.toLowerCase());
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        
        let matchDate = true;
        if (filterStartDate || filterEndDate) {
          const reqDateStr = l.createdAt.includes('T') ? l.createdAt : l.createdAt.replace(' ', 'T');
          const reqDate = new Date(reqDateStr).getTime();
          const start = filterStartDate ? new Date(filterStartDate).getTime() : 0;
          const end = filterEndDate ? new Date(filterEndDate).getTime() + 86400000 : Infinity;
          matchDate = reqDate >= start && reqDate <= end;
        }
        
        return matchName && matchItem && matchStatus && matchDate;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [systemLogs, searchRequester, searchItemName, filterStatus, filterStartDate, filterEndDate]);

  // Process All Combined
  const allLogs = useMemo(() => {
    const requestActionTypes = ['เบิกอุปกรณ์', 'อัปเดตคำขอเบิก', 'ยกเลิกคำขอเบิก', 'ปฏิเสธคำขอเบิก', 'รวมใบเบิก', 'อัปเดต Batch'];
    const combined = [
      ...requests.map(r => {
        const requester = users.find(u => u.id === r.userId);
        const item = items.find(i => i.id === r.itemId);
        return {
          id: r.id,
          type: 'การคีย์เบิกสินค้า',
          date: r.createdAt,
          actor: requester?.name || r.userId,
          details: `เบิก: ${item?.name || r.itemId} (${r.quantity})`,
          status: r.status
        };
      }),
      ...systemLogs
        .filter(l => !requestActionTypes.includes(l.actionType))
        .map(l => ({
          id: l.id,
          type: l.actionType,
          date: l.createdAt,
          actor: l.userId,
          details: l.details,
          status: l.status
        }))
    ];
    return combined
      .filter(l => {
        const matchName = l.actor.toLowerCase().includes(searchRequester.toLowerCase());
        const matchItem = l.details.toLowerCase().includes(searchItemName.toLowerCase()) || l.type.toLowerCase().includes(searchItemName.toLowerCase());
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        
        let matchDate = true;
        if (filterStartDate || filterEndDate) {
          const reqDateStr = l.date.includes('T') ? l.date : l.date.replace(' ', 'T');
          const reqDate = new Date(reqDateStr).getTime();
          const start = filterStartDate ? new Date(filterStartDate).getTime() : 0;
          const end = filterEndDate ? new Date(filterEndDate).getTime() + 86400000 : Infinity;
          matchDate = reqDate >= start && reqDate <= end;
        }
        
        return matchName && matchItem && matchStatus && matchDate;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [requests, systemLogs, users, items, searchRequester, searchItemName, filterStatus, filterStartDate, filterEndDate]);

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'PENDING': return <span className="inline-flex rounded-full bg-yellow-50 text-yellow-600 px-3 py-1 text-xs font-semibold border border-yellow-200">กำลังตรวจสอบ</span>;
      case 'APPROVED': return <span className="inline-flex rounded-full bg-blue-50 text-blue-600 px-3 py-1 text-xs font-semibold border border-blue-200">กำลังจัดเตรียม</span>;
      case 'COLLECTED': return <span className="inline-flex rounded-full bg-green-50 text-green-600 px-3 py-1 text-xs font-semibold border border-green-200">รับของแล้ว</span>;
      case 'REJECTED': return <span className="inline-flex rounded-full bg-red-50 text-red-600 px-3 py-1 text-xs font-semibold border border-red-200">ปฏิเสธ</span>;
      case 'CANCELLED': return <span className="inline-flex rounded-full bg-gray-50 text-gray-600 px-3 py-1 text-xs font-semibold border border-gray-200">ยกเลิก</span>;
      case 'สำเร็จ': return <span className="inline-flex rounded-full bg-green-50 text-green-600 px-3 py-1 text-xs font-semibold border border-green-200">สำเร็จ</span>;
      case 'ล้มเหลว': return <span className="inline-flex rounded-full bg-red-50 text-red-600 px-3 py-1 text-xs font-semibold border border-red-200">ล้มเหลว</span>;
      default: return <span className="inline-flex rounded-full bg-gray-100 text-gray-600 px-3 py-1 text-xs font-semibold border border-gray-200">{status}</span>;
    }
  };

  const exportCSV = () => {
    let csvContent = "";
    if (activeTab === 'requests') {
      const headers = ['วันที่ทำรายการ', 'เวลา', 'เลขที่ใบเบิก', 'ชื่อผู้เบิก', 'รหัสพนักงาน', 'รายการสินค้าที่เบิก', 'จำนวน', 'สถานะ', 'วันที่อัปเดต', 'เวลา อัปเดต'];
      csvContent = [
        headers.join(','),
        ...filteredRequests.map(r => [
          `"${formatDateOnly(r.createdAt)}"`,
          `"${formatTimeOnly(r.createdAt)}"`,
          `"${r.ticketId || r.id}"`,
          `"${r.name}"`,
          `"${r.employeeId}"`,
          `"${r.itemName}"`,
          `"${r.quantity}"`,
          `"${r.status}"`,
          `"${formatDateOnly(r.updatedAt || r.createdAt)}"`,
          `"${formatTimeOnly(r.updatedAt || r.createdAt)}"`
        ].join(','))
      ].join('\n');
    } else if (activeTab === 'system') {
      const headers = ['วันที่', 'เวลา', 'ประเภท Action', 'ผู้ดำเนินการ', 'รายละเอียด', 'สถานะ'];
      csvContent = [
        headers.join(','),
        ...sortedSystemLogs.map(l => [
          `"${formatDateOnly(l.createdAt)}"`,
          `"${formatTimeOnly(l.createdAt)}"`,
          `"${l.actionType}"`,
          `"${l.userId}"`,
          `"${l.details}"`,
          `"${l.status}"`
        ].join(','))
      ].join('\n');
    } else {
      const headers = ['วันที่', 'เวลา', 'ประเภท', 'ผู้ดำเนินการ', 'รายละเอียด', 'สถานะ'];
      csvContent = [
        headers.join(','),
        ...allLogs.map(l => [
          `"${formatDateOnly(l.date)}"`,
          `"${formatTimeOnly(l.date)}"`,
          `"${l.type}"`,
          `"${l.actor}"`,
          `"${l.details}"`,
          `"${l.status}"`
        ].join(','))
      ].join('\n');
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-20 max-w-full">
      {/* Header Area */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <History size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
              Log ระบบบันทึกประวัติ
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              แยกประวัติการคีย์เบิกสินค้าของพนักงาน และ ประวัติการแก้ไข/จัดการสินค้าของแอดมินออกจากกันชัดเจน
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={fetchLogs} variant="outline" className="bg-surface shadow-sm">
            <RefreshCw size={16} className="mr-2" /> รีเฟรช Log
          </Button>
          <Button onClick={exportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-0">
            <Download size={16} className="mr-2" /> ส่งออก Excel
          </Button>
          <Button onClick={exportCSV} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-0">
            <Download size={16} className="mr-2" /> ส่งออก CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-surface border border-border rounded-xl p-2 flex flex-wrap gap-2 shadow-sm">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors text-sm min-w-[200px] ${
            activeTab === 'requests' ? 'bg-primary/5 text-primary border border-primary/20' : 'text-text-secondary hover:bg-surface-alt'
          }`}
        >
          <Package size={18} />
          การคีย์เบิกสินค้า
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors text-sm min-w-[200px] ${
            activeTab === 'system' ? 'bg-primary/5 text-primary border border-primary/20' : 'text-text-secondary hover:bg-surface-alt'
          }`}
        >
          <Settings size={18} />
          การแก้ไข / จัดการสินค้า & ระบบ
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors text-sm min-w-[200px] ${
            activeTab === 'all' ? 'bg-primary/5 text-primary border border-primary/20' : 'text-text-secondary hover:bg-surface-alt'
          }`}
        >
          <Database size={18} />
          รวมบันทึกทั้งหมด
        </button>
      </div>

      {/* Universal Filters */}
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

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30 shrink-0">
          <span className="text-text-secondary font-medium">สถานะ:</span>
          <select 
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none cursor-pointer"
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="all">ทุกสถานะ</option>
            <option value="PENDING">กำลังตรวจสอบ</option>
            <option value="APPROVED">กำลังจัดเตรียม</option>
            <option value="COLLECTED">รับของแล้ว</option>
            <option value="REJECTED">ปฏิเสธ</option>
            <option value="CANCELLED">ยกเลิก</option>
            <option value="สำเร็จ">สำเร็จ</option>
            <option value="ล้มเหลว">ล้มเหลว</option>
          </select>
        </div>

        <div className="flex flex-1 min-w-[150px] items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors focus-within:border-primary/50 hover:border-primary/30">
          <Search size={14} className="text-text-secondary shrink-0" />
          <input
            value={searchRequester}
            onChange={e => setSearchRequester(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none w-full placeholder:text-text-secondary/70"
            placeholder="ค้นหาชื่อ/ผู้ดำเนินการ..."
          />
        </div>

        {activeTab === 'requests' && (
          <div className="flex flex-1 min-w-[150px] items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors focus-within:border-primary/50 hover:border-primary/30">
            <Search size={14} className="text-text-secondary shrink-0" />
            <input
              value={searchEmployeeId}
              onChange={e => setSearchEmployeeId(e.target.value)}
              className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none w-full placeholder:text-text-secondary/70"
              placeholder="ค้นหารหัสพนักงาน..."
            />
          </div>
        )}

        <div className="flex flex-1 min-w-[150px] items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors focus-within:border-primary/50 hover:border-primary/30">
          <Search size={14} className="text-text-secondary shrink-0" />
          <input
            value={searchItemName}
            onChange={e => setSearchItemName(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none w-full placeholder:text-text-secondary/70"
            placeholder="ค้นหาสินค้า/รายละเอียด..."
          />
        </div>

        {activeTab === 'requests' && (
          <div className="flex flex-1 min-w-[150px] items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors focus-within:border-primary/50 hover:border-primary/30">
            <Filter size={14} className="text-text-secondary shrink-0" />
            <input
              value={searchRequestId}
              onChange={e => setSearchRequestId(e.target.value)}
              className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none w-full placeholder:text-text-secondary/70"
              placeholder="ค้นหาเลขที่ใบเบิก..."
            />
          </div>
        )}
      </div>

      {/* Data Table Area */}
      <Card className="shadow-sm bg-surface overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt/30">
          <h3 className="font-bold text-text-primary flex items-center gap-2">
            <Package size={18} className="text-primary" />
            {activeTab === 'requests' ? 'รายการประวัติการเบิกสินค้าพนักงาน' : activeTab === 'system' ? 'รายการประวัติการแก้ไขระบบ' : 'รวมบันทึกทั้งหมด'}
          </h3>
          <span className="px-3 py-1 bg-surface border border-border rounded-lg text-xs font-semibold text-text-secondary">
            {activeTab === 'requests' ? filteredRequests.length : activeTab === 'system' ? sortedSystemLogs.length : allLogs.length} บันทึกประวัติ
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-surface-alt/50 text-text-secondary border-b border-border">
              {activeTab === 'requests' && (
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">วันที่ทำรายการ</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">เวลา</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-primary">เลขที่ใบเบิก</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">ชื่อผู้เบิก</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">รหัสพนักงาน</th>
                  <th className="px-4 py-3 font-semibold">รายการสินค้าที่เบิก</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">จำนวน</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">สถานะ</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">วันที่ อัปเดต</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">เวลา อัปเดต</th>
                </tr>
              )}
              {activeTab === 'system' && (
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">เวลา</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-primary">ประเภท Action</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">ผู้ดำเนินการ</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">สถานะ</th>
                </tr>
              )}
              {activeTab === 'all' && (
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">วันที่</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">เวลา</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-primary">ประเภท</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">ผู้ดำเนินการ</th>
                  <th className="px-4 py-3 font-semibold">รายละเอียด</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap text-center">สถานะ</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-border/50">
              {activeTab === 'requests' && filteredRequests.map(req => (
                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatDateOnly(req.createdAt)}</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatTimeOnly(req.createdAt)}</td>
                  <td className="px-4 py-4 font-semibold text-primary">{req.ticketId || req.id}</td>
                  <td className="px-4 py-4 font-bold text-text-primary">{req.name}</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{req.employeeId}</td>
                  <td className="px-4 py-4 text-text-primary">{req.itemName}</td>
                  <td className="px-4 py-4 font-bold text-center">{req.quantity}</td>
                  <td className="px-4 py-4 text-center">{getStatusBadge(req.status)}</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatDateOnly(req.updatedAt || req.createdAt)}</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatTimeOnly(req.updatedAt || req.createdAt)}</td>
                </tr>
              ))}

              {activeTab === 'system' && sortedSystemLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatDateOnly(log.createdAt)}</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatTimeOnly(log.createdAt)}</td>
                  <td className="px-4 py-4 font-semibold text-primary">{log.actionType}</td>
                  <td className="px-4 py-4 font-bold text-text-primary">{log.userId}</td>
                  <td className="px-4 py-4 text-text-primary">{log.details}</td>
                  <td className="px-4 py-4 text-center">{getStatusBadge(log.status)}</td>
                </tr>
              ))}

              {activeTab === 'all' && allLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatDateOnly(log.date)}</td>
                  <td className="px-4 py-4 font-mono text-text-secondary">{formatTimeOnly(log.date)}</td>
                  <td className="px-4 py-4 font-semibold text-primary">{log.type}</td>
                  <td className="px-4 py-4 font-bold text-text-primary">{log.actor}</td>
                  <td className="px-4 py-4 text-text-primary">{log.details}</td>
                  <td className="px-4 py-4 text-center">{getStatusBadge(log.status)}</td>
                </tr>
              ))}

              {/* Empty States */}
              {activeTab === 'requests' && filteredRequests.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-text-secondary">ไม่พบรายการเบิกตามเงื่อนไขที่ค้นหา</td></tr>
              )}
              {activeTab === 'system' && sortedSystemLogs.length === 0 && !isLoadingLogs && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-text-secondary">ไม่พบข้อมูล Log</td></tr>
              )}
              {activeTab === 'all' && allLogs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-text-secondary">ไม่พบข้อมูลบันทึกใดๆ</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
