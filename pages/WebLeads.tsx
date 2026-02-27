
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { WebLead, LeadStatus, UserRole, State, PaymentStatus, DeliveryStatus, Order, OrderItem, OrderForm } from '../types';

const WebLeads: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [leads, setLeads] = useState<WebLead[]>(db.getLeads());
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [states, setStates] = useState<State[]>(db.getStates());
  const [forms, setForms] = useState<OrderForm[]>(db.getForms());
  const [products] = useState(db.getProducts());
  const [selectedLead, setSelectedLead] = useState<WebLead | null>(null);
  const [viewingLead, setViewingLead] = useState<WebLead | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const [showLogisticsPrompt, setShowLogisticsPrompt] = useState<{orderId: string, leadId: string} | null>(null);
  const [tempLogisticsCost, setTempLogisticsCost] = useState<number>(0);

  const [convDetails, setConvDetails] = useState({
    stateId: '',
    paymentStatus: PaymentStatus.POD
  });

  const isAdmin = userRole === UserRole.ADMIN;
  const isInventoryManager = user?.role === UserRole.INVENTORY_MANAGER;
  const isLogisticsManager = user?.role === UserRole.LOGISTICS_MANAGER;
  // ONLY this specific agent gets Admin-level global visibility
  const isSuperAgent = user?.email === 'ijasinijafaru@gmail.com' || user?.email === 'iconfidence909@gmail.com';
  
  const canManageFulfillment = isAdmin || isSuperAgent || isInventoryManager || isLogisticsManager;

  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setLeads(db.getLeads());
      setOrders(db.getOrders());
      setStates(db.getStates());
      setForms(db.getForms());
    });
    return unsubscribe;
  }, []);

  const sortedLeads = useMemo(() => {
    // Admin and Super Agent see everything
    if (isAdmin || isSuperAgent) {
      return [...leads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // Regular agents see only leads attributed to them
    return leads
      .filter(l => l.agentName === user?.name)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, isAdmin, isSuperAgent, user?.name]);

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

  const copyLeadDetails = (lead: WebLead) => {
    const text = `
🌿 MAGIRA LEAD CAPTURE
-------------------------
👤 Name: ${lead.customerName}
📞 Phone: ${lead.phone}
📲 WhatsApp: ${lead.whatsapp || 'N/A'}
📍 Address: ${lead.address}
📝 Instructions: ${lead.deliveryInstructions || 'None'}
📅 Captured: ${new Date(lead.createdAt).toLocaleString()}
👤 Agent: ${lead.agentName || 'Network'}
-------------------------
`.trim();
    navigator.clipboard.writeText(text);
    alert('Lead details copied to clipboard!');
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

  const handleMarkDelivered = (orderId: string, leadId: string) => {
    setShowLogisticsPrompt({ orderId, leadId });
    setTempLogisticsCost(0);
  };

  const handleLogisticsSubmit = async () => {
    if (showLogisticsPrompt) {
      await db.updateOrderStatus(showLogisticsPrompt.orderId, DeliveryStatus.DELIVERED, { 
        logisticsCost: tempLogisticsCost 
      });
      setShowLogisticsPrompt(null);
      alert("Order marked as Delivered!");
    }
  };

  const getDeliveryStatusColor = (status: DeliveryStatus) => {
    switch (status) {
      case DeliveryStatus.DELIVERED: return 'bg-emerald-100 text-emerald-700';
      case DeliveryStatus.FAILED: return 'bg-red-100 text-red-700';
      case DeliveryStatus.CANCELLED: return 'bg-slate-200 text-slate-600';
      case DeliveryStatus.RESCHEDULED: return 'bg-amber-100 text-amber-700';
      case DeliveryStatus.PENDING: return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Web Leads Console</h1>
            {(isAdmin || isSuperAgent) && (
              <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest border border-emerald-200">
                Network Access Enabled
              </span>
            )}
          </div>
          <p className="text-slate-500 text-sm font-medium">
            {isAdmin || isSuperAgent ? 'Network-wide lead capture monitoring.' : 'Tracking leads attributed to your sales profile.'}
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
                  const linkedOrder = orders.find(o => o.leadId === lead.id);
                  
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
                        <div className="flex flex-col gap-2">
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
                          
                          {linkedOrder && (
                            <div className="flex items-center gap-2">
                              <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${getDeliveryStatusColor(linkedOrder.deliveryStatus)}`}>
                                {linkedOrder.deliveryStatus}
                              </span>
                              {canManageFulfillment && linkedOrder.deliveryStatus !== DeliveryStatus.DELIVERED && linkedOrder.deliveryStatus !== DeliveryStatus.CANCELLED && (
                                <button 
                                  onClick={() => handleMarkDelivered(linkedOrder.id, lead.id)}
                                  className="text-[8px] font-black text-emerald-600 hover:underline uppercase"
                                >
                                  Mark Delivered
                                </button>
                              )}
                            </div>
                          )}
                        </div>
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
                          <button 
                            onClick={() => setViewingLead(lead)}
                            className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-800 hover:text-white transition shadow-sm"
                            title="View Full Details"
                          >
                            👁️
                          </button>
                          <button 
                            onClick={() => copyLeadDetails(lead)} 
                            className="p-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-800 hover:text-white transition shadow-sm"
                            title="Copy Lead Details"
                          >
                            📋
                          </button>
                          {lead.whatsapp && (
                            <button onClick={() => window.open(`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition shadow-sm">📲</button>
                          )}
                          {lead.status === LeadStatus.NEW && (
                            <button onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-lg shadow-emerald-100">Convert</button>
                          )}
                          {(isAdmin || isSuperAgent) && (
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

      {/* Details Modal */}
      {viewingLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Customer Application Profile</h2>
              <button onClick={() => setViewingLead(null)} className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  <p className="text-lg font-black text-slate-900">{viewingLead.customerName}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lead Status</label>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${viewingLead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {viewingLead.status}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Primary Contact</label>
                  <p className="text-lg font-black text-slate-900">{viewingLead.phone}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp</label>
                  <p className="text-lg font-black text-emerald-600">{viewingLead.whatsapp || 'Not Provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery Location Hub</label>
                  <p className="text-sm font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-xl inline-block">
                    {states.find(s => s.id === viewingLead.stateId || s.name === viewingLead.stateId)?.name || 'Not Assigned / Global'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery Address</label>
                  <p className="text-sm font-bold text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed italic">"{viewingLead.address}"</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Special Instructions</label>
                  <p className="text-sm font-medium text-slate-500 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed italic">
                    {viewingLead.deliveryInstructions || 'No specific instructions added by customer.'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Selection Metadata</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingLead.items.map((item, i) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm">
                        {item.productId.replace(/-/g, ' ')} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={() => { copyLeadDetails(viewingLead); setViewingLead(null); }}
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-black transition shadow-xl"
                >
                  Copy & Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Logistics Cost Modal */}
      {showLogisticsPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[110]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Fulfillment Data</h2>
            <p className="text-slate-500 text-sm mb-6 font-medium">Finalize the order by entering the logistics partner expense.</p>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Logistics/Shipping Cost (₦)</label>
                <input 
                  type="number" autoFocus
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 font-black text-2xl text-center" 
                  value={tempLogisticsCost}
                  onChange={(e) => setTempLogisticsCost(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={handleLogisticsSubmit} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition active:scale-[0.98]">Mark as Delivered</button>
                <button onClick={() => setShowLogisticsPrompt(null)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest">Go Back</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebLeads;
