import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { useData } from '../store/DataContext';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Package, Search, ShoppingCart, Plus, Minus, X, Heart, AlertCircle, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type CartItem = {
  itemId: string;
  quantity: number;
  reason: string;
};

export const NewRequest = () => {
  const { user } = useAuth();
  const { items, addRequests } = useData();
  const navigate = useNavigate();
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!user) return [];
    try {
      const stored = localStorage.getItem(`cart_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [successAlert, setSuccessAlert] = useState<{show: boolean, collectedItems: {name: string, quantity: number}[], pendingItems: {name: string, quantity: number}[]} | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`cart_${user.id}`, JSON.stringify(cart));
    }
  }, [cart, user]);

  // Favorites logic
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (!user) return [];
    try {
      const stored = localStorage.getItem(`favorites_${user.id}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(`favorites_${user.id}`, JSON.stringify(favorites));
    }
  }, [favorites, user]);

  const [animatingFavId, setAnimatingFavId] = useState<string | null>(null);

  const toggleFavorite = (itemId: string) => {
    setFavorites(prev => {
      const isCurrentlyFav = prev.includes(itemId);
      if (!isCurrentlyFav) {
        setAnimatingFavId(itemId);
        setTimeout(() => setAnimatingFavId(null), 600);
        return [...prev, itemId];
      }
      return prev.filter(id => id !== itemId);
    });
  };

  const categories = ['all', 'favorites', ...Array.from(new Set(items.map(i => i.category)))];
  
  const filteredItems = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' 
      ? true 
      : category === 'favorites' 
        ? favorites.includes(i.id) 
        : i.category === category;
    return matchSearch && matchCat;
  });

  const handleQuantityChange = (itemId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const handleAddToCart = (itemId: string) => {
    const quantity = quantities[itemId] || 1;
    setCart(prev => {
      const existing = prev.find(c => c.itemId === itemId);
      if (existing) {
        return prev.map(c => c.itemId === itemId ? { ...c, quantity: c.quantity + quantity } : c);
      }
      return [...prev, { itemId, quantity, reason: '' }];
    });
    // Reset quantity input
    setQuantities(prev => ({ ...prev, [itemId]: 1 }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.itemId !== itemId));
  };

  const updateCartItemReason = (itemId: string, reason: string) => {
    setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, reason } : c));
  };

  const updateCartItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setCart(prev => prev.map(c => c.itemId === itemId ? { ...c, quantity } : c));
  };

  const handleSubmit = async () => {
    if (cart.length === 0 || !user) return;
    
    setIsSubmitting(true);
    let collectedItems: {name: string, quantity: number}[] = [];
    let pendingItems: {name: string, quantity: number}[] = [];

    const requests = cart.map(c => {
      const itemInfo = items.find(i => i.id === c.itemId);
      const stock = Number(itemInfo?.currentStock || 0);
      const itemName = itemInfo?.name || 'ไม่ทราบชื่อ';
      if (stock >= c.quantity) {
        collectedItems.push({ name: itemName, quantity: c.quantity });
      } else {
        pendingItems.push({ name: itemName, quantity: c.quantity });
      }

      return {
        userId: user.id,
        employeeId: user.employeeId,
        name: user.name,
        itemId: c.itemId,
        itemName: itemInfo?.name || '',
        quantity: c.quantity,
        reason: c.reason,
      };
    });
    
    try {
      await addRequests(requests);
      setCart([]);
      setIsCartOpen(false);
      setIsConfirming(false);
  
      if (collectedItems.length > 0) {
        setSuccessAlert({ show: true, collectedItems, pendingItems });
      } else {
        toast.success('ส่งคำขอเบิกอุปกรณ์เรียบร้อยแล้ว');
        navigate('/requests/my');
      }
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการส่งคำขอ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-7">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Equipment catalog</p>
          <h1 className="text-3xl font-bold text-text-primary mb-2">เบิกอุปกรณ์ใหม่</h1>
          <p className="text-text-secondary">เลือกอุปกรณ์ที่ต้องการ แล้วตรวจสอบรายการในตะกร้าก่อนส่งคำขอ</p>
        </div>
        
        {/* Old cart button removed */}
      </div>

      <div className="bg-surface rounded-2xl border border-border p-4 flex flex-col sm:flex-row gap-4 items-center shadow-sm shadow-slate-900/[0.02]">
        <div className="relative flex-1 w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <Input 
            placeholder="ค้นหาอุปกรณ์..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors flex items-center gap-2",
                category === cat 
                  ? "bg-primary/10 text-primary border border-primary/20" 
                  : "bg-surface-alt text-text-secondary border border-transparent hover:bg-border/50"
              )}
            >
              {cat === 'favorites' && <Heart size={14} className={category === 'favorites' ? 'fill-primary text-primary' : 'text-text-secondary'} />}
              {cat === 'all' ? 'ทั้งหมด' : cat === 'favorites' ? 'รายการโปรด' : cat}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
        {filteredItems.map(item => {
          const qty = quantities[item.id] || 1;
          const isFav = favorites.includes(item.id);
          return (
            <Card key={item.id} className="group relative flex flex-col h-full overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(item.id); }}
                className={cn(
                  "absolute top-3 right-3 z-10 p-2 rounded-full transition-all duration-200",
                  isFav ? "bg-red-50 text-red-500 shadow-sm" : "bg-white/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-white hover:text-red-500 shadow-sm"
                )}
              >
                <Heart size={18} className={cn("transition-colors relative z-10", isFav && "fill-red-500 text-red-500", animatingFavId === item.id && "animate-heart-burst")} />
                {animatingFavId === item.id && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="heart-particle" style={{ '--tx': '24px', '--ty': '-24px' } as React.CSSProperties} />
                    <div className="heart-particle" style={{ '--tx': '-24px', '--ty': '-24px' } as React.CSSProperties} />
                    <div className="heart-particle" style={{ '--tx': '30px', '--ty': '0px' } as React.CSSProperties} />
                    <div className="heart-particle" style={{ '--tx': '-30px', '--ty': '0px' } as React.CSSProperties} />
                    <div className="heart-particle" style={{ '--tx': '24px', '--ty': '24px' } as React.CSSProperties} />
                    <div className="heart-particle" style={{ '--tx': '-24px', '--ty': '24px' } as React.CSSProperties} />
                  </div>
                )}
              </button>
              <div className="relative w-full pt-[70%] bg-surface-alt/60">
                <div className="absolute inset-0 flex items-center justify-center p-5">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
                  ) : (
                    <Package size={48} className="text-slate-200" />
                  )}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col border-t border-border bg-surface">
                <h4 className="font-semibold text-text-primary text-sm line-clamp-2 mb-2" title={item.name}>{item.name}</h4>
                
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-text-secondary">{item.category}</span>
                  <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium border", Number(item.currentStock) > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200")}>
                    คงเหลือ: {item.currentStock || 0}
                  </span>
                </div>
                {item.remark && (
                  <div className="text-xs text-text-secondary bg-surface-alt/80 px-2 py-1 rounded-md inline-block border border-border/50 line-clamp-1 self-start">
                    {item.remark}
                  </div>
                )}
                
                <div className="mt-auto pt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-text-secondary">จำนวน ({item.unit})</span>
                    <div className="flex items-center bg-surface border border-border rounded-xl overflow-hidden">
                      <button 
                        onClick={() => handleQuantityChange(item.id, -1)}
                        className="px-2 py-1 text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <input 
                        type="number" 
                        value={qty}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val) && val >= 1) {
                            setQuantities(prev => ({ ...prev, [item.id]: val }));
                          }
                        }}
                        className="w-10 text-center text-sm focus:outline-none bg-transparent"
                      />
                      <button 
                        onClick={() => handleQuantityChange(item.id, 1)}
                        className="px-2 py-1 text-text-secondary hover:bg-surface-alt hover:text-text-primary transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <Button 
                    variant="secondary" 
                    className="w-full text-xs h-9"
                    onClick={() => handleAddToCart(item.id)}
                  >
                    เพิ่มลงตะกร้า
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        {filteredItems.length === 0 && (
          <div className="col-span-full py-12 text-center text-text-secondary bg-surface rounded-2xl border border-border">
            ไม่พบรายการอุปกรณ์
          </div>
        )}
      </div>

      {/* Cart Modal Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="cart-title">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0">
              <h2 id="cart-title" className="text-lg font-bold flex items-center gap-2">
                <ShoppingCart size={20} />
                ตะกร้าเบิกอุปกรณ์
                <Badge variant="primary" className="ml-2">{cart.length} รายการ</Badge>
              </h2>
              <button 
                onClick={() => setIsCartOpen(false)}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface-alt transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 bg-surface-alt/30 space-y-4">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-text-secondary">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-20" />
                  <p>ตะกร้าว่างเปล่า</p>
                  <p className="text-xs mt-2">กรุณาเลือกอุปกรณ์ที่ต้องการเบิกจากหน้าแคตตาล็อก</p>
                </div>
              ) : (
                cart.map(cartItem => {
                  const itemInfo = items.find(i => i.id === cartItem.itemId);
                  if (!itemInfo) return null;
                  
                  return (
                    <div key={cartItem.itemId} className="flex flex-col sm:flex-row gap-4 p-4 bg-surface border border-border rounded-2xl shadow-sm">
                      <div className="w-16 h-16 bg-slate-50 border border-border rounded-md flex items-center justify-center shrink-0 p-1">
                        {itemInfo.imageUrl ? (
                          <img src={itemInfo.imageUrl} alt={itemInfo.name} className="w-full h-full object-contain mix-blend-multiply" referrerPolicy="no-referrer" />
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
                        
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                          <div className="flex items-center bg-surface border border-border rounded-md overflow-hidden">
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
                          
                          <div className="flex-1 w-full sm:max-w-[250px]">
                            <Input 
                              placeholder="เหตุผลการเบิก (ทางเลือก)..." 
                              value={cartItem.reason}
                              onChange={(e) => updateCartItemReason(cartItem.itemId, e.target.value)}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            
            <div className="p-4 border-t border-border bg-surface shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsCartOpen(false)}>
                เลือกซื้อต่อ
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setIsConfirming(true)} 
                disabled={cart.length === 0}
              >
                ตรวจสอบและยืนยัน
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirming && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 bg-slate-900/50 backdrop-blur-sm" role="dialog" aria-modal="true">
          <Card className="w-full max-w-lg flex flex-col shadow-2xl shadow-slate-900/20">
            <div className="flex items-center justify-between p-4 border-b border-border bg-surface shrink-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <AlertCircle size={20} className="text-primary" />
                ยืนยันรายละเอียดการเบิก
              </h2>
              <button 
                onClick={() => setIsConfirming(false)}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary p-1 rounded-md hover:bg-surface-alt transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh] flex-1 bg-surface-alt/30 space-y-4">
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl flex gap-3 items-start border border-blue-100 mb-4">
                <Info size={20} className="mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold">โปรดตรวจสอบรายละเอียดการรับพัสดุ</p>
                  <p className="mt-1 opacity-90">ระบบได้ตรวจสอบสต็อกปัจจุบัน และแบ่งรายการออกเป็นส่วนที่สามารถรับได้ทันที กับส่วนที่ต้องรอจัดสรรจากส่วนกลาง</p>
                </div>
              </div>

              <div className="space-y-3">
                {cart.map(cartItem => {
                  const itemInfo = items.find(i => i.id === cartItem.itemId);
                  if (!itemInfo) return null;
                  
                  const stock = Number(itemInfo.currentStock) || 0;
                  const qty = cartItem.quantity;
                  
                  let stockMsg = '';
                  let badgeType = '';
                  if (stock >= qty) {
                    stockMsg = `รับพัสดุได้ทันทีจากตู้สต็อก (${qty} ${itemInfo.unit})`;
                    badgeType = 'bg-green-100 text-green-800 border-green-200';
                  } else if (stock > 0) {
                    stockMsg = `รับทันที ${stock} ${itemInfo.unit} / รอจัดสรร ${qty - stock} ${itemInfo.unit}`;
                    badgeType = 'bg-amber-100 text-amber-800 border-amber-200';
                  } else {
                    stockMsg = `รอจัดสรรจากส่วนกลางทั้งหมด (${qty} ${itemInfo.unit})`;
                    badgeType = 'bg-slate-100 text-slate-800 border-slate-200';
                  }

                  return (
                    <div key={cartItem.itemId} className="flex flex-col gap-2 p-3 bg-surface border border-border rounded-xl">
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm">{itemInfo.name}</span>
                        <span className="font-bold text-sm text-primary">รวม {qty} {itemInfo.unit}</span>
                      </div>
                      <div className={cn("text-xs px-2 py-1.5 rounded-md border inline-flex items-center", badgeType)}>
                        {stockMsg}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="p-4 border-t border-border bg-surface shrink-0 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsConfirming(false)} disabled={isSubmitting}>
                ยกเลิก
              </Button>
              <Button 
                variant="primary" 
                onClick={handleSubmit} 
                isLoading={isSubmitting}
              >
                ยืนยันการเบิกพัสดุ
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Success Modal for Auto-Collected Items */}
      {successAlert?.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <Card className="w-full max-w-sm flex flex-col items-center text-center p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <Package size={32} />
            </div>
            <h3 className="text-xl font-bold text-text-primary mb-2">เบิกอุปกรณ์สำเร็จ!</h3>
              <p className="text-sm text-text-secondary mb-6">
                <strong>บันทึกรายการสำเร็จ</strong>
                <br /><br />
                {successAlert.collectedItems.map((item, idx) => (
                  <span key={idx} className="block mt-1 text-green-600">
                    - สินค้า {item.name} พร้อมสำหรับการเบิกจ่ายจากสต๊อกหน่วยงาน
                  </span>
                ))}
                {successAlert.pendingItems.map((item, idx) => (
                  <span key={idx} className="block mt-1 text-error">
                    - สินค้า {item.name} อยู่ระหว่างดำเนินการเบิกจากจัดซื้อ และจะสามารถเบิกจ่ายได้เมื่อสินค้าเข้าระบบเรียบร้อยแล้ว
                  </span>
                ))}
              </p>
            <Button 
              variant="primary" 
              className="w-full"
              onClick={() => {
                setSuccessAlert(null);
                navigate('/requests/my');
              }}
            >
              ดูประวัติการเบิก
            </Button>
          </Card>
        </div>
      )}

      {/* Floating Cart Button */}
      <button
        onClick={() => setIsCartOpen(true)}
        className={cn(
          "fixed bottom-8 right-8 z-40 flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95",
          cart.length > 0 ? "bg-primary text-white shadow-primary/30" : "bg-surface-alt text-text-secondary border border-border"
        )}
        aria-label="ตะกร้าเบิกอุปกรณ์"
      >
        <ShoppingCart size={28} />
        {totalCartItems > 0 && (
          <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-error text-xs font-bold text-white shadow-sm border-2 border-surface">
            {totalCartItems > 99 ? '99+' : totalCartItems}
          </span>
        )}
      </button>
    </div>
  );
};
