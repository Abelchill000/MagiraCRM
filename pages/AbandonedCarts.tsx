
import React, { useState, useMemo } from 'react';
import { db } from '../services/mockDb';
import { AbandonedCart, UserRole, Order, DeliveryStatus, PaymentStatus, OrderItem, State } from '../types';

const AbandonedCarts: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [carts, setCarts] = useState<AbandonedCart[]>(db.getAbandonedCarts());
  const [states] = useState<State[]>(db.getStates());
  const products = db.getProducts();
  const [showConvertModal, setShowConvertModal] = useState<AbandonedCart | null>(null);
  const [selectedState, setSelectedState] = useState('');

  const isAdmin = userRole === UserRole.ADMIN;

  const filteredCarts = useMemo(() => {
    let result = carts.filter(c => c.status === 'abandoned');
    if (!isAdmin && user) {
      result = result.filter(c => c.agentName === user.name);
    }
    return result.sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
  }, [carts, isAdmin, user]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Permanently remove this abandoned entry?")) {
      await db.deleteAbandonedCart(id);
      setCarts(db.getAbandonedCarts());
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showConvertModal || !selectedState || !user) return;

    const cart = showConvertModal;
    const items: OrderItem[] = (cart.items || []).map(i => {
      const p = products.find(prod => prod.id === i.productId || prod.name.toLowerCase().includes('ginger'));
      return {
        productId: i.productId,
        productName: p?.name || 'Ginger Shot Recovery',
        quantity: i.quantity,
        priceAtOrder: p?.sellingPrice || 20000,
        costAtOrder: p?.costPrice || 5000
      };
    });

    const order: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      trackingId: 'MAG-REC-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerName: cart.customerName || 'Recovered Customer',
      phone: cart.phone || '0000000000',
      whatsapp: cart.whatsapp,
      address: cart.address || 'Address captured from abandoned cart',
      deliveryInstructions: cart.deliveryInstructions || 'Manual recovery follow-up',
      stateId: selectedState,
      items,
      totalAmount: items.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0),
      logisticsCost: 0,
      paymentStatus: PaymentStatus.POD,
      deliveryStatus: DeliveryStatus.PENDING,
      createdAt: new Date().toISOString(),
      createdBy: user.name,
    };

    await db.createOrder(order);
    await db.deleteAbandonedCart(cart.id);
    setShowConvertModal(null);
    setCarts(db.getAbandonedCarts());
    alert("Abandoned cart converted to order successfully!");
  };

  const getCompletionRate = (cart: AbandonedCart) => {
    let fields = 0;
    if (cart.customerName) fields++;
    if (cart.phone) fields++;
    if (cart.address) fields++;
    if (cart.whatsapp) fields++;
    return Math.round((fields / 4) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            Lost Opportunity Recovery
            <span className="bg-amber-500 text-white text-[10px] px-3 py-1 rounded-full uppercase">Abandoned Carts</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium">Real-time capture of customers who dropped off mid-form.</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-amber-50 border-b border-amber-100">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-amber-800 uppercase tracking-widest">Customer / Source</th>
              <th className="px-8 py-5 text-[10px] font-black text-amber-800 uppercase tracking-widest">Captured Fields</th>
              <th className="px-8 py-5 text-[10px] font-black text-amber-800 uppercase tracking-widest text-center">Form Health</th>
              <th className="px-8 py-5 text-[10px] font-black text-amber-800 uppercase tracking-widest">Timestamp</th>
              <th className="px-8 py-5 text-[10px] font-black text-amber-800 uppercase tracking-widest text-right">Recovery Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredCarts.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center opacity-30">
                    <div className="text-5xl mb-4">🛒</div>
                    <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Your recovery list is empty.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCarts.map(cart => {
                const completion = getCompletionRate(cart);
                return (
                  <tr key={cart.id} className="hover:bg-amber-50/20 transition-all duration-300">
                    <td className="px-8 py-5">
                      <p className="font-black text-slate-800 uppercase">{cart.customerName || 'Anonymous Visitor'}</p>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">📞 {cart.phone || 'Phone not captured'}</p>
                      {cart.agentName && <p className="text-[9px] font-black text-emerald-600 uppercase mt-1 tracking-tighter">Page Agent: {cart.agentName}</p>}
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded ${cart.customerName ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>NAME</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded ${cart.phone ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>PHONE</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded ${cart.address ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>ADDR</span>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded ${cart.whatsapp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-300'}`}>WA</span>
                      </div>
                      {cart.address && <p className="text-[9px] text-slate-400 italic mt-2 truncate max-w-[150px]">{cart.address}</p>}
                    </td>
                    <td className="px-8 py-5 text-center">
                       <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden max-w-[80px] mx-auto">
                          <div className={`h-full transition-all duration-1000 ${completion > 70 ? 'bg-emerald-500' : completion > 30 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${completion}%` }}></div>
                       </div>
                       <p className="text-[9px] font-black text-slate-400 mt-2">{completion}% SYNCED</p>
                    </td>
                    <td className="px-8 py-5">
                       <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{new Date(cart.lastUpdatedAt).toLocaleDateString()}</p>
                       <p className="text-[10px] font-medium text-slate-400">{new Date(cart.lastUpdatedAt).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        {cart.phone && (
                          <>
                            <button onClick={() => window.open(`tel:${cart.phone}`)} className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-white transition" title="Call Now">📞</button>
                            {cart.whatsapp && (
                               <button onClick={() => window.open(`https://wa.me/${cart.whatsapp.replace(/\D/g, '')}`)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition" title="WhatsApp Follow-up">📲</button>
                            )}
                          </>
                        )}
                        <button 
                          onClick={() => setShowConvertModal(cart)}
                          disabled={!cart.phone}
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-lg ${!cart.phone ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-amber-500 text-white shadow-amber-100 hover:bg-amber-600'}`}
                        >
                          Manual Convert
                        </button>
                        <button onClick={() => handleDelete(cart.id)} className="p-3 text-slate-200 hover:text-red-500 transition">✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showConvertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
           <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-12 animate-in zoom-in duration-300">
              <h2 className="text-2xl font-black text-slate-800 mb-2">Recover & Ship</h2>
              <p className="text-slate-500 text-sm mb-10 font-medium">Verify delivery details for <strong>{showConvertModal.customerName || 'Captured Lead'}</strong>.</p>
              <form onSubmit={handleConvert} className="space-y-6">
                 <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Distribution Hub</label>
                    <select required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-amber-500 font-bold" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                       <option value="">-- Choose Hub --</option>
                       {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                 </div>
                 <div className="pt-6">
                    <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-black transition active:scale-95">Finalize Conversion</button>
                    <button type="button" onClick={() => setShowConvertModal(null)} className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Discard Follow-up</button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AbandonedCarts;
