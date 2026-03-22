import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { RestockRecord, WaybillRecord, AdsBudget, Product, UserRole } from '../types';
import { Plus, Trash2, Package, Truck, Target, Calendar, Search, Filter, Download } from 'lucide-react';

const AdminRecords: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'restock' | 'waybills' | 'ads'>('restock');
  const [restocks, setRestocks] = useState<RestockRecord[]>([]);
  const [waybills, setWaybills] = useState<WaybillRecord[]>([]);
  const [budgets, setBudgets] = useState<AdsBudget[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form states
  const [restockForm, setRestockForm] = useState({
    productId: '',
    quantity: 0,
    costPrice: 0,
    supplier: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [waybillForm, setWaybillForm] = useState({
    trackingNumber: '',
    courierName: '',
    destination: '',
    status: 'pending' as any,
    cost: 0,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [adsForm, setAdsForm] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const user = db.getCurrentUser();
  const isGlobalAdmin = user?.role === UserRole.ADMIN && user?.email === 'admin@magiracrm.store';

  useEffect(() => {
    if (!isGlobalAdmin) return;
    const unsub = db.subscribe(() => {
      setRestocks(db.getRestocks());
      setWaybills(db.getWaybills());
      setBudgets(db.getBudgets());
      setProducts(db.getProducts());
    });
    return unsub;
  }, []);

  const handleAddRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockForm.productId || restockForm.quantity <= 0) return;
    
    const product = products.find(p => p.id === restockForm.productId);
    const newRecord: RestockRecord = {
      id: Math.random().toString(36).substr(2, 9),
      productId: restockForm.productId,
      productName: product?.name || 'Unknown',
      quantity: Number(restockForm.quantity),
      costPrice: Number(restockForm.costPrice),
      totalCost: Number(restockForm.quantity) * Number(restockForm.costPrice),
      supplier: restockForm.supplier,
      date: restockForm.date,
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Admin'
    };

    await db.saveRestock(newRecord);
    setShowModal(false);
    setRestockForm({ productId: '', quantity: 0, costPrice: 0, supplier: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddWaybill = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: WaybillRecord = {
      id: Math.random().toString(36).substr(2, 9),
      ...waybillForm,
      cost: Number(waybillForm.cost),
      createdAt: new Date().toISOString(),
      createdBy: user?.name || 'Admin'
    };

    await db.saveWaybill(newRecord);
    setShowModal(false);
    setWaybillForm({ trackingNumber: '', courierName: '', destination: '', status: 'pending', cost: 0, date: new Date().toISOString().split('T')[0], notes: '' });
  };

  const handleAddAds = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: AdsBudget = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.id || '',
      userName: user?.name || 'Admin',
      amount: Number(adsForm.amount),
      date: adsForm.date,
      createdAt: new Date().toISOString()
    };

    await db.saveBudget(newRecord);
    setShowModal(false);
    setAdsForm({ amount: 0, date: new Date().toISOString().split('T')[0] });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this record?")) return;
    if (activeTab === 'restock') await db.deleteRestock(id);
    if (activeTab === 'waybills') await db.deleteWaybill(id);
    if (activeTab === 'ads') await db.deleteBudget(id);
  };

  const filteredData = () => {
    if (activeTab === 'restock') {
      return restocks.filter(r => r.productName.toLowerCase().includes(searchTerm.toLowerCase()) || r.supplier?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (activeTab === 'waybills') {
      return waybills.filter(w => w.trackingNumber.toLowerCase().includes(searchTerm.toLowerCase()) || w.courierName.toLowerCase().includes(searchTerm.toLowerCase()) || w.destination.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    return budgets.filter(b => b.userName.toLowerCase().includes(searchTerm.toLowerCase()));
  };

  const filteredDataList = filteredData();
  const totalSpent = filteredDataList.reduce((acc, curr: any) => acc + (curr.totalCost || curr.cost || curr.amount || 0), 0);

  if (!isGlobalAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500">
          <Target size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
        <p className="text-slate-500 max-w-md">Only the primary administrator (Abel) has access to the Admin Records section.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Admin Records</h1>
          <p className="text-slate-500 font-medium">Manage inventory restocks, logistics waybills, and advertising spend.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-95"
        >
          <Plus size={20} />
          Add New Record
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('restock')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'restock' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Package size={16} />
          Restock
        </button>
        <button 
          onClick={() => setActiveTab('waybills')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'waybills' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Truck size={16} />
          Waybills
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={`px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === 'ads' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Target size={16} />
          Ads Budget
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Records</p>
          <p className="text-3xl font-black text-slate-900">{filteredDataList.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount</p>
          <p className="text-3xl font-black text-emerald-600">₦{totalSpent.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Period</p>
          <p className="text-3xl font-black text-slate-900">{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Search records..."
              className="w-full bg-slate-50 border-none rounded-xl pl-12 pr-4 py-3 text-sm font-medium focus:ring-2 focus:ring-slate-900 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <Filter size={20} />
            </button>
            <button className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all">
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                {activeTab === 'restock' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Qty</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost/Unit</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                  </>
                )}
                {activeTab === 'waybills' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking #</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Courier</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Destination</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cost</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  </>
                )}
                {activeTab === 'ads' && (
                  <>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  </>
                )}
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredDataList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">No records found.</td>
                </tr>
              ) : (
                filteredDataList.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {activeTab === 'restock' && (
                      <>
                        <td className="px-6 py-4">
                          <p className="text-sm font-black text-slate-900">{item.productName}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">ID: {item.productId}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{item.quantity}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">₦{item.costPrice.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">₦{item.totalCost.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">{item.supplier || 'N/A'}</td>
                      </>
                    )}
                    {activeTab === 'waybills' && (
                      <>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">{item.trackingNumber}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{item.courierName}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-500">{item.destination}</td>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">₦{item.cost.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                            item.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            item.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </>
                    )}
                    {activeTab === 'ads' && (
                      <>
                        <td className="px-6 py-4 text-sm font-black text-slate-900">{item.userName}</td>
                        <td className="px-6 py-4 text-sm font-black text-emerald-600 font-black">₦{item.amount.toLocaleString()}</td>
                      </>
                    )}
                    <td className="px-6 py-4 text-xs font-bold text-slate-400">{new Date(item.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {activeTab === 'restock' ? 'New Restock Record' : activeTab === 'waybills' ? 'New Waybill Entry' : 'Add Ads Budget'}
                  </h2>
                  <p className="text-slate-500 font-medium">Enter the details below to save the record.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-all">
                  <Plus size={24} className="rotate-45 text-slate-400" />
                </button>
              </div>

              <form onSubmit={activeTab === 'restock' ? handleAddRestock : activeTab === 'waybills' ? handleAddWaybill : handleAddAds} className="space-y-5">
                {activeTab === 'restock' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Select Product</label>
                      <select 
                        required
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                        value={restockForm.productId}
                        onChange={(e) => setRestockForm({...restockForm, productId: e.target.value})}
                      >
                        <option value="">Choose a product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.totalStock})</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Quantity</label>
                        <input 
                          type="number" required
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                          value={restockForm.quantity}
                          onChange={(e) => setRestockForm({...restockForm, quantity: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Cost Price (₦)</label>
                        <input 
                          type="number" required
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                          value={restockForm.costPrice}
                          onChange={(e) => setRestockForm({...restockForm, costPrice: Number(e.target.value)})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Supplier Name</label>
                      <input 
                        type="text"
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                        value={restockForm.supplier}
                        onChange={(e) => setRestockForm({...restockForm, supplier: e.target.value})}
                        placeholder="Optional"
                      />
                    </div>
                  </>
                )}

                {activeTab === 'waybills' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Tracking Number</label>
                        <input 
                          type="text" required
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                          value={waybillForm.trackingNumber}
                          onChange={(e) => setWaybillForm({...waybillForm, trackingNumber: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Courier Name</label>
                        <input 
                          type="text" required
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                          value={waybillForm.courierName}
                          onChange={(e) => setWaybillForm({...waybillForm, courierName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Destination</label>
                      <input 
                        type="text" required
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                        value={waybillForm.destination}
                        onChange={(e) => setWaybillForm({...waybillForm, destination: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Shipping Cost (₦)</label>
                        <input 
                          type="number" required
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                          value={waybillForm.cost}
                          onChange={(e) => setWaybillForm({...waybillForm, cost: Number(e.target.value)})}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Status</label>
                        <select 
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                          value={waybillForm.status}
                          onChange={(e) => setWaybillForm({...waybillForm, status: e.target.value as any})}
                        >
                          <option value="pending">Pending</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'ads' && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Amount Spent (₦)</label>
                      <input 
                        type="number" required
                        className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                        value={adsForm.amount}
                        onChange={(e) => setAdsForm({...adsForm, amount: Number(e.target.value)})}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="date" required
                      className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold focus:ring-2 focus:ring-slate-900"
                      value={activeTab === 'restock' ? restockForm.date : activeTab === 'waybills' ? waybillForm.date : adsForm.date}
                      onChange={(e) => {
                        if (activeTab === 'restock') setRestockForm({...restockForm, date: e.target.value});
                        else if (activeTab === 'waybills') setWaybillForm({...waybillForm, date: e.target.value});
                        else setAdsForm({...adsForm, date: e.target.value});
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button type="submit" className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all active:scale-[0.98]">
                    Save Record
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRecords;
