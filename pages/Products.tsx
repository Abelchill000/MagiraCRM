
import React, { useState, useMemo } from 'react';
import { db } from '../services/mockDb.ts';
import { Product, UserRole } from '../types.ts';

const Products: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [products, setProducts] = useState<Product[]>(db.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'low-stock'>('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);

  // Access check
  const isInventoryManager = user?.role === UserRole.INVENTORY_MANAGER || user?.email === 'iconfidence909@gmail.com';
  const isAdminOrManager = userRole === UserRole.ADMIN || isInventoryManager;

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      
      const isLowCentral = p.totalStock <= 10;
      
      const matchesFilter = filter === 'all' || isLowCentral;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Inventory Terminal</h1>
          <p className="text-slate-500 text-sm font-medium">Global stock distribution and inventory controls.</p>
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
