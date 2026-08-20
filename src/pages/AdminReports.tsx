import React, { useMemo, useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Download, Filter, Search, TrendingUp, Package, Award, BarChart as BarChartIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminReports = () => {
  const { user } = useAuth();
  const { requests, items, users, departments } = useData();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth.toString());
  const [search, setSearch] = useState<string>('');

  if (!user || !user.role.includes('ADMIN')) return null;

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (r.status === 'CANCELLED' || r.status === 'REJECTED') return false;
      
      const rDate = new Date(r.createdAt);
      const matchYear = selectedYear === 'all' || rDate.getFullYear().toString() === selectedYear;
      const matchMonth = selectedMonth === 'all' || rDate.getMonth().toString() === selectedMonth;
      
      return matchYear && matchMonth;
    });
  }, [requests, selectedYear, selectedMonth]);

  const itemUsage = useMemo(() => {
    const usage: Record<string, { id: string; name: string; quantity: number; unit: string; count: number; imageUrl?: string; price?: number }> = {};
    filteredRequests.forEach(req => {
      const item = items.find(i => i.id === req.itemId);
      if (!item) return;
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return;
      
      if (!usage[item.id]) {
        usage[item.id] = { id: item.id, name: item.name, quantity: 0, unit: item.unit, count: 0, imageUrl: item.imageUrl, price: item.price };
      }
      usage[item.id].quantity += req.quantity;
      usage[item.id].count += 1;
    });
    return Object.values(usage).sort((a, b) => b.quantity - a.quantity);
  }, [filteredRequests, items, search]);

  const top10 = itemUsage.slice(0, 10);
  const topItem = itemUsage.length > 0 ? itemUsage[0] : null;
  const totalItemsCount = itemUsage.length;
  const totalQuantity = itemUsage.reduce((sum, item) => sum + item.quantity, 0);

  const handleExportCSV = () => {
    const headers = ['ลำดับ', 'ชื่อสินค้า', 'จำนวนเบิก', 'หน่วย', 'จำนวนครั้งที่เบิก'];
    const rows = itemUsage.map((item, index) => {
      return [
        index + 1,
        `"${item.name.replace(/"/g, '""')}"`,
        item.quantity,
        `"${item.unit.replace(/"/g, '""')}"`,
        item.count
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `summary_report_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    { value: '0', label: 'มกราคม' },
    { value: '1', label: 'กุมภาพันธ์' },
    { value: '2', label: 'มีนาคม' },
    { value: '3', label: 'เมษายน' },
    { value: '4', label: 'พฤษภาคม' },
    { value: '5', label: 'มิถุนายน' },
    { value: '6', label: 'กรกฎาคม' },
    { value: '7', label: 'สิงหาคม' },
    { value: '8', label: 'กันยายน' },
    { value: '9', label: 'ตุลาคม' },
    { value: '10', label: 'พฤศจิกายน' },
    { value: '11', label: 'ธันวาคม' },
  ];

  const years = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());
  
  // Custom tooltip for the chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface border border-border shadow-lg p-3 rounded-xl">
          <p className="font-bold text-sm mb-1">{payload[0].payload.name}</p>
          <p className="text-primary font-medium text-sm">
            จำนวนเบิก: {payload[0].value} {payload[0].payload.unit}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
            <BarChartIcon size={24} className="lucide lucide-bar-chart-2" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">สรุปยอดการเบิกสินค้า</h1>
            <p className="text-sm text-text-secondary mt-1">รายงานสรุปจำนวนพัสดุที่ถูกเบิกจ่ายประจำเดือน สำหรับเจ้าหน้าที่คลังพัสดุ</p>
          </div>
        </div>
        <Button onClick={handleExportCSV} variant="outline" className="shrink-0 rounded-full bg-surface">
          <Download size={16} className="mr-2" />
          ส่งออกข้อมูล
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 p-2 bg-surface border border-border rounded-xl shadow-sm">
        <div className="flex items-center gap-2 pl-2 pr-1 border-r border-border/50 text-text-secondary">
          <Filter size={16} />
        </div>
        
        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30">
          <span className="text-text-secondary font-medium">ปี:</span>
          <select 
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none cursor-pointer"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
          >
            <option value="all">ทุกปี</option>
            {years.map(y => <option key={y} value={y}>ค.ศ. {y} ({parseInt(y) + 543})</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors hover:border-primary/30">
          <span className="text-text-secondary font-medium">เดือน:</span>
          <select 
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none cursor-pointer"
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
          >
            <option value="all">ทุกเดือน</option>
            {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="flex flex-1 min-w-[200px] items-center gap-2 px-3 py-1.5 bg-surface-alt rounded-lg border border-border/50 text-sm transition-colors focus-within:border-primary/50 hover:border-primary/30">
          <Search size={14} className="text-text-secondary shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:ring-0 p-0 text-sm outline-none w-full placeholder:text-text-secondary/70"
            placeholder="ค้นหาสินค้า..."
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="p-6 shadow-sm flex flex-col justify-between border-border/60 hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm text-text-secondary font-medium">จำนวนรายการสินค้าที่ถูกเบิก</p>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <Package size={20} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-bold text-text-primary">
              {totalItemsCount} <span className="text-sm font-medium text-text-secondary">รายการ</span>
            </p>
            <p className="text-xs text-text-secondary mt-2">จำนวนชนิดสินค้าที่มีการเบิกในเดือนที่เลือก</p>
          </div>
        </Card>
        
        <Card className="p-6 shadow-sm flex flex-col justify-between border-border/60 hover:border-primary/30 transition-colors">
          <div className="flex justify-between items-start mb-4">
            <p className="text-sm text-text-secondary font-medium">ยอดเบิกรวมทั้งหมด</p>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center shrink-0">
              <TrendingUp size={20} />
            </div>
          </div>
          <div>
            <p className="text-4xl font-bold text-text-primary">
              {totalQuantity} <span className="text-sm font-medium text-text-secondary">หน่วย/ชิ้น</span>
            </p>
            <p className="text-xs text-text-secondary mt-2">ปริมาณรวมของทุกรายการที่ถูกเบิกออกคลัง</p>
          </div>
        </Card>
        
        <Card className="p-6 shadow-lg bg-gradient-to-br from-slate-800 to-slate-900 text-white border-transparent relative overflow-hidden">
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-bl-full pointer-events-none" />
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-4">
              <p className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Award size={16} className="text-amber-400" /> สินค้าที่เบิกมากที่สุด
              </p>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 border border-white/10">
                <Award size={16} className="text-amber-400" />
              </div>
            </div>
            {topItem ? (
              <div>
                <p className="text-lg font-bold line-clamp-1 mb-2" title={topItem.name}>{topItem.name}</p>
                <p className="text-4xl font-bold text-amber-400">
                  {topItem.quantity} <span className="text-sm font-medium text-slate-300">{topItem.unit}</span>
                </p>
                <p className="text-xs text-slate-400 mt-2">อันดับ 1 สินค้าที่ถูกเบิกสูงสุดประจำเดือน</p>
              </div>
            ) : (
              <div className="flex-1 flex items-center text-slate-400 text-sm">ไม่มีข้อมูลการเบิกสินค้า</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="p-6 shadow-sm border-border/60">
        <div className="flex justify-between items-end mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChartIcon size={18} className="text-primary" />
              <h2 className="text-lg font-bold text-text-primary">Top 10 สินค้าเบิกสูงสุดประจำเดือน</h2>
            </div>
            <p className="text-sm text-text-secondary mt-1">แสดงสถิติเปรียบเทียบ 10 อันดับแรกสินค้าที่ถูกเบิกจำนวนมากที่สุด</p>
          </div>
          <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold hidden sm:block">
            Top 10 Items
          </div>
        </div>
        
        <div className="h-[400px] w-full mt-4">
          {top10.length > 0 ? (
            <div className="flex flex-col gap-4 mt-2 overflow-y-auto pr-2 max-h-[380px] custom-scrollbar">
              {top10.map((item, index) => {
                const proportion = (item.quantity / top10[0].quantity) * 100;
                return (
                  <div key={item.id} className="flex items-center gap-4 bg-surface p-3 rounded-xl border border-border">
                    <div className="w-6 text-center font-bold text-text-secondary text-sm">#{index + 1}</div>
                    <div className="h-12 w-12 rounded-lg bg-surface-alt flex-shrink-0 flex items-center justify-center overflow-hidden border border-border/50">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package size={24} className="text-primary/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <p className="font-semibold text-sm truncate text-text-primary" title={item.name}>{item.name}</p>
                        <p className="font-bold text-sm text-primary whitespace-nowrap ml-2">{item.quantity} <span className="text-xs font-normal text-text-secondary">{item.unit}</span></p>
                      </div>
                      <div className="w-full bg-surface-alt rounded-full h-2 mb-1 overflow-hidden">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${proportion}%` }}></div>
                      </div>
                      <p className="text-xs text-text-secondary text-right">
                        มูลค่ารวม: {item.price !== undefined ? `${(item.price * item.quantity).toLocaleString()} บาท` : '- บาท'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-text-secondary bg-surface-alt/30 rounded-xl border border-dashed border-border">
              ไม่มีข้อมูลในเดือน/ปี ที่เลือก
            </div>
          )}
        </div>
      </Card>
      
      <Card className="shadow-sm border-border/60 overflow-hidden">
        <div className="p-6 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              <h2 className="text-lg font-bold text-text-primary">ตารางสรุปจำนวนการเบิกสินค้า (เรียงจากมากไปน้อย)</h2>
            </div>
            <p className="text-sm text-text-secondary mt-1">แสดงข้อมูลตัวเลขสินค้าที่มีการเบิกจ่ายในคลัง</p>
          </div>
          <div className="bg-surface-alt text-text-secondary px-3 py-1.5 rounded-full text-xs font-medium border border-border">
            รวม {totalItemsCount} รายการสินค้า
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-surface-alt/50 border-b border-border text-text-secondary">
              <tr>
                <th className="px-6 py-4 font-semibold w-20 text-center">ลำดับ</th>
                <th className="px-6 py-4 font-semibold">ชื่อสินค้า</th>
                <th className="px-6 py-4 font-semibold text-right">จำนวนเบิก</th>
                <th className="px-6 py-4 font-semibold text-center w-24">หน่วย</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {itemUsage.map((item, index) => (
                <tr key={item.name} className="hover:bg-surface-alt/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center mx-auto text-xs font-bold ${
                      index === 0 ? 'bg-amber-100 text-amber-600 border border-amber-200' :
                      index === 1 ? 'bg-slate-200 text-slate-600 border border-slate-300' :
                      index === 2 ? 'bg-orange-100 text-orange-700 border border-orange-200' :
                      'bg-surface-alt text-text-secondary border border-border'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-text-primary">
                    <div className="flex items-center gap-2">
                      {item.name}
                      <span className="text-[10px] bg-surface-alt text-text-secondary px-2 py-0.5 rounded-full">
                        {item.count} ครั้ง
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-primary text-base">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs bg-primary/5 text-primary border border-primary/10 px-2 py-1 rounded-md">
                      {item.unit}
                    </span>
                  </td>
                </tr>
              ))}
              {itemUsage.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-text-secondary">
                    ไม่พบข้อมูลการเบิกสินค้าที่ตรงกับเงื่อนไข
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

