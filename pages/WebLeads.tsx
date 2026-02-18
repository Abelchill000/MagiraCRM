
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { WebLead, LeadStatus, UserRole, State, PaymentStatus, DeliveryStatus, Order, OrderItem, OrderForm } from '../types';

const WebLeads: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [leads, setLeads] = useState<WebLead[]>(db.getLeads());
  const [states, setStates] = useState<State[]>(db.getStates());
  const [forms, setForms] = useState<OrderForm[]>(db.getForms());
  const [products] = useState(db.getProducts());
  const [selectedLead, setSelectedLead] = useState<WebLead | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convDetails, setConvDetails] = useState({
    stateId: '',
    paymentStatus: PaymentStatus.POD
  });

  const isAdmin = userRole === UserRole.ADMIN;

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setLeads(db.getLeads());
      setStates(db.getStates());
      setForms(db.getForms());
    });
    return unsubscribe;
  }, []);

  const sortedLeads = useMemo(() => {
    let filteredLeads = [...leads];
    // Agents only see leads from their pages
    if (!isAdmin && user) {
      filteredLeads = filteredLeads.filter(l => l.agentName === user.name);
    }
    return filteredLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, isAdmin, user]);

  const updateStatus = (leadId: string, status: LeadStatus) => {
    db.updateLeadStatus(leadId, status);
  };

  const handleDeleteLead = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this lead?")) {
      try {
        await db.deleteLead(id);
      } catch (err) {
        alert("Failed to delete lead.");
      }
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !convDetails.stateId || !user) return;

    const isSpecialPackage = selectedLead.items.some(i => i.productId === 'GINGER-SHOT-500ML');
    
    const orderItems: OrderItem[] = selectedLead.items.map(item => {
      const p = products.find(prod => prod.id === item.productId || prod.name.toLowerCase().includes('ginger'));
      return {
        productId: p?.id || item.productId,
        productName: p?.name || 'Ginger Shot (500ml)',
        quantity: item.quantity,
        priceAtOrder: p?.sellingPrice || 20000, 
        costAtOrder: p?.costPrice || 5000
      };
    });

    const packagePrices: Record<number, number> = {
      1: 20000, 2: 38000, 3: 55000, 6: 90000, 8: 126000, 10: 165000, 15: 249500, 18: 300000, 30: 500000
    };

    let total = 0;
    if (isSpecialPackage && selectedLead.items.length === 1) {
      const qty = selectedLead.items[0].quantity;
      total = packagePrices[qty] || (orderItems[0].priceAtOrder * qty);
    } else {
      total = orderItems.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0);
    }

    const order: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      trackingId: 'MAG-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      customerName: selectedLead.customerName,
      phone: selectedLead.phone,
      whatsapp: selectedLead.whatsapp,
      address: selectedLead.address,
      deliveryInstructions: selectedLead.deliveryInstructions,
      stateId: convDetails.stateId,
      items: orderItems,
      totalAmount: total,
      logisticsCost: 0,
      paymentStatus: convDetails.paymentStatus,
      deliveryStatus: DeliveryStatus.PENDING,
      createdAt: new Date().toISOString(),
      createdBy: user.name,
      leadId: selectedLead.id
    };

    await db.createOrder(order);
    await db.updateLeadStatus(selectedLead.id, LeadStatus.VERIFIED, 'Converted to order ' + order.id);
    setShowConvertModal(false);
    setSelectedLead(null);
    alert(`Lead converted! Total: ₦${total.toLocaleString()}`);
  };

  const isNewLead = (createdAt: string) => {
    const leadTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return (now - leadTime) < 1000 * 60 * 5;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Web Leads Console</h1>
          <p className="text-slate-500 text-sm font-medium">
            {isAdmin ? "Network-wide lead capture monitoring." : `Showing your individual captured leads.`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact / Attribution</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Package Selection</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Source Page</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <div className="text-5xl mb-4">📥</div>
                      <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No leads captured yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedLeads.map(lead => {
                  const formSource = forms.find(f => f.id === lead.formId);
                  const newBadge = isNewLead(lead.createdAt);
                  
                  return (
                    <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all duration-300 group ${newBadge ? 'bg-emerald-50/20' : ''}`}>
                      <td className="px-8 py-5">
                        <div className="flex items-start gap-3">
                          {newBadge && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-2"></span>}
                          <div>
                            <p className="font-black text-slate-800 uppercase tracking-tight">{lead.customerName}</p>
                            <div className="flex flex-col gap-0.5 mt-1.5">
                              <p className="text-[10px] text-slate-500 font-bold">📞 {lead.phone}</p>
                              {lead.whatsapp && <p className="text-[10px] text-emerald-600 font-black">📲 {lead.whatsapp}</p>}
                            </div>
                            <div className="mt-2 text-[9px] font-black uppercase text-slate-400 tracking-tighter">Attributed: {lead.agentName || 'Network'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <select 
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          className={`text-[9px] font-black uppercase px-4 py-2 rounded-xl border-none focus:ring-0 cursor-pointer shadow-sm ${
                            lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                            lead.status === LeadStatus.VERIFIED ? 'bg-emerald-100 text-emerald-700' :
                            lead.status === LeadStatus.REJECTED ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-wrap gap-1">
                          {lead.items.map((item, idx) => (
                            <span key={idx} className="text-[10px] font-black bg-white border border-slate-100 text-slate-700 px-3 py-1.5 rounded-xl shadow-sm">
                              GINGER X{item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-8 py-5 max-w-[180px]">
                        {formSource ? (
                           <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{backgroundColor: formSource.themeColor}}></div>
                              <p className="text-[10px] font-black text-slate-500 uppercase truncate">{formSource.title}</p>
                           </div>
                        ) : (
                          <p className="text-[9px] text-slate-300 uppercase font-black italic">Legacy Source</p>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          {lead.whatsapp && (
                            <button onClick={() => window.open(`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-sm">📲</button>
                          )}
                          {lead.status === LeadStatus.NEW && (
                            <button onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-100">Convert</button>
                          )}
                          {isAdmin && (
                            <button onClick={() => handleDeleteLead(lead.id)} className="p-3 bg-slate-50 text-slate-300 hover:text-red-600 rounded-xl transition">🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-12 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Fulfillment Routing</h2>
            <p className="text-slate-500 text-sm mb-10 font-medium">Select the regional hub that will process this lead's delivery.</p>
            <form onSubmit={handleConvert} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Assigned Hub</label>
                <select required className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold" value={convDetails.stateId} onChange={e => setConvDetails({...convDetails, stateId: e.target.value})}>
                  <option value="">-- Choose State Hub --</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="pt-6">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-emerald-100 transition active:scale-95">Complete Conversion</button>
                <button type="button" onClick={() => setShowConvertModal(false)} className="w-full mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebLeads;
