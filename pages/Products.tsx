
import React, { useState, useMemo } from 'react';
import { db } from '../services/mockDb.ts';
import { Product, UserRole, State } from '../types.ts';

const Products: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [states] = useState<State[]>(db.getStates());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock'>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  const [transferModal, setTransferModal] = useState<{ isOpen: boolean, productId: string | null }>({
    isOpen: false,
    productId: null
  });

  const [hubActionModal, setHubActionModal] = useState<{ 
    isOpen: boolean, 
    productId: string | null, 
    stateId: string | null,
    action: 'add' | 'subtract' | 'clear' | null
  }>({
    isOpen: false,
    productId: null,
    stateId: null,
    action: null
  });

  // Access check
  const isInventoryManager = user?.role === UserRole.INVENTORY_MANAGER || user?.email === 'iconfidence909@gmail.com';
  const isAdminOrManager = userRole === UserRole.ADMIN || isInventoryManager;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const hasAnyLowHub = Object.values(p.stockPerState).some(qty => (qty as number) <= 10);
      const isLowCentral = p.totalStock <= 10;
      
      const matchesFilter = filter === 'all' || isLowCentral || hasAnyLowHub;
      return matchesSearch && matchesFilter;
    });
  }, [products, searchTerm, filter]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    
    const product: Product = {
      id: editingProduct.id || 'p' + Math.random().toString(36).substr(2, 9),
      name: editingProduct.name || '',
      sku: editingProduct.sku || '',
      costPrice: Number(editingProduct.costPrice) || 0,
      sellingPrice: Number(editingProduct.sellingPrice) || 0,
      batchNumber: editingProduct.batchNumber || '',
      expiryDate: editingProduct.expiryDate || '',
      totalStock: Number(editingProduct.totalStock) || 0,
      stockPerState: editingProduct.stockPerState || {},
      lowStockThreshold: 10,
    };

    db.saveProduct(product);
    setProducts([...db.getProducts()]);
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleQuickAddStock = (productId: string, amount: number) => {
    const p = products.find(prod => prod.id === productId);
    if (p) {
      const updated = { ...p, totalStock: Math.max(0, p.totalStock + amount) };
      db.saveProduct(updated);
      setProducts([...db.getProducts()]);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const stateId = formData.get('stateId') as string;
    const qty = Number(formData.get('quantity'));
    
    if (transferModal.productId && stateId && qty > 0) {
      const success = await db.transferStock(transferModal.productId, stateId, qty);
      if (success) {
        setProducts([...db.getProducts()]);
        setTransferModal({ isOpen: false, productId: null });
      } else {
        alert("Insufficient central stock!");
      }
    }
  };

  const handleHubAction = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const qtyInput = Number(formData.get('quantity'));
    
    if (hubActionModal.productId && hubActionModal.stateId && hubActionModal.action) {
      const p = products.find(prod => prod.id === hubActionModal.productId);
      if (!p) return;
      
      const currentQty = p.stockPerState[hubActionModal.stateId] || 0;
      let newQty = currentQty;

      if (hubActionModal.action === 'add') {
        newQty += qtyInput;
      } else if (hubActionModal.action === 'subtract') {
        newQty = Math.max(0, currentQty - qtyInput);
      } else if (hubActionModal.action === 'clear') {
        newQty = 0;
      }

      db.updateStateHubStock(hubActionModal.productId, hubActionModal.stateId, newQty);
      setProducts([...db.getProducts()]);
      setHubActionModal({ isOpen: false, productId: null, stateId: null, action: null });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Terminal</h1>
          <p className="text-slate-500 text-sm font-medium">Global stock distribution and hub-level inventory controls.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdminOrManager && (
            <button 
              onClick={() => { setEditingProduct({}); setShowModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all flex items-center gap-2 uppercase text-[10px] tracking-widest"
            >
              <span className="text-lg">＋</span> New Item Entry
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300">🔍</span>
          <input 
            type="text" 
            placeholder="Search SKUs or Product Names..." 
            className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex p-1.5 bg-slate-100 rounded-2xl gap-1">
          <button 
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
          >
            All Stock
          </button>
          <button 
            onClick={() => setFilter('low-stock')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'low-stock' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
          >
            Critical Low
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredProducts.map(product => {
          const isLowCentral = product.totalStock <= 10;
          return (
            <div key={product.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 overflow-hidden group/card">
              <div className="p-8 flex flex-col lg:flex-row gap-8">
                <div className="flex-1 flex gap-6">
                  <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center font-black text-3xl flex-shrink-0 transition-transform group-hover/card:scale-105 ${isLowCentral ? 'bg-red-50 text-red-600 shadow-inner' : 'bg-emerald-50 text-emerald-600 shadow-inner'}`}>
                    {product.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-black text-slate-800 text-xl tracking-tight flex items-center gap-2">
                      {product.name}
                      {isLowCentral && <span title="Warehouse Depleted" className="text-red-500 animate-pulse text-sm">⚠️ CRITICAL</span>}
                    </h3>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100">Expires: {product.expiryDate}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">SKU: {product.sku || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-10 items-center bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                  <div className="text-center sm:text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Central Warehouse</p>
                    <div className="flex items-center gap-4">
                      {isAdminOrManager && (
                        <button 
                          onClick={() => handleQuickAddStock(product.id, -10)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition shadow-sm font-black"
                        >
                          －
                        </button>
                      )}
                      <span className={`text-4xl font-black tracking-tighter ${isLowCentral ? 'text-red-500' : 'text-slate-800'}`}>
                        {product.totalStock}
                      </span>
                      {isAdminOrManager && (
                        <button 
                          onClick={() => handleQuickAddStock(product.id, 10)}
                          className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 hover:bg-emerald-600 hover:text-white flex items-center justify-center transition shadow-sm font-black"
                        >
                          ＋
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTransferModal({ isOpen: true, productId: product.id })}
                      className="bg-slate-900 text-white px-8 py-4 rounded-[1.25rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition active:scale-95"
                    >
                      Dispatch Hubs
                    </button>
                    {isAdminOrManager && (
                      <button 
                        onClick={() => { setEditingProduct(product); setShowModal(true); }}
                        className="bg-white text-slate-400 p-4 rounded-xl border border-slate-200 hover:text-emerald-600 transition shadow-sm"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-100/30 border-t border-slate-100 p-8">
                <div className="flex items-center justify-between mb-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Regional Physical Inventory</p>
                  <p className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest italic">Live from Hub Repositories</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {states.map(s => {
                    const qty = product.stockPerState[s.id] || 0;
                    const isHubLow = qty <= 10;
                    return (
                      <div key={s.id} className={`bg-white p-5 rounded-[1.5rem] border shadow-sm relative group transition-all duration-300 ${isHubLow ? 'border-red-100 bg-red-50/10' : 'border-slate-100 hover:border-emerald-200'}`}>
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate mr-2">{s.name}</span>
                          {isHubLow && <span title="Critical Regional Stock" className="text-red-500 animate-pulse">⚠️</span>}
                        </div>
                        <div className="flex items-end justify-between">
                          <span className={`text-3xl font-black tracking-tighter ${isHubLow ? 'text-red-600' : 'text-slate-800'}`}>{qty}</span>
                          
                          {isAdminOrManager && (
                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                              <button 
                                onClick={() => setHubActionModal({ isOpen: true, productId: product.id, stateId: s.id, action: 'add' })}
                                className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-black shadow-sm hover:bg-emerald-600 hover:text-white transition"
                                title="Add Hub Stock"
                              >
                                ＋
                              </button>
                              <button 
                                onClick={() => setHubActionModal({ isOpen: true, productId: product.id, stateId: s.id, action: 'subtract' })}
                                className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-black shadow-sm hover:bg-amber-600 hover:text-white transition"
                                title="Subtract Hub Stock"
                              >
                                －
                              </button>
                              <button 
                                onClick={() => { if(confirm(`Confirm: Reset stock to 0 for ${s.name}?`)) db.updateStateHubStock(product.id, s.id, 0); setProducts([...db.getProducts()]); }}
                                className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xs font-black shadow-sm hover:bg-red-600 hover:text-white transition"
                                title="Clear Hub Stock"
                              >
                                ✕
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
            <div className="text-6xl mb-6 opacity-20">📦</div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No matching inventory records found.</p>
          </div>
        )}
      </div>

      {transferModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-12 animate-in fade-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Regional Dispatch</h2>
            <p className="text-slate-500 text-sm mb-10 font-medium">Provision stock from the central warehouse to a state hub.</p>
            
            <form onSubmit={handleTransfer} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Destination Hub</label>
                <select name="stateId" required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 font-bold appearance-none">
                  <option value="">Choose State Hub...</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Transfer Volume</label>
                <input name="quantity" required type="number" min="1" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 font-black text-xl" placeholder="0" />
              </div>
              <div className="flex flex-col gap-3 pt-6">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95">
                  Confirm Dispatch
                </button>
                <button type="button" onClick={() => setTransferModal({ isOpen: false, productId: null })} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                  Cancel Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {hubActionModal.isOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[90]">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-12 animate-in fade-in zoom-in duration-300">
            <div className="flex items-center gap-3 text-emerald-600 mb-4">
              <span className="text-2xl">📦</span>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                {hubActionModal.action === 'add' ? 'Increase Hub Stock' : hubActionModal.action === 'subtract' ? 'Decrease Hub Stock' : 'Clear Hub Stock'}
              </h2>
            </div>
            <p className="text-slate-500 text-sm mb-10 font-medium">
              Updating physical inventory levels at the <strong className="text-slate-900">{states.find(s => s.id === hubActionModal.stateId)?.name}</strong> regional repository.
            </p>
            
            <form onSubmit={handleHubAction} className="space-y-6">
              {hubActionModal.action !== 'clear' && (
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quantity (Units)</label>
                  <input name="quantity" required type="number" min="1" autoFocus className="w-full bg-slate-50 border-none rounded-2xl px-6 py-5 focus:ring-2 focus:ring-emerald-500 font-black text-2xl text-center" placeholder="0" />
                </div>
              )}
              {hubActionModal.action === 'clear' && (
                <div className="bg-red-50 p-6 rounded-2xl text-red-700 text-xs font-black flex items-center gap-4 border border-red-100">
                   <span className="text-2xl">⚠️</span>
                   <p className="leading-relaxed">This action will reset the regional hub stock to zero units immediately. Please confirm verification.</p>
                </div>
              )}
              <div className="flex flex-col gap-3 pt-6">
                <button type="submit" className={`w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl transition-all text-sm text-white active:scale-95 ${hubActionModal.action === 'add' ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' : hubActionModal.action === 'subtract' ? 'bg-amber-600 shadow-amber-100 hover:bg-amber-700' : 'bg-red-600 shadow-red-100 hover:bg-red-700'}`}>
                  {hubActionModal.action === 'add' ? 'Add to Registry' : hubActionModal.action === 'subtract' ? 'Subtract from Registry' : 'Wipe Registry Data'}
                </button>
                <button type="button" onClick={() => setHubActionModal({ isOpen: false, productId: null, stateId: null, action: null })} className="w-full py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                  Cancel Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[80]">
          <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct?.id ? 'Modify Catalog Entry' : 'New Product Registration'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-10 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Official Item Name</label>
                  <input 
                    required 
                    placeholder="e.g. Ginger Shot (500ml)"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold"
                    value={editingProduct?.name || ''}
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">SKU Identification</label>
                  <input 
                    placeholder="SKU-XXX"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-mono text-xs font-bold"
                    value={editingProduct?.sku || ''}
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Batch Number</label>
                  <input 
                    placeholder="BATCH-001"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-mono text-xs font-bold"
                    value={editingProduct?.batchNumber || ''}
                    onChange={e => setEditingProduct({...editingProduct, batchNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Unit Cost (₦)</label>
                  <input 
                    required type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-black"
                    value={editingProduct?.costPrice || ''}
                    onChange={e => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">MSRP / Selling (₦)</label>
                  <input 
                    required type="number"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-black"
                    value={editingProduct?.sellingPrice || ''}
                    onChange={e => setEditingProduct({...editingProduct, sellingPrice: Number(e.target.value)})}
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Quality Expiry Threshold</label>
                  <input 
                    required type="date"
                    className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold"
                    value={editingProduct?.expiryDate || ''}
                    onChange={e => setEditingProduct({...editingProduct, expiryDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Discard</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all active:scale-95">
                  Save Catalog Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
