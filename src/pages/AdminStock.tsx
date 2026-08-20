import React, { useMemo, useState } from 'react';
import { Archive, Check, Search, ArrowDownWideNarrow, ShoppingCart, Plus, Minus, X, PackagePlus, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Item, ItemCategory } from '../types';

export const AdminStock = () => {
  const { user } = useAuth();
  const { items, categories: dynamicCategories, updateItem, addRequests } = useData();
  const categoryNames = dynamicCategories.map(c => c.name);
  const [search, setSearch] = useState('');
  const [countedStock, setCountedStock] = useState<Record<string, { stock?: string }>>({});
  const [viewMode, setViewMode] = useState<'gallery' | 'list'>('list');
  const [activeCategory, setActiveCategory] = useState<string | 'ทั้งหมด'>('ทั้งหมด');
  const [sortOrder, setSortOrder] = useState<'default' | 'desc' | 'asc'>('default');
  const [restockCart, setRestockCart] = useState<{itemId: string, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!user || !user.role.includes('ADMIN')) return null;
  
  const visibleItems = useMemo(() => {
    const filtered = items.filter(item => {
      const matchesSearch = `${item.name} ${item.category} ${item.unit}`.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'ทั้งหมด' || item.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    if (sortOrder === 'desc') {
      return [...filtered].sort((a, b) => Number(b.currentStock || 0) - Number(a.currentStock || 0));
    } else if (sortOrder === 'asc') {
      return [...filtered].sort((a, b) => Number(a.currentStock || 0) - Number(b.currentStock || 0));
    }
    return filtered;
  }, [items, search, activeCategory, sortOrder]);

  const saveCount = (id: string) => { 
    const stockVal = countedStock[id]?.stock;
    const updates: Partial<Item> = {};
    if (stockVal !== undefined && Number.isFinite(Number(stockVal)) && Number(stockVal) >= 0) updates.currentStock = Number(stockVal);
    if (Object.keys(updates).length === 0) return;
    
    updateItem(id, updates); 
    toast.success('บันทึกข้อมูลเรียบร้อยแล้ว');
    setCountedStock(current => { const next = { ...current }; delete next[id]; return next; }); 
  };
  const totalStock = items.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);

  const addToCart = (item: Item) => {
    setRestockCart(prev => {
      const existing = prev.find(c => c.itemId === item.id);
      if (existing) {
        return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { itemId: item.id, quantity: 1 }];
    });
    toast.success(`เพิ่ม "${item.name}" ลงตะกร้าสั่งเติมสต็อกแล้ว`);
  };

  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setRestockCart(prev => prev.map(c => c.itemId === itemId ? { ...c, quantity } : c));
  };

  const removeFromCart = (itemId: string) => {
    setRestockCart(prev => prev.filter(c => c.itemId !== itemId));
  };

  const handleConfirmRestock = async () => {
    if (restockCart.length === 0 || !user) return;
    setIsSubmitting(true);
    
    const requests = restockCart.map(c => {
      const itemInfo = items.find(i => i.id === c.itemId);
      return {
        userId: 'system-restock', // Magic ID for restock
        employeeId: user.employeeId,
        name: user.name, // Will be overridden in Coordinator view
        itemId: c.itemId,
        itemName: itemInfo?.name || '',
        quantity: c.quantity,
        reason: 'สั่งเติมคลัง',
        ticketId: 'RESTOCK_TICKET_' + Date.now() // Unique ticket per cart confirm
      };
    });
    
    // Use the first request's ticketId for all of them so they group together
    const ticketId = 'RESTOCK_TICKET_' + Date.now();
    requests.forEach(r => r.ticketId = ticketId);
    
    try {
      await addRequests(requests);
      setRestockCart([]);
      setIsCartOpen(false);
      toast.success('ส่งรายการสั่งเติมสต็อกสำเร็จแล้ว!');
    } catch {
      toast.error('เกิดข้อผิดพลาดในการส่งคำสั่งเติมสต็อก');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Inventory control</p>
          <h1 className="text-3xl font-bold text-text-primary">ตรวจนับสต็อกคงเหลือ</h1>
          <p className="mt-2 text-text-secondary">บันทึกยอดจริงและราคาในตู้เก็บของ เพื่อเช็กจำนวนพร้อมใช้ได้โดยไม่ต้องนับใหม่ทุกครั้ง</p>
        </div>
        <Card className="flex items-center gap-3 px-5 py-3">
          <div className="rounded-xl bg-primary/10 p-2 text-primary">
            <Archive size={18} />
          </div>
          <div>
            <p className="text-xs text-text-secondary">สินค้าคงเหลือรวม</p>
            <p className="font-bold">{totalStock.toLocaleString()} หน่วย</p>
          </div>
        </Card>
      </div>

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
          <button 
            onClick={() => setSortOrder(prev => prev === 'default' ? 'desc' : prev === 'desc' ? 'asc' : 'default')}
            className={`flex items-center justify-center h-10 w-10 shrink-0 rounded-xl border transition-all ${sortOrder !== 'default' ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-surface-alt border-border text-text-secondary hover:bg-surface-alt hover:text-text-primary'}`}
            title="เรียงตามยอดสต็อกคงเหลือ"
          >
            <ArrowDownWideNarrow 
              size={18} 
              className={`transition-transform duration-300 ${sortOrder === 'asc' ? 'rotate-180' : sortOrder === 'default' ? 'opacity-40' : ''}`} 
            />
          </button>
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
        {visibleItems.map(item => {
          const isEditing = countedStock[item.id] !== undefined;
          const stock = Number(item.currentStock || 0);
          
          let stockColor = '';
          if (stock === 0) stockColor = 'bg-error/10 text-error';
          else if (stock >= 1 && stock <= 5) stockColor = 'bg-warning/10 text-warning-foreground';
          else stockColor = 'bg-success/10 text-success';
          
          const currentEdit = countedStock[item.id] || {};
          
          return viewMode === 'gallery' ? (
            <Card key={item.id} className="flex flex-col h-full overflow-hidden transition-all hover:shadow-md hover:-translate-y-1">
              <div className="relative pt-[70%] bg-surface-alt border-b border-border/50">
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain mix-blend-multiply" />
                  ) : (
                    <Archive size={48} className="text-text-secondary/20" />
                  )}
                </div>
                <div className="absolute top-3 left-3">
                  <span className="bg-surface/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-md text-text-secondary shadow-sm">
                    {item.category}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <div className={`rounded-xl px-2 py-1 text-xs font-bold ${stockColor} shadow-sm backdrop-blur-sm`}>
                    คงเหลือ {stock.toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-bold text-text-primary text-lg leading-tight line-clamp-2" title={item.name}>{item.name}</h3>
                {item.remark && (
                  <p className="text-xs text-text-secondary mt-2 line-clamp-1 bg-surface-alt/80 px-2 py-1 rounded-md inline-block border border-border/50 self-start">{item.remark}</p>
                )}
                
                <div className="mt-auto pt-3">
                  <p className="text-xs text-text-secondary font-mono">ID : {item.id}</p>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addToCart(item)}
                    className="w-full mb-2 border-primary/50 text-primary hover:bg-primary hover:text-white"
                  >
                    <PackagePlus size={14} className="mr-1.5" />
                    ใส่ตะกร้าสั่งเติมสต็อก
                  </Button>
                  <div className="relative">
                    <Input 
                      type="number" 
                      min="0" 
                      value={isEditing && currentEdit.stock !== undefined ? currentEdit.stock : ''} 
                      onChange={event => setCountedStock(current => ({ ...current, [item.id]: { ...(current[item.id] || {}), stock: event.target.value } }))} 
                      placeholder="ยอดที่นับได้" 
                      className="h-9 text-sm pr-10" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary pointer-events-none">
                      {item.unit}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={!isEditing || currentEdit.stock === undefined || currentEdit.stock === ''} 
                    onClick={() => saveCount(item.id)}
                    className="w-full mt-1"
                  >
                    <Check size={14} className="mr-1.5" />
                    บันทึก
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card key={item.id} className="flex flex-col sm:flex-row items-center gap-4 p-4 transition-all hover:shadow-md border border-border/50">
              <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-surface-alt border border-border/50 flex items-center justify-center">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <Archive size={24} className="text-text-secondary/30" />
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
                  {item.remark && (
                    <span className="truncate max-w-[200px] border-l border-border pl-3">{item.remark}</span>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:pl-4 sm:border-l border-border w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addToCart(item)}
                  className="shrink-0 border-primary/50 text-primary hover:bg-primary hover:text-white"
                >
                  <PackagePlus size={14} className="mr-1.5" />
                  <span className="hidden sm:inline">เพิ่มลงตะกร้า</span>
                </Button>
                <div className="flex flex-col min-w-[80px]">
                  <span className="text-xs text-text-secondary mb-1">คงเหลือ</span>
                  <div className={`rounded px-2 py-0.5 text-xs font-bold inline-block w-fit ${stockColor}`}>
                    {stock.toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-32">
                    <Input 
                      type="number" 
                      min="0" 
                      value={isEditing && currentEdit.stock !== undefined ? currentEdit.stock : ''} 
                      onChange={event => setCountedStock(current => ({ ...current, [item.id]: { ...(current[item.id] || {}), stock: event.target.value } }))} 
                      placeholder="ยอดนับ" 
                      className="h-9 text-sm pr-10" 
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary pointer-events-none">
                      {item.unit}
                    </span>
                  </div>
                  <Button 
                    size="sm" 
                    disabled={!isEditing || currentEdit.stock === undefined || currentEdit.stock === ''} 
                    onClick={() => saveCount(item.id)}
                    className="shrink-0"
                  >
                    <Check size={14} className="mr-1 sm:mr-0" />
                    <span className="sm:hidden">บันทึก</span>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {visibleItems.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-border rounded-2xl bg-surface-alt/30">
            <Archive size={48} className="mx-auto mb-4 text-text-secondary/30" />
            <p className="text-lg font-bold text-text-primary">ไม่พบสินค้า</p>
            <p className="text-sm text-text-secondary mt-1">ลองเปลี่ยนคำค้นหา หรือหมวดหมู่ที่เลือก</p>
          </div>
        )}
      </div>

      {/* Floating Cart Button */}
      {restockCart.length > 0 && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-primary px-6 py-4 text-white shadow-xl shadow-primary/30 transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95"
        >
          <div className="relative">
            <ShoppingCart size={24} />
            <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold shadow-sm">
              {restockCart.length}
            </span>
          </div>
          <span className="font-bold">ตรวจสอบตะกร้าสั่งเติมคลัง</span>
        </button>
      )}


      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                ตะกร้าสั่งเติมสต็อกคลัง
                <Badge variant="primary" className="ml-2">{restockCart.length} รายการ</Badge>
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface-alt transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-surface-alt/30 space-y-4">
              {restockCart.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>ตะกร้าว่างเปล่า</p>
                </div>
              ) : (
                restockCart.map(cartItem => {
                  const itemInfo = items.find(i => i.id === cartItem.itemId);
                  if (!itemInfo) return null;
                  
                  return (
                    <div key={cartItem.itemId} className="flex flex-col sm:flex-row gap-4 p-4 bg-surface border border-border rounded-2xl shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 border border-border rounded-md flex items-center justify-center shrink-0 p-1">
                        {itemInfo.imageUrl ? (
                          <img src={itemInfo.imageUrl} alt={itemInfo.name} className="w-full h-full object-contain mix-blend-multiply" />
                        ) : (
                          <Package size={24} className="text-slate-300" />
                        )}
                      </div>
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-sm">{itemInfo.name}</h4>
                            <p className="text-xs text-text-secondary">{itemInfo.category}</p>
                          </div>
                          <button 
                            onClick={() => removeFromCart(cartItem.itemId)}
                            className="text-error/70 hover:text-error p-1 rounded hover:bg-error/10 transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        
                        <div className="flex items-center bg-surface border border-border rounded-md overflow-hidden w-fit">
                          <button 
                            onClick={() => updateCartItemQuantity(cartItem.itemId, cartItem.quantity - 1)}
                            className="px-2 py-1 text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input 
                            type="number" 
                            value={cartItem.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (!isNaN(val)) updateCartItemQuantity(cartItem.itemId, val);
                            }}
                            className="w-12 text-center text-sm focus:outline-none"
                          />
                          <button 
                            onClick={() => updateCartItemQuantity(cartItem.itemId, cartItem.quantity + 1)}
                            className="px-2 py-1 text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-surface shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsCartOpen(false)}>
                เลือกเพิ่มต่อ
              </Button>
              <Button 
                variant="primary" 
                onClick={handleConfirmRestock} 
                disabled={restockCart.length === 0 || isSubmitting}
                isLoading={isSubmitting}
              >
                ยืนยันการสั่งเติมคลัง
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};
