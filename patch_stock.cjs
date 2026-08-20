const fs = require('fs');
let content = fs.readFileSync('src/pages/AdminStock.tsx', 'utf8');

// 1. Add imports
content = content.replace(
  "import { Archive, Check, Search, ArrowDownWideNarrow } from 'lucide-react';",
  "import { Archive, Check, Search, ArrowDownWideNarrow, ShoppingCart, Plus, Minus, X, PackagePlus, Package } from 'lucide-react';"
);

content = content.replace(
  "import { Badge } from '../components/ui/Badge';\n",
  ""
); // wait, Badge might not be imported yet. Let's add it.

content = content.replace(
  "import { Button } from '../components/ui/Button';",
  "import { Button } from '../components/ui/Button';\nimport { Badge } from '../components/ui/Badge';"
);

// 2. Add useData properties
content = content.replace(
  "const { items, categories: dynamicCategories, updateItem } = useData();",
  "const { items, categories: dynamicCategories, updateItem, addRequests } = useData();"
);

// 3. Add states
content = content.replace(
  "const [sortOrder, setSortOrder] = useState<'default' | 'desc' | 'asc'>('default');",
  `const [sortOrder, setSortOrder] = useState<'default' | 'desc' | 'asc'>('default');
  const [restockCart, setRestockCart] = useState<{itemId: string, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);`
);

// 4. Add cart functions
const cartFunctions = `
  const addToCart = (item: Item) => {
    setRestockCart(prev => {
      const existing = prev.find(c => c.itemId === item.id);
      if (existing) {
        return prev.map(c => c.itemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { itemId: item.id, quantity: 1 }];
    });
    toast.success(\`เพิ่ม "\${item.name}" ลงตะกร้าสั่งเติมสต็อกแล้ว\`);
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
`;

content = content.replace(
  "const totalStock = items.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);",
  "const totalStock = items.reduce((sum, item) => sum + Number(item.currentStock || 0), 0);\n" + cartFunctions
);

// 5. Add "Add to Cart" button to Gallery view card
content = content.replace(
  "</div>\n                \n                <div className=\"mt-4 pt-4 border-t border-border flex flex-col gap-2\">",
  `</div>
                
                <div className="mt-4 pt-4 border-t border-border flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => addToCart(item)}
                    className="w-full mb-2 border-primary/50 text-primary hover:bg-primary hover:text-white"
                  >
                    <PackagePlus size={14} className="mr-1.5" />
                    ใส่ตะกร้าสั่งเติมสต็อก
                  </Button>`
);

// 6. Add "Add to Cart" button to List view card
content = content.replace(
  "<div className=\"flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:pl-4 sm:border-l border-border w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0\">",
  `<div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:pl-4 sm:border-l border-border w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => addToCart(item)}
                  className="shrink-0 border-primary/50 text-primary hover:bg-primary hover:text-white"
                >
                  <PackagePlus size={14} className="mr-1.5" />
                  <span className="hidden sm:inline">เพิ่มลงตะกร้า</span>
                </Button>`
);

// 7. Add Floating Cart Button
const floatingCart = `
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
`;

// 8. Add Cart Modal
const cartModal = `
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
`;

content = content.replace(
  "    </div>\n  );\n};",
  floatingCart + "\n" + cartModal + "\n    </div>\n  );\n};"
);

fs.writeFileSync('src/pages/AdminStock.tsx', content);
