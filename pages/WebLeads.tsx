
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { WebLead, LeadStatus, UserRole, State, PaymentStatus, DeliveryStatus, Order, OrderItem } from '../types';

const WebLeads: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const [leads, setLeads] = useState<WebLead[]>(db.getLeads());
  const [states, setStates] = useState<State[]>(db.getStates());
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
    });
    return unsubscribe;
  }, []);

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

    // Detect if this is a specialized Ginger Shot package lead
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

    // Special Price Tiers for Ginger Shot 500ml
    const packagePrices: Record<number, number> = {
      1: 20000,
      2: 38000,
      3: 55000,
      6: 90000,
      8: 126000,
      10: 165000,
      15: 249500,
      18: 300000,
      30: 500000
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
    const forms = db.getForms();
    if (forms.length === 0) {
      alert('Create a form in Form Builder first!');
      return;
    }
    const form = forms[0];
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Web Leads</h1>
          <p className="text-slate-500">Capture and convert orders from your landing pages.</p>
        </div>
        <button 
          onClick={generateMockLead}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
        >
          <span>🤖</span> Simulate Package Lead
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Details</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Selection</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Instructions</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No leads captured yet. Use Form Builder to get started.</td>
                </tr>
              ) : (
                [...leads].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{lead.customerName}</p>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <p className="text-[10px] text-slate-500 font-bold">📞 {lead.phone}</p>
                        {lead.whatsapp && <p className="text-[10px] text-emerald-600 font-bold">📲 {lead.whatsapp}</p>}
                      </div>
                      <p className="text-[9px] text-slate-400 mt-2 uppercase font-black tracking-tighter">
                        Captured: {new Date(lead.createdAt).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={lead.status}
                        onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                          lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' :
                          lead.status === LeadStatus.VERIFIED ? 'bg-emerald-100 text-emerald-700' :
                          lead.status === LeadStatus.REJECTED ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {Object.values(LeadStatus).map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {lead.items.map((item, idx) => (
                          <span key={idx} className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg">
                            Package x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2">
                        {lead.deliveryInstructions || <span className="text-slate-300 italic text-[9px]">No instructions</span>}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        {lead.whatsapp && (
                          <button 
                            onClick={() => window.open(`https://wa.me/${lead.whatsapp?.replace(/\D/g, '')}`)}
                            className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"
                            title="WhatsApp Lead"
                          >
                            📲
                          </button>
                        )}
                        <button 
                          onClick={() => window.open(`tel:${lead.phone}`)}
                          className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition"
                          title="Call Lead"
                        >
                          📞
                        </button>
                        {lead.status === LeadStatus.NEW && (
                          <button 
                            onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                          >
                            Convert
                          </button>
                        )}
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteLead(lead.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                            title="Delete Lead"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Conversion Modal */}
      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Finalize Conversion</h2>
            <p className="text-slate-500 text-sm mb-6">Confirm destination hub and payment status to move this lead into the active order flow.</p>
            
            <form onSubmit={handleConvert} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Destination State Hub</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={convDetails.stateId}
                  onChange={e => setConvDetails({...convDetails, stateId: e.target.value})}
                >
                  <option value="">-- Choose Hub --</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Method</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={convDetails.paymentStatus}
                  onChange={e => setConvDetails({...convDetails, paymentStatus: e.target.value as PaymentStatus})}
                >
                  {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all">
                  Create Order & Confirm Price
                </button>
                <button type="button" onClick={() => { setShowConvertModal(false); setSelectedLead(null); }} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition">
                  Go Back
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
