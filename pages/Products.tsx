
import React, { useState, useMemo } from 'react';
import { db } from '../services/mockDb.ts';
import { Product, UserRole, State } from '../types.ts';

const Products: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
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

  const [restockModal, setRestockModal] = useState<{ isOpen: boolean, productId: string | null, stateId: string | null }>({
    isOpen: false,
    productId: null,
    stateId: null
  });

  const isAdmin = userRole === UserRole.ADMIN;

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

  const handleTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const stateId = formData.get('stateId') as string;
    const qty = Number(formData.get('quantity'));
    
    if (transferModal.productId && stateId && qty > 0) {
      const success = db.transferStock(transferModal.productId, stateId, qty);
      if (success) {
        setProducts([...db.getProducts()]);
        setTransferModal({ isOpen: false, productId: null });
      } else {
        alert("Insufficient central stock!");
      }
    }
  };

  const handleRestockHub = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const qty = Number(formData.get('quantity'));
    
    if (restockModal.productId && restockModal.stateId && qty > 0) {
      db.restockStateHub(restockModal.productId, restockModal.stateId, qty);
      setProducts([...db.getProducts()]);
      setRestockModal({ isOpen: false, productId: null, stateId: null });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Management</h1>
          <p className="text-slate-500 text-sm">Monitor warehouse stock levels and state-hub distributions.</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button 
              onClick={() => { setEditingProduct({}); setShowModal(true); }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <span className="text-lg">+</span> Register New Product
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input 
            type="text" 
            placeholder="Search items by name..." 
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex p-1 bg-slate-100 rounded-xl gap-1">
          <button 
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            All Stock
          </button>
          <button 
            onClick={() => setFilter('low-stock')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'low-stock' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Critical Alerts
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredProducts.map(product => {
          const isLowCentral = product.totalStock <= 10;
          return (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-5 flex flex-col md:flex-row gap-6">
                
                <div className="flex-1 flex gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl flex-shrink-0 ${isLowCentral ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-emerald-50 text-emerald-600'}`}>
                    {product.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                      {product.name}
                      {isLowCentral && <span title="Low Central Stock Warning" className="text-red-500">⚠️</span>}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded text-orange-600">Expires: {product.expiryDate}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-1.5 py-0.5 rounded">SKU: {product.sku || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-6 items-center">
                  <div className="text-center sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Central Warehouse</p>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <button 
                          onClick={() => handleQuickAddStock(product.id, -10)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center transition"
                        >
                          -
                        </button>
                      )}
                      <span className={`text-2xl font-black ${isLowCentral ? 'text-red-500' : 'text-slate-800'}`}>
                        {product.totalStock}
                      </span>
                      {isAdmin && (
                        <button 
                          onClick={() => handleQuickAddStock(product.id, 10)}
                          className="w-8 h-8 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 flex items-center justify-center transition"
                        >
                          +
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setTransferModal({ isOpen: true, productId: product.id })}
                      className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-slate-200 hover:bg-slate-900 transition"
                    >
                      Dispatch Stock
                    </button>
                    {isAdmin && (
                      <button 
                        onClick={() => { setEditingProduct(product); setShowModal(true); }}
                        className="bg-slate-50 text-slate-500 p-2.5 rounded-xl hover:bg-slate-100 transition"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-slate-50/50 border-t border-slate-100 p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Regional Hub Inventory</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
                  {states.map(s => {
                    const qty = product.stockPerState[s.id] || 0;
                    const isHubLow = qty <= 10;
                    return (
                      <div key={s.id} className={`bg-white p-3 rounded-xl border flex flex-col justify-between shadow-sm relative group ${isHubLow ? 'border-red-200 bg-red-50/20' : 'border-slate-100'}`}>
                        <div className="flex items-start justify-between">
                          <span className="text-xs font-bold text-slate-500 truncate mr-2">{s.name}</span>
                          {isHubLow && <span title="Warning: Critical Hub Stock" className="text-xs">⚠️</span>}
                        </div>
                        <div className="flex items-end justify-between mt-2">
                          <span className={`text-xl font-black ${isHubLow ? 'text-red-600' : 'text-slate-800'}`}>{qty}</span>
                          {isAdmin && (
                            <button 
                              onClick={() => setRestockModal({ isOpen: true, productId: product.id, stateId: s.id })}
                              className="text-[10px] font-bold text-emerald-600 hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              Restock Hub
                            </button>
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
          <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No inventory records found.</p>
          </div>
        )}
      </div>

      {transferModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Inventory Dispatch</h2>
            <p className="text-slate-500 text-sm mb-6">Transfer units from Central Warehouse to Regional Hubs.</p>
            
            <form onSubmit={handleTransfer} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Target Destination Hub</label>
                <select name="stateId" required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all appearance-none">
                  <option value="">Select State Hub</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Units to Transfer</label>
                <input name="quantity" required type="number" min="1" className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="Enter quantity" />
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all">
                  Confirm Dispatch
                </button>
                <button type="button" onClick={() => setTransferModal({ isOpen: false, productId: null })} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {restockModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-2 text-emerald-600 mb-2">
              <span className="text-lg">📦</span>
              <h2 className="text-2xl font-black text-slate-800">Regional Restock</h2>
            </div>
            <p className="text-slate-500 text-sm mb-6">
              Update physical stock levels at the <strong>{states.find(s => s.id === restockModal.stateId)?.name}</strong> Hub.
            </p>
            
            <form onSubmit={handleRestockHub} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Restock Quantity</label>
                <input name="quantity" required type="number" min="1" autoFocus className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all" placeholder="e.g. 50" />
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all">
                  Update Inventory
                </button>
                <button type="button" onClick={() => setRestockModal({ isOpen: false, productId: null, stateId: null })} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-800">{editingProduct?.id ? 'Edit Inventory Item' : 'New Product Registration'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 bg-white w-8 h-8 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-8 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Item Name</label>
                  <input 
                    required 
                    placeholder="e.g. Ginger Energy Shot"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={editingProduct?.name || ''}
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">SKU Code</label>
                  <input 
                    placeholder="Optional SKU"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={editingProduct?.sku || ''}
                    onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Batch Reference</label>
                  <input 
                    placeholder="Optional Batch ID"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={editingProduct?.batchNumber || ''}
                    onChange={e => setEditingProduct({...editingProduct, batchNumber: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Unit Cost (₦)</label>
                  <input 
                    required type="number"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={editingProduct?.costPrice || ''}
                    onChange={e => setEditingProduct({...editingProduct, costPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Selling Price (₦)</label>
                  <input 
                    required type="number"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={editingProduct?.sellingPrice || ''}
                    onChange={e => setEditingProduct({...editingProduct, sellingPrice: Number(e.target.value)})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Expiry Date</label>
                  <input 
                    required type="date"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                    value={editingProduct?.expiryDate || ''}
                    onChange={e => setEditingProduct({...editingProduct, expiryDate: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-500 font-bold hover:text-slate-800 transition">Cancel</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all">
                  Commit Inventory
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