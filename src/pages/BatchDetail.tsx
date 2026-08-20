import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatDate } from '../lib/utils';
import { ArrowLeft, Printer, CheckCircle } from 'lucide-react';

export const BatchDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { batches, requests, items, users, departments, updateBatchStatus, distributeBatch } = useData();
  const navigate = useNavigate();
  const [isDistributing, setIsDistributing] = useState(false);

  if (!user || !user.role.includes('ADMIN')) return null;

  let batch: any = undefined;
  let batchRequests: typeof requests = [];
  let isLocal = false;

  if (id?.startsWith('local-')) {
    isLocal = true;
    const parts = id.split('-');
    const filterMode = parts[1];
    const key = parts.slice(2).join('-');
    
    batchRequests = requests.filter(req => req.status === 'COLLECTED' && !req.batchId);
    batchRequests = batchRequests.filter(req => {
      const rDate = new Date(req.createdAt);
      if (filterMode === 'day') return rDate.toISOString().split('T')[0] === key;
      if (filterMode === 'month' || filterMode === 'all') return rDate.toISOString().substring(0, 7) === key;
      if (filterMode === 'year') return rDate.getFullYear().toString() === key;
      return false;
    });
    
    if (batchRequests.length > 0) {
      batch = {
        id: id,
        createdAt: batchRequests[0].createdAt,
        status: 'COMPLETED',
        departmentId: '',
        coordinatorId: user.id, // Just showing admin's name
      };
    }
  } else {
    batch = batches.find(b => b.id === id);
    if (batch) batchRequests = requests.filter(r => r.batchId === batch.id);
  }

  if (!batch) {
    return <div className="p-8 text-center text-error">ไม่พบรายการเบิก</div>;
  }

  const coordinator = users.find(u => u.id === batch.coordinatorId);

  // Group items for consolidated view (the actual "ใบเบิกกลาง" logic)
  const consolidatedItems = batchRequests.reduce((acc, req) => {
    if (!acc[req.itemId]) {
      acc[req.itemId] = { itemId: req.itemId, quantity: 0, requests: [] };
    }
    acc[req.itemId].quantity += req.quantity;
    acc[req.itemId].requests.push(req);
    return acc;
  }, {} as Record<string, { itemId: string; quantity: number; requests: any[] }>);

  const consolidatedList = (Object.values(consolidatedItems) as Array<{ itemId: string; quantity: number; requests: any[] }>).map(cons => {
    const item = items.find(i => i.id === cons.itemId);
    return { ...cons, item };
  });

  const groupedItems = consolidatedList.reduce((acc, current) => {
    const cat = current.item?.category || 'อื่นๆ';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(current);
    return acc;
  }, {} as Record<string, typeof consolidatedList>);

  const sortedCategories = Object.keys(groupedItems).sort();

  const handlePrint = () => {
    window.print();
  };

  const handleComplete = () => {
    updateBatchStatus(batch.id, 'COMPLETED');
  };

  const handleDistribute = async () => {
    if (isLocal) return;
    setIsDistributing(true);
    await distributeBatch(batch.id);
    setIsDistributing(false);
  };

  const hasReadyRequests = !isLocal && batchRequests.some(r => r.status === 'READY');

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="px-2">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-2xl font-display font-bold text-text-primary">รายละเอียดใบเบิก</h1>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Button variant="secondary" onClick={handlePrint}>
            <Printer size={18} className="mr-2" /> พิมพ์ (PDF)
          </Button>
          {batch.status === 'PENDING' && (
            <Button variant="primary" onClick={handleComplete}>
              <CheckCircle size={18} className="mr-2" /> รับของแล้ว
            </Button>
          )}
        </div>
      </div>

      <Card id="printable-batch" className="print:shadow-none print:border-none print:m-0 print:p-0">
        <CardHeader className="border-b border-border bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-transparent">
          <div>
            <CardTitle className="text-2xl">{isLocal ? 'รายการเบิกจากสต็อก' : 'ใบเบิกอุปกรณ์ส่วนกลาง'}</CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              ประจำ {isLocal ? new Date(batch.createdAt).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' }) : `เดือน ${new Date(batch.createdAt).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}`}
            </p>
            <p className="text-sm text-text-secondary mt-1">เลขที่อ้างอิง: <span className="font-mono">{batch.id}</span></p>
          </div>
          <div className="text-left md:text-right text-sm space-y-1">
            <p><strong>{isLocal ? 'ผู้พิมพ์รายงาน:' : 'ผู้อนุมัติ / ผู้รวบรวม:'}</strong> {coordinator?.name || user.name}</p>
            <p><strong>วันที่สร้าง:</strong> {formatDate(batch.createdAt)}</p>
            <div className="print:hidden flex items-center gap-2">
              <strong>สถานะ:</strong>
              {batch.status === 'PENDING' ? (
                <Badge variant="warning">รอรับของ</Badge>
              ) : (
                <Badge variant="success">สำเร็จ</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold text-text-secondary w-16 text-center">ลำดับ</th>
                <th className="px-6 py-4 font-bold text-text-secondary">รหัสอุปกรณ์</th>
                <th className="px-6 py-4 font-bold text-text-secondary">รายการ</th>
                <th className="px-6 py-4 font-bold text-text-secondary text-right">จำนวนรวม</th>
                <th className="px-6 py-4 font-bold text-text-secondary">หน่วยนับ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sortedCategories.map(category => (
                <React.Fragment key={category}>
                  <tr className="bg-primary/5">
                    <td colSpan={5} className="px-6 py-3 font-bold text-primary">
                      {category}
                    </td>
                  </tr>
                  {groupedItems[category]
                    .sort((a, b) => (a.item?.name || '').localeCompare(b.item?.name || ''))
                    .map((cons, index) => (
                    <tr key={cons.itemId}>
                      <td className="px-6 py-4 text-center text-text-secondary">{index + 1}</td>
                      <td className="px-6 py-4 font-mono text-text-secondary">{cons.itemId}</td>
                      <td className="px-6 py-4 font-bold text-text-primary">{cons.item?.name}</td>
                      <td className="px-6 py-4 font-bold text-right text-lg">{cons.quantity}</td>
                      <td className="px-6 py-4 text-text-secondary">{cons.item?.unit}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {/* Removed Distribution List */}
          
          <div className="p-6 border-t border-border mt-8 pt-12">
            <div className="flex justify-between max-w-lg mx-auto">
              <div className="text-center space-y-12">
                <p className="text-sm">ผู้ขอเบิก (ผู้รวบรวม)</p>
                <div className="border-b border-black w-40 mx-auto"></div>
                <p className="text-xs text-text-secondary">( {coordinator?.name} )</p>
              </div>
              <div className="text-center space-y-12">
                <p className="text-sm">ผู้อนุมัติ / จ่ายของ</p>
                <div className="border-b border-black w-40 mx-auto"></div>
                <p className="text-xs text-text-secondary">(..........................................)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Internal detail breakdown - hidden when printing */}
      {!batch.id.startsWith('RESTOCK_') && (
      <div className="mt-8 print:hidden space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg font-display">รายละเอียดคำขอย่อย (สำหรับแจกจ่าย)</h3>
          {hasReadyRequests && (
            <button
              onClick={handleDistribute}
              disabled={isDistributing}
              className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-full font-bold shadow-sm transition-colors disabled:opacity-50"
            >
              {isDistributing ? 'กำลังดำเนินการ...' : 'ส่งมอบ'}
            </button>
          )}
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 font-bold text-text-secondary">ผู้ขอเบิก</th>
                  <th className="px-6 py-3 font-bold text-text-secondary">รายการ</th>
                  <th className="px-6 py-3 font-bold text-text-secondary text-right">จำนวน</th>
                  <th className="px-6 py-3 font-bold text-text-secondary text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {batchRequests.map(req => {
                  const reqUser = users.find(u => u.id === req.userId);
                  const item = items.find(i => i.id === req.itemId);
                  return (
                    <tr key={req.id}>
                      <td className="px-6 py-3">{reqUser?.name}</td>
                      <td className="px-6 py-3">{item?.name}</td>
                      <td className="px-6 py-3 text-right font-bold">{req.quantity}</td>
                      <td className="px-6 py-3 text-center">
                        <Badge variant={req.status === 'COLLECTED' ? 'success' : req.status === 'READY' ? 'primary' : 'warning'}>
                          {req.status === 'COLLECTED' ? 'ส่งมอบแล้ว' : req.status === 'READY' ? 'รอส่งมอบ' : req.status}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      )}
    </div>
  );
};
