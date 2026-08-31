import React, { useState } from 'react';
import { Edit3, PackagePlus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Item, ItemCategory } from '../types';

const commonUnits = ['ชิ้น', 'กล่อง', 'ด้าม', 'แพ็ค', 'เล่ม', 'ม้วน', 'รีม', 'อัน', 'ชุด', 'PCS.', 'BOX', 'PACK', 'ROLL', 'SET', 'EA', 'BAG', 'BTL', 'CAN'];
const emptyForm = { id: '', name: '', category: '', unit: 'PCS.', imageUrl: '', currentStock: 0, price: undefined as number | undefined, remark: '' };

export const AdminItems = () => {
  const { user } = useAuth();
  const { items, categories: dynamicCategories, addItem, updateItem, deleteItem, addCategory, deleteCategory } = useData();
  const categoryNames = dynamicCategories.map(c => c.name);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('list');
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  if (!user || !user.role.includes('ADMIN')) return null;

  const startCreate = () => { setEditingId('new'); setFormData({ ...emptyForm, category: categoryNames[0] || '' }); };
  const startEdit = (item: Item) => { setEditingId(item.id); setFormData({ id: item.id, name: item.name, category: item.category, unit: item.unit, imageUrl: item.imageUrl || '', currentStock: Number(item.currentStock) || 0, price: item.price !== undefined ? Number(item.price) : undefined, remark: item.remark || '' }); };
  const save = () => {
    if (!formData.name.trim() || !formData.unit.trim() || !formData.id.trim()) {
      alert('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (รหัสสินค้า, ชื่อ, หน่วยนับ)');
      return;
    }
    const dataToSave = { ...formData };
    if (dataToSave.price === undefined || isNaN(dataToSave.price)) delete dataToSave.price;
    
    if (editingId === 'new') {
      addItem(dataToSave, user.name);
      toast.success('เพิ่มอุปกรณ์ใหม่เรียบร้อยแล้ว');
    } else if (editingId) {
      updateItem(editingId, dataToSave, user.name);
      toast.success('แก้ไขข้อมูลอุปกรณ์เรียบร้อยแล้ว');
    }
    setEditingId(null);
  };
  const confirmDeleteItem = async () => {
    if (itemToDelete) {
      try {
        await deleteItem(itemToDelete.id, user.name);
        toast.success('ลบอุปกรณ์เรียบร้อยแล้ว');
      } catch (error) {
        toast.error('ไม่สามารถลบอุปกรณ์ได้');
      } finally {
        setItemToDelete(null);
      }
    }
  };
  const [activeCategory, setActiveCategory] = useState<string | 'ทั้งหมด'>('ทั้งหมด');

  const handleAddCategory = () => {
    if (newCategoryName.trim()) {
      addCategory(newCategoryName.trim());
      setNewCategoryName('');
      toast.success('เพิ่มหมวดหมู่เรียบร้อยแล้ว');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่นี้?')) {
      try {
        await deleteCategory(catId);
        toast.success('ลบหมวดหมู่เรียบร้อยแล้ว');
      } catch (error) {
        toast.error('ไม่สามารถลบหมวดหมู่ได้');
      }
    }
  };
  
  const visibleItems = items.filter(item => {
    const matchesSearch = `${item.name} ${item.category} ${item.unit}`.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'ทั้งหมด' || item.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Master data</p>
          <h1 className="text-3xl font-bold text-text-primary">จัดการอุปกรณ์</h1>
          <p className="mt-2 text-text-secondary">เพิ่ม แก้ไข และดูข้อมูลอุปกรณ์ที่เปิดให้เบิก</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>
            จัดการหมวดหมู่
          </Button>
          <Button onClick={startCreate}>
            <PackagePlus size={18} className="mr-2" />เพิ่มอุปกรณ์ใหม่
          </Button>
        </div>
      </div>

      {editingId && (
        <Card className="border-primary/30 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold">{editingId === 'new' ? 'เพิ่มอุปกรณ์ใหม่' : 'แก้ไขข้อมูลอุปกรณ์'}</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>ปิด</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Field label="รหัสสินค้า" className="xl:col-span-1">
              <Input autoFocus={editingId === 'new'} disabled={editingId !== 'new'} value={formData.id} onChange={event => setFormData({ ...formData, id: event.target.value })} placeholder="เช่น 100000374" />
            </Field>
            <Field label="ชื่อรายการ" className="xl:col-span-1 md:col-span-2">
              <Input autoFocus={editingId !== 'new'} value={formData.name} onChange={event => setFormData({ ...formData, name: event.target.value })} placeholder="เช่น กระดาษถ่ายเอกสาร A4" />
            </Field>
            <Field label="หมวดหมู่">
              <select className="select-control" value={formData.category} onChange={event => setFormData({ ...formData, category: event.target.value })}>
                {categoryNames.length === 0 && <option value="">ไม่มีหมวดหมู่</option>}
                {categoryNames.map(category => <option key={category} value={category}>{category}</option>)}
              </select>
            </Field>
            <Field label="หน่วยนับ">
              <input className="select-control" list="common-units" value={formData.unit} onChange={event => setFormData({ ...formData, unit: event.target.value.toUpperCase() })} placeholder="เลือกหรือพิมพ์หน่วย" />
              <datalist id="common-units">{commonUnits.map(unit => <option key={unit} value={unit} />)}</datalist>
            </Field>
            <Field label="ลิงก์รูปภาพ (ไม่บังคับ)" className="md:col-span-2">
              <Input value={formData.imageUrl} onChange={event => setFormData({ ...formData, imageUrl: event.target.value })} placeholder="https://example.com/image.jpg" />
            </Field>
            <Field label="สต็อกเริ่มต้น" className="xl:col-span-1">
              <Input type="number" value={formData.currentStock} onChange={event => setFormData({ ...formData, currentStock: Number(event.target.value) })} min="0" />
            </Field>
            <Field label="ราคาต่อหน่วย (ไม่บังคับ)" className="xl:col-span-1">
              <Input type="number" value={formData.price ?? ''} onChange={event => setFormData({ ...formData, price: event.target.value ? Number(event.target.value) : undefined })} min="0" step="0.01" placeholder="บาท" />
            </Field>
            <Field label="หมายเหตุ (ไม่บังคับ)" className="md:col-span-2">
              <Input value={formData.remark} onChange={event => setFormData({ ...formData, remark: event.target.value })} placeholder="เช่น รุ่น, สี, หรือข้อมูลเพิ่มเติม" />
            </Field>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditingId(null)}>ยกเลิก</Button>
            <Button onClick={save}>บันทึกข้อมูล</Button>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
          <button
            onClick={() => setActiveCategory('ทั้งหมด')}
            className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${activeCategory === 'ทั้งหมด' ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary hover:bg-surface-alt'}`}
          >
            ทั้งหมด
          </button>
          {categoryNames.map(category => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-colors border ${activeCategory === category ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-secondary hover:bg-surface-alt'}`}
            >
              {category}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-alt p-1 rounded-xl border border-border">
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'gallery' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              Gallery
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'list' ? 'bg-surface shadow-sm text-text-primary' : 'text-text-secondary hover:text-text-primary'}`}
            >
              List
            </button>
          </div>
          <div className="relative w-full sm:w-64 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <Input className="h-10 pl-9 rounded-full" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหารายการ..." />
        </div>
      </div>
      </div>

      <div className={viewMode === 'gallery' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" : "flex flex-col gap-3"}>
        {visibleItems.map(item => (
          viewMode === 'gallery' ? (
          <Card key={item.id} className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
            <div className="relative pt-[70%] bg-surface-alt border-b border-border/50">
              <div className="absolute inset-0 flex items-center justify-center p-4">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain mix-blend-multiply" />
                ) : (
                  <PackagePlus size={48} className="text-text-secondary/20" />
                )}
              </div>
              <div className="absolute top-3 left-3">
                <span className="bg-surface/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-md text-text-secondary shadow-sm">
                  {item.category}
                </span>
              </div>
            </div>
            
            <div className="p-5 flex flex-col flex-1">
              <h3 className="font-bold text-text-primary text-lg leading-tight line-clamp-2" title={item.name}>{item.name}</h3>
              {item.remark && (
                <p className="text-xs text-text-secondary mt-2 line-clamp-1 bg-surface-alt/80 px-2 py-1 rounded-md inline-block border border-border/50 self-start">{item.remark}</p>
              )}
              
              <div className="mt-auto pt-3">
                <p className="text-xs text-text-secondary font-mono">ID : {item.id}</p>
                {item.price !== undefined && (
                  <p className="text-sm font-semibold text-primary mt-1">฿{Number(item.price).toLocaleString()}</p>
                )}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-xs text-text-secondary">คงเหลือ</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className={`text-lg font-bold ${Number(item.currentStock) > 0 ? 'text-success' : 'text-error'}`}>
                      {item.currentStock || 0}
                    </span>
                    <span className="text-xs font-medium text-text-secondary">{item.unit}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  <Button size="sm" variant="outline" className="h-8 w-8 p-0 shrink-0" onClick={() => startEdit(item)} title="แก้ไข">
                    <Edit3 size={14} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 shrink-0 text-error hover:bg-error/10 hover:text-error" onClick={() => setItemToDelete(item)} title="ลบ">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          ) : (
            <Card key={item.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 transition-all hover:shadow-md border border-border/50">
              <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-surface-alt border border-border/50 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <PackagePlus size={24} className="text-text-secondary/30" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-text-primary text-lg truncate">{item.name}</h3>
                  <span className="bg-surface-alt text-xs font-semibold px-2 py-0.5 rounded text-text-secondary border border-border/50">
                    {item.category}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm text-text-secondary">
                  <span className="font-mono">ID : {item.id}</span>
                  {item.price !== undefined && (
                    <span className="font-semibold text-primary">฿{Number(item.price).toLocaleString()}</span>
                  )}
                  {item.remark && (
                    <span className="truncate max-w-[200px] border-l border-border pl-3">{item.remark}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-6 sm:pl-4 sm:border-l border-border w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0">
                <div className="flex flex-col flex-1 sm:flex-none">
                  <span className="text-xs text-text-secondary">คงเหลือ</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg font-bold ${Number(item.currentStock) > 0 ? 'text-success' : 'text-error'}`}>
                      {item.currentStock || 0}
                    </span>
                    <span className="text-xs font-medium text-text-secondary">{item.unit}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 shrink-0" onClick={() => startEdit(item)} title="แก้ไข">
                    <Edit3 size={16} />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 shrink-0 text-error hover:bg-error/10 hover:text-error" onClick={() => setItemToDelete(item)} title="ลบ">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </Card>
          )
        ))}
        {visibleItems.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-surface-alt/30">
            <PackagePlus size={48} className="mx-auto mb-4 text-text-secondary/30" />
            <p className="text-lg font-bold text-text-primary">ไม่พบรายการอุปกรณ์</p>
            <p className="text-sm text-text-secondary mt-1">ลองเปลี่ยนคำค้นหา หรือหมวดหมู่ที่เลือก</p>
          </div>
        )}
      </div>

      {itemToDelete && (
        <ConfirmDialog
          title="ยืนยันการลบอุปกรณ์"
          message={`คุณแน่ใจหรือไม่ว่าต้องการลบ "${itemToDelete.name}"? การกระทำนี้ไม่สามารถย้อนกลับได้`}
          confirmLabel="ลบอุปกรณ์"
          cancelLabel="ยกเลิก"
          onConfirm={confirmDeleteItem}
          onCancel={() => setItemToDelete(null)}
          isDestructive
        />
      )}
      
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-md p-6 shadow-xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4">จัดการหมวดหมู่</h2>
            
            <div className="flex gap-2 mb-6">
              <Input 
                value={newCategoryName} 
                onChange={e => setNewCategoryName(e.target.value)} 
                placeholder="ชื่อหมวดหมู่ใหม่..." 
                className="flex-1"
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <Button onClick={handleAddCategory}>เพิ่ม</Button>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {dynamicCategories.length === 0 ? (
                <p className="text-center text-text-secondary py-4 text-sm">ยังไม่มีหมวดหมู่</p>
              ) : (
                dynamicCategories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface-alt">
                    <span className="font-medium text-sm">{cat.name}</span>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded-md transition-colors"
                      title="ลบหมวดหมู่"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>ปิดหน้าต่าง</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, className = '', children }: { label: string; className?: string; children: React.ReactNode }) => <label className={`block ${className}`}><span className="mb-2 block text-sm font-semibold text-text-primary">{label}</span>{children}</label>;

export default AdminItems;
