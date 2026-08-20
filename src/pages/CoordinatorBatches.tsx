import React from 'react';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { formatDate } from '../lib/utils';
import { Badge } from '../components/ui/Badge';
import { toast } from 'sonner';
import { Filter } from 'lucide-react';

export const CoordinatorBatches = () => {
  const { user } = useAuth();
  const { batches, requests, departments, updateBatchStatus } = useData();
  const [filterMode, setFilterMode] = React.useState<'day' | 'month' | 'year' | 'all'>('month');
  const [filterDate, setFilterDate] = React.useState<string>(new Date().toISOString().substring(0, 7) + '-01');
  const [activeTab, setActiveTab] = React.useState<'central' | 'local'>('central');
  
  const [completingBatchId, setCompletingBatchId] = React.useState<string | null>(null);
  
  if (!user || !user.role.includes('ADMIN')) return null;

  const filteredBatches = batches
    .filter(batch => {
      if (filterMode === 'all') return true;
      const rDate = new Date(batch.createdAt);
      const fDate = new Date(filterDate);
      if (filterMode === 'day') return rDate.toDateString() === fDate.toDateString();
      if (filterMode === 'month') return rDate.getMonth() === fDate.getMonth() && rDate.getFullYear() === fDate.getFullYear();
      if (filterMode === 'year') return rDate.getFullYear() === fDate.getFullYear();
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const localRequests = requests.filter(req => req.status === 'COLLECTED' && !req.batchId);

  const groupedLocalRequests = React.useMemo(() => {
    const groups: Record<string, typeof requests> = {};
    
    localRequests.forEach(req => {
      const rDate = new Date(req.createdAt);
      const fDate = new Date(filterDate);
      let key = '';
      let title = '';
      
      if (filterMode === 'day') {
        key = rDate.toISOString().split('T')[0];
        title = `วันที่ ${rDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
      } else if (filterMode === 'month' || filterMode === 'all') {
        key = rDate.toISOString().substring(0, 7);
        title = `เดือน ${rDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
      } else if (filterMode === 'year') {
        key = rDate.getFullYear().toString();
        title = `ปี ${rDate.toLocaleDateString('th-TH', { year: 'numeric' })}`;
      }
      
      let include = true;
      if (filterMode === 'day') include = rDate.toDateString() === fDate.toDateString();
      if (filterMode === 'month') include = rDate.getMonth() === fDate.getMonth() && rDate.getFullYear() === fDate.getFullYear();
      if (filterMode === 'year') include = rDate.getFullYear() === fDate.getFullYear();
      
      if (include || filterMode === 'all') {
        if (!groups[key]) groups[key] = [];
        groups[key].push(req);
        // attach title to the first element or something, or we can just reconstruct it in render.
      }
    });
    
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [localRequests, filterMode, filterDate]);

  const handleComplete = async (batchId: string) => {
    setCompletingBatchId(batchId);
    try {
      await updateBatchStatus(batchId, 'COMPLETED');
      toast.success('อัปเดตสถานะได้รับของแล้วสำเร็จ');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    } finally {
      setCompletingBatchId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Summary records</p>
          <h1 className="text-3xl font-bold text-text-primary">สรุปรายการเบิก</h1>
          <p className="mt-2 text-text-secondary">ตรวจสอบสถานะการเบิกจากทุกแผนก</p>
        </div>
        <div className="flex bg-surface-alt p-1 rounded-xl border border-border">
          <button
            onClick={() => setActiveTab('central')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'central' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            เบิกส่วนกลาง
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'local' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
          >
            เบิกจากสต็อก
          </button>
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

      <div className="grid grid-cols-1 gap-4">
        {activeTab === 'central' && filteredBatches.map(batch => {
          const batchReqs = requests.filter(r => r.batchId === batch.id);
          const totalItems = batchReqs.reduce((sum, r) => sum + r.quantity, 0);
          const isCompleting = completingBatchId === batch.id;
          
          return (
            <div key={batch.id} className="bg-surface rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">
                    {batch.id.startsWith('RESTOCK_') ? 'ใบสั่งเติมสต็อกแผนก ' : 'รอบเบิกประจำเดือน '}
                    {new Date(batch.createdAt).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                  </h3>
                  {batch.id.startsWith('RESTOCK_') && <Badge variant="primary">ใบสั่งเติมคลัง</Badge>}
                  {batch.status === 'PENDING' ? (
                    <Badge variant="warning">รอรับของจากส่วนกลาง</Badge>
                  ) : (
                    <Badge variant="success">ได้รับของแล้ว</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>วันที่สร้าง: {formatDate(batch.createdAt)}</span>
                  <span>•</span>
                  <span>รวม {batchReqs.length} คำขอ ({totalItems} ชิ้น)</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                {batch.status === 'PENDING' && (
                  <Button 
                    isLoading={isCompleting}
                    onClick={() => handleComplete(batch.id)}
                  >
                    ได้รับของแล้ว
                  </Button>
                )}
                <Link to={`/coordinator/batches/${batch.id}`}>
                  <Button variant="secondary">ดูรายละเอียด / พิมพ์</Button>
                </Link>
              </div>
            </div>
          );
        })}
        {activeTab === 'central' && filteredBatches.length === 0 && (
          <div className="text-center py-12 text-text-secondary border border-border rounded-xl bg-surface">
            ไม่พบรายการเบิกส่วนกลาง
          </div>
        )}

        {activeTab === 'local' && groupedLocalRequests.map(([key, reqs]) => {
          const totalItems = reqs.reduce((sum, r) => sum + r.quantity, 0);
          const rDate = new Date(reqs[0].createdAt);
          let title = '';
          if (filterMode === 'day') {
            title = `วันที่ ${rDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}`;
          } else if (filterMode === 'month' || filterMode === 'all') {
            title = `เดือน ${rDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`;
          } else if (filterMode === 'year') {
            title = `ปี ${rDate.toLocaleDateString('th-TH', { year: 'numeric' })}`;
          }

          return (
            <div key={key} className="bg-surface rounded-xl border border-border p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:-translate-y-[2px]">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-lg">
                    รายการเบิกจากสต็อกประจำ {title}
                  </h3>
                  <Badge variant="success">จ่ายจากสต็อกแล้ว</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary">
                  <span>•</span>
                  <span>รวม {reqs.length} คำขอ ({totalItems} ชิ้น)</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Link to={`/coordinator/batches/local-${filterMode}-${key}`}>
                  <Button variant="secondary">ดูรายละเอียด / พิมพ์</Button>
                </Link>
              </div>
            </div>
          );
        })}
        {activeTab === 'local' && groupedLocalRequests.length === 0 && (
          <div className="text-center py-12 text-text-secondary border border-border rounded-xl bg-surface">
            ไม่พบรายการเบิกจากสต็อก
          </div>
        )}
      </div>
    </div>
  );
};
