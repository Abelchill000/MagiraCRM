
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { WebLead, LeadStatus, UserRole, State, PaymentStatus, DeliveryStatus, Order, OrderItem, OrderForm } from '../types';

const WebLeads: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
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

  // Subscribe to real-time database changes
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setLeads(db.getLeads());
      setStates(db.getStates());
      setForms(db.getForms());
    });
    return unsubscribe;
  }, []);

  const sortedLeads = useMemo(() => {
    return [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads]);

  const updateStatus = (leadId: string, status: LeadStatus) => {
    db.updateLeadStatus(leadId, status);
  };

  const handleDeleteLead = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this lead? This action cannot be undone.")) {
      try {
        await db.deleteLead(id);
      } catch (err) {
        alert("Failed to delete lead. Check permissions.");
      }
    }
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !convDetails.stateId) return;

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
      createdBy: 'Lead Conversion',
      leadId: selectedLead.id
    };

    await db.createOrder(order);
    await db.updateLeadStatus(selectedLead.id, LeadStatus.VERIFIED, 'Converted to order ' + order.id);
    setShowConvertModal(false);
    setSelectedLead(null);
    alert(`Lead converted! Package Price applied: ₦${total.toLocaleString()}`);
  };

  const generateMockLead = () => {
    const formsList = db.getForms();
    if (formsList.length === 0) {
      alert('Create a form in Form Builder first!');
      return;
    }
    const form = formsList[0];
    const tiers = [1, 2, 3, 6, 8, 10, 15, 18, 30];
    const randomQty = tiers[Math.floor(Math.random() * tiers.length)];
    const randomState = ["Lagos", "Abuja", "Enugu", "Kano", "Port Harcourt"][Math.floor(Math.random() * 5)];
    
    const newLead: WebLead = {
      id: 'L-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      formId: form.id,
      customerName: ['Tunde Lawson', 'Chika Obi', 'Ibrahim Musa', 'Hauwa Adamu', 'Uche Kelvin'][Math.floor(Math.random() * 5)],
      phone: '080' + Math.floor(10000000 + Math.random() * 90000000),
      whatsapp: '081' + Math.floor(10000000 + Math.random() * 90000000),
      address: 'Plot 4, Magira Street, ' + randomState,
      deliveryInstructions: 'Call me when you reach the gate.',
      items: [{ productId: 'GINGER-SHOT-500ML', quantity: randomQty }],
      status: LeadStatus.NEW,
      notes: `Lead from package dropdown for ${randomQty} units.`,
      createdAt: new Date().toISOString()
    };
    db.createLead(newLead);
  };

  const isNewLead = (createdAt: string) => {
    const leadTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    return (now - leadTime) < 1000 * 60 * 5; // New if less than 5 mins old
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Web Leads Console</h1>
          <p className="text-slate-500 text-sm font-medium">Real-time capture of submissions from your Magira Landing Pages.</p>
        </div>
        <button 
          onClick={generateMockLead}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl font-bold transition flex items-center gap-2 shadow-lg shadow-slate-200 text-xs uppercase tracking-widest"
        >
          <span>🤖</span> Simulate Lead
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Contact / Source</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current State</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Selection</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Instructions</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <div className="text-5xl mb-4">📥</div>
                      <p className="text-slate-400 font-black text-sm uppercase tracking-widest">No active leads found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedLeads.map(lead => {
                  const formSource = forms.find(f => f.id === lead.formId);
                  const newBadge = isNewLead(lead.createdAt);
                  
                  return (
                    <tr key={lead.id} className={`hover:bg-slate-50/50 transition-all duration-300 group ${newBadge ? 'bg-emerald-50/20' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3">
                          {newBadge && <span className="flex-shrink-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping mt-2"></span>}
                          <div>
                            <div className="flex items-center gap-2">
                                <p className="font-black text-slate-800">{lead.customerName}</p>
                                {newBadge && <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">New</span>}
                            </div>
                            <div className="flex flex-col gap-0.5 mt-1">
                              <p className="text-[10px] text-slate-500 font-bold">📞 {lead.phone}</p>
                              {lead.whatsapp && <p className="text-[10px] text-emerald-600 font-black">📲 {lead.whatsapp}</p>}
                            </div>
                            {formSource && (
                              <div className="mt-2.5 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor: formSource.themeColor}}></span>
                                <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{formSource.title}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={lead.status}
                          onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                          className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl border-none focus:ring-0 cursor-pointer shadow-sm ${
                            lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                            lead.status === LeadStatus.VERIFIED ? 'bg-emerald-100 text-emerald-700' :
                            lead.status === LeadStatus.REJECTED ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <p className="text-[8px] text-slate-300 font-black uppercase tracking-tighter mt-2 ml-1">
                          {new Date(lead.createdAt).toLocaleTimeString()}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {lead.items.map((item, idx) => (
                            <span key={idx} className="text-[10px] font-black bg-white border border-slate-100 text-slate-700 px-2.5 py-1 rounded-lg shadow-sm">
                              PACKAGE X{item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-[200px]">
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">
                          {lead.deliveryInstructions ? `"${lead.deliveryInstructions}"` : <span className="text-slate-200">No notes provided</span>}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {lead.whatsapp && (
                            <button 
                              onClick={() => window.open(`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`)}
                              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                              title="WhatsApp"
                            >
                              📲
                            </button>
                          )}
                          {lead.status === LeadStatus.NEW && (
                            <button 
                              onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-100"
                            >
                              Convert
                            </button>
                          )}
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-2.5 bg-slate-50 text-slate-300 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                              title="Delete"
                            >
                              🗑️
                            </button>
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

      {/* Conversion Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl p-10 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Initialize Fulfillment</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Verify the logistics hub and payment flow before converting this lead into an active order.</p>
            
            <form onSubmit={handleConvert} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Destination Logistics Hub</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800"
                  value={convDetails.stateId}
                  onChange={e => setConvDetails({...convDetails, stateId: e.target.value})}
                >
                  <option value="">-- Choose Hub --</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Default Payment Policy</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-slate-800"
                  value={convDetails.paymentStatus}
                  onChange={e => setConvDetails({...convDetails, paymentStatus: e.target.value as PaymentStatus})}
                >
                  {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-3 pt-6">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black text-sm shadow-xl shadow-emerald-100 transition-all active:scale-95 uppercase tracking-widest">
                  Confirm & Create Order
                </button>
                <button type="button" onClick={() => { setShowConvertModal(false); setSelectedLead(null); }} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition">
                  Back to Leads
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebLeads;
