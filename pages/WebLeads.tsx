
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { calculateItemTotal } from '../services/pricingUtils';
import { WebLead, LeadStatus, UserRole, PaymentStatus, DeliveryStatus, Order, OrderItem, OrderForm, User } from '../types';

import LeadCard from '../components/LeadCard';

const NIGERIA_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta',
  'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina',
  'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const WebLeads: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [leads, setLeads] = useState<WebLead[]>(db.getLeads());
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [forms, setForms] = useState<OrderForm[]>(db.getForms());
  const [products] = useState(db.getProducts());
  const [selectedLead, setSelectedLead] = useState<WebLead | null>(null);
  const [viewingLead, setViewingLead] = useState<WebLead | null>(null);
  const [isEditingLead, setIsEditingLead] = useState(false);
  const [editingLeadData, setEditingLeadData] = useState<Partial<WebLead>>({});
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const [showLogisticsPrompt, setShowLogisticsPrompt] = useState<{orderId: string, leadId: string} | null>(null);
  const [tempLogisticsCost, setTempLogisticsCost] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [convDetails, setConvDetails] = useState({
    paymentStatus: PaymentStatus.POD
  });

  const [selectedAgentName, setSelectedAgentName] = useState<string>('all');
  const [agents, setAgents] = useState<User[]>([]);

  const isAdmin = userRole === UserRole.ADMIN;
  const isInventoryManager = user?.role === UserRole.INVENTORY_MANAGER;
  const isLogisticsManager = user?.role === UserRole.LOGISTICS_MANAGER;
  // ONLY this specific agent gets Admin-level global visibility
  const isSuperAgent = user?.email === 'ijasinijafaru@gmail.com';
  
  const canManageFulfillment = isAdmin || isSuperAgent || isInventoryManager || isLogisticsManager;

  useEffect(() => {
    setAgents(db.getUsers().filter(u => u.role === UserRole.SALES_AGENT || u.role === UserRole.ADMIN));
    const unsubscribe = db.subscribe(() => {
      setLeads(db.getLeads());
      setOrders(db.getOrders());
      setForms(db.getForms());
      setAgents(db.getUsers().filter(u => u.role === UserRole.SALES_AGENT || u.role === UserRole.ADMIN));
    });
    return unsubscribe;
  }, []);

  const sortedLeads = useMemo(() => {
    let filtered = leads;
    
    // Admin and Super Agent see everything
    if (!(isAdmin || isSuperAgent)) {
      filtered = filtered.filter(l => l.agentName === user?.name);
    } else if (selectedAgentName !== 'all') {
      filtered = filtered.filter(l => l.agentName === selectedAgentName);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(l => 
        l.customerName.toLowerCase().includes(term) ||
        l.id.toLowerCase().includes(term)
      );
    }

    return [...filtered].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, isAdmin, isSuperAgent, user?.name, searchTerm, selectedAgentName]);

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
    const itemsText = lead.items.map(i => {
      const p = products.find(prod => prod.id === i.productId);
      const productName = i.packageLabel || p?.name || i.productId;
      const itemPrice = calculateItemTotal(i, lead.agentName);

      return `${productName} x${i.quantity} = ${itemPrice.toLocaleString()}`;
    }).join('\n');

    const text = `Name
${lead.customerName}
Phone Number
${lead.phone}
WhatsApp Number
${lead.whatsapp || lead.phone}
Select State
${lead.stateName || 'N/A'}
Complete Address
${lead.address}
Special Delivery Instruction
${lead.deliveryInstructions || 'No special instructions.'}
Choose Product
${itemsText}
Are you ready for the delivery?
YES
👤 Processed By: ${lead.agentName || 'System'}`.trim();

    navigator.clipboard.writeText(text);
    alert('Lead details copied to clipboard!');
  };

  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !user) return;

    const isSpecialPackage = selectedLead.items.some(i => i.productId === 'GINGER-SHOT-500ML');
    
    const orderItems: OrderItem[] = selectedLead.items.map(item => {
      const p = products.find(prod => prod.id === item.productId || prod.name.toLowerCase().includes('ginger'));
      const capturedPrice = calculateItemTotal(item, selectedLead.agentName);

      const unitPrice = (capturedPrice && capturedPrice > 0)
        ? (capturedPrice / item.quantity) 
        : (p?.sellingPrice || 20000);

      return {
        productId: p?.id || item.productId,
        productName: item.packageLabel || p?.name || 'Ginger Shot (500ml)',
        quantity: item.quantity,
        priceAtOrder: unitPrice, 
        costAtOrder: p?.costPrice || 5000
      };
    });

    const total = orderItems.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0);

    const order: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      trackingId: 'MAG-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      customerName: selectedLead.customerName,
      phone: selectedLead.phone,
      whatsapp: selectedLead.whatsapp,
      address: selectedLead.address,
      stateName: selectedLead.stateName,
      deliveryInstructions: selectedLead.deliveryInstructions,
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

  const handleSaveLeadEdit = async () => {
    if (!viewingLead) return;
    try {
      await db.updateLead(viewingLead.id, editingLeadData);
      setViewingLead({ ...viewingLead, ...editingLeadData } as WebLead);
      setIsEditingLead(false);
      alert("Lead updated successfully!");
    } catch (err) {
      alert("Failed to update lead.");
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

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <input 
            type="text"
            placeholder="Search by Name or Lead ID..."
            className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {(isAdmin || isSuperAgent) && (
          <div className="w-full md:w-64">
            <select
              value={selectedAgentName}
              onChange={(e) => setSelectedAgentName(e.target.value)}
              className="w-full bg-white border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.name}>{agent.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Info</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
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
                  const linkedOrder = orders.find(o => o.leadId === lead.id);
                  const isNew = isNewLead(lead.createdAt);
                  
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex flex-col" onClick={() => setViewingLead(lead)}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 cursor-pointer hover:text-blue-600 transition-colors">#{lead.id}</span>
                            {isNew && (
                              <span className="bg-blue-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase animate-pulse">New</span>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400">{new Date(lead.createdAt).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-slate-800">{lead.customerName}</span>
                          <span className="text-[10px] font-bold text-slate-500">{lead.phone}</span>
                          <span className="text-[10px] font-medium text-slate-400 truncate max-w-[150px]">{lead.stateName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight bg-slate-100 px-2 py-1 rounded-lg">
                          {lead.agentName}
                        </span>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          <select
                            value={lead.status}
                            onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)}
                            className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border-none focus:ring-2 focus:ring-offset-2 outline-none cursor-pointer transition-all w-fit ${
                              lead.status === LeadStatus.VERIFIED ? 'bg-emerald-100 text-emerald-700 focus:ring-emerald-500' :
                              lead.status === LeadStatus.REJECTED ? 'bg-red-100 text-red-700 focus:ring-red-500' :
                              'bg-blue-100 text-blue-700 focus:ring-blue-500'
                            }`}
                          >
                            {Object.values(LeadStatus).map(status => (
                              <option key={status} value={status}>{status}</option>
                            ))}
                          </select>
                          {linkedOrder && (
                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">
                              Order: {linkedOrder.id} ({linkedOrder.deliveryStatus})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          {lead.status === LeadStatus.NEW && (
                            <button 
                              onClick={() => { setSelectedLead(lead); setShowConvertModal(true); }}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Convert to Order"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                              </svg>
                            </button>
                          )}
                          <button 
                            onClick={() => copyLeadDetails(lead)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                            title="Copy Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                          </button>
                          {linkedOrder && linkedOrder.deliveryStatus !== DeliveryStatus.DELIVERED && isAdmin && (
                            <button 
                              onClick={() => handleMarkDelivered(linkedOrder.id, lead.id)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                              title="Mark as Delivered"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          {isAdmin && (
                            <button 
                              onClick={() => handleDeleteLead(lead.id)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Lead"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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

      {/* Details Modal */}
      {viewingLead && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                {isEditingLead ? 'Edit Customer Profile' : 'Customer Application Profile'}
              </h2>
              <div className="flex items-center gap-2">
                {isAdmin && !isEditingLead && (
                  <button 
                    onClick={() => {
                      setIsEditingLead(true);
                      setEditingLeadData({
                        customerName: viewingLead.customerName,
                        phone: viewingLead.phone,
                        whatsapp: viewingLead.whatsapp,
                        address: viewingLead.address,
                        stateName: viewingLead.stateName,
                        deliveryInstructions: viewingLead.deliveryInstructions
                      });
                    }}
                    className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl uppercase tracking-widest hover:bg-emerald-100 transition"
                  >
                    Edit Data
                  </button>
                )}
                <button onClick={() => { setViewingLead(null); setIsEditingLead(false); }} className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">✕</button>
              </div>
            </div>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                  {isEditingLead ? (
                    <input 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      value={editingLeadData.customerName || ''}
                      onChange={e => setEditingLeadData({...editingLeadData, customerName: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-black text-slate-900">{viewingLead.customerName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Lead Status</label>
                  <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${viewingLead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {viewingLead.status}
                  </span>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Primary Contact</label>
                  {isEditingLead ? (
                    <input 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      value={editingLeadData.phone || ''}
                      onChange={e => setEditingLeadData({...editingLeadData, phone: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-black text-slate-900">{viewingLead.phone}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp</label>
                  {isEditingLead ? (
                    <input 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                      value={editingLeadData.whatsapp || ''}
                      onChange={e => setEditingLeadData({...editingLeadData, whatsapp: e.target.value})}
                    />
                  ) : (
                    <p className="text-lg font-black text-emerald-600">{viewingLead.whatsapp || 'Not Provided'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery Address</label>
                  {isEditingLead ? (
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 resize-none"
                      rows={3}
                      value={editingLeadData.address || ''}
                      onChange={e => setEditingLeadData({...editingLeadData, address: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed italic">"{viewingLead.address}"</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery State</label>
                  {isEditingLead ? (
                    <select 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 appearance-none"
                      value={editingLeadData.stateName || ''}
                      onChange={e => setEditingLeadData({...editingLeadData, stateName: e.target.value})}
                    >
                      <option value="">Select State...</option>
                      {NIGERIA_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm font-black text-slate-900 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100 uppercase tracking-widest">{viewingLead.stateName || 'Not Specified'}</p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Special Instructions</label>
                  {isEditingLead ? (
                    <textarea 
                      className="w-full bg-slate-50 border-none rounded-xl px-4 py-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 resize-none"
                      rows={3}
                      value={editingLeadData.deliveryInstructions || ''}
                      onChange={e => setEditingLeadData({...editingLeadData, deliveryInstructions: e.target.value})}
                    />
                  ) : (
                    <p className="text-sm font-medium text-slate-500 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed italic">
                      {viewingLead.deliveryInstructions || 'No specific instructions added by customer.'}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Selection Metadata</label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {viewingLead.items.map((item, i) => (
                      <span key={i} className="bg-white border border-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-black uppercase shadow-sm">
                        {item.packageLabel || item.productId.replace(/-/g, ' ')} × {item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estimated Lead Value</label>
                  <p className="text-2xl font-black text-slate-900">₦{viewingLead.items.reduce((acc, item) => acc + calculateItemTotal(item, viewingLead.agentName), 0).toLocaleString()}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100">
                {isEditingLead ? (
                  <div className="flex gap-4">
                    <button 
                      onClick={handleSaveLeadEdit}
                      className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl"
                    >
                      Save Changes
                    </button>
                    <button 
                      onClick={() => setIsEditingLead(false)}
                      className="flex-1 bg-slate-100 text-slate-600 py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-slate-200 transition"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => { copyLeadDetails(viewingLead); setViewingLead(null); }}
                    className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-black transition shadow-xl"
                  >
                    Copy & Close
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showConvertModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-12 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Fulfillment Routing</h2>
            <p className="text-slate-500 text-sm mb-10 font-medium">Confirm converting this lead to an active order.</p>
            <form onSubmit={handleConvert} className="space-y-6">
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
