
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { WebLead, LeadStatus, UserRole, State, PaymentStatus, DeliveryStatus, Order, OrderItem } from '../types';

const WebLeads: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const [leads, setLeads] = useState<WebLead[]>(db.getLeads());
  const [states] = useState<State[]>(db.getStates());
  const [products] = useState(db.getProducts());
  const [selectedLead, setSelectedLead] = useState<WebLead | null>(null);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convDetails, setConvDetails] = useState({
    stateId: '',
    paymentStatus: PaymentStatus.POD
  });

  const updateStatus = (leadId: string, status: LeadStatus) => {
    db.updateLeadStatus(leadId, status);
    setLeads([...db.getLeads()]);
  };

  const handleConvert = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !convDetails.stateId) return;

    // Calculate totals
    const orderItems: OrderItem[] = selectedLead.items.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      return {
        productId: item.productId,
        productName: p?.name || 'Unknown Item',
        quantity: item.quantity,
        priceAtOrder: p?.sellingPrice || 0,
        costAtOrder: p?.costPrice || 0
      };
    });

    const total = orderItems.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0);

    const order: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      trackingId: 'MAG-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      customerName: selectedLead.customerName,
      phone: selectedLead.phone,
      address: selectedLead.address,
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

    db.createOrder(order);
    db.updateLeadStatus(selectedLead.id, LeadStatus.VERIFIED, 'Converted to order ' + order.id);
    setLeads([...db.getLeads()]);
    setShowConvertModal(false);
    setSelectedLead(null);
    alert('Lead successfully converted to Order!');
  };

  // Simulation: Generate a mock lead with manual quantity selection simulation
  const generateMockLead = () => {
    const forms = db.getForms();
    if (forms.length === 0) {
      alert('Create a form first!');
      return;
    }
    const form = forms[0];
    const randomQty = Math.floor(Math.random() * 5) + 1;
    const newLead: WebLead = {
      id: 'L-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      formId: form.id,
      customerName: ['Chinedu Obi', 'Fatima Musa', 'Segun Arinze', 'Bolu Ade', 'Kelechi Iheanacho'][Math.floor(Math.random() * 5)],
      phone: '080' + Math.floor(10000000 + Math.random() * 90000000),
      address: '123 Fake Street, Distribution District',
      items: [{ productId: form.productIds[0] || 'p1', quantity: randomQty }],
      status: LeadStatus.NEW,
      notes: `Customer requested ${randomQty} units manually via form.`,
      createdAt: new Date().toISOString()
    };
    db.createLead(newLead);
    setLeads([...db.getLeads()]);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Web Leads</h1>
          <p className="text-slate-500">Review and process orders captured from embedded forms.</p>
        </div>
        <button 
          onClick={generateMockLead}
          className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
        >
          <span>🤖</span> Simulate New Lead
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Lead Info</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Items</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">No web leads captured yet.</td>
                </tr>
              ) : (
                leads.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{lead.customerName}</p>
                      <p className="text-xs text-slate-500">{lead.phone}</p>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">Source: {lead.formId} • {new Date(lead.createdAt).toLocaleTimeString()}</p>
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
                          <span key={idx} className="text-[10px] font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                            {products.find(p => p.id === item.productId)?.name} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => window.open(`tel:${lead.phone}`)}
                          className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition"
                          title="Call Customer"
                        >
                          📞
                        </button>
                        {lead.status === LeadStatus.NEW && (
                          <button 
                            onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }}
                            className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-700 transition"
                          >
                            Convert to Order
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
            <h2 className="text-2xl font-black text-slate-800 mb-2">Lead Conversion</h2>
            <p className="text-slate-500 text-sm mb-6">Assign a destination state and payment method to generate an official order.</p>
            
            <form onSubmit={handleConvert} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Destination Hub</label>
                <select 
                  required 
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={convDetails.stateId}
                  onChange={e => setConvDetails({...convDetails, stateId: e.target.value})}
                >
                  <option value="">Select State</option>
                  {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Payment Terms</label>
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
                  Generate Order & Deduct Stock
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
