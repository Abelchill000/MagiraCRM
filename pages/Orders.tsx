
import React, { useState, useMemo } from 'react';
import { db } from '../services/mockDb.ts';
import { 
  Order, OrderItem, PaymentStatus, DeliveryStatus, 
  Product, UserRole, User 
} from '../types.ts';

interface OrdersProps {
  user: User;
}

const Orders: React.FC<OrdersProps> = ({ user }) => {
  const [dbOrders, setDbOrders] = useState<Order[]>(db.getOrders());
  const [products] = useState(db.getProducts());
  const [states] = useState(db.getStates());
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const [showLogisticsPrompt, setShowLogisticsPrompt] = useState<{orderId: string, status: DeliveryStatus} | null>(null);
  const [tempLogisticsCost, setTempLogisticsCost] = useState<number>(0);

  const [showRescheduleModal, setShowRescheduleModal] = useState<{orderId: string} | null>(null);
  const [rescheduleData, setRescheduleData] = useState({ date: '', notes: '', reminder: true });

  const [newOrder, setNewOrder] = useState<Partial<Order>>({
    items: [],
    logisticsCost: 0,
    paymentStatus: PaymentStatus.POD,
    deliveryStatus: DeliveryStatus.PENDING
  });

  const isAdmin = user.role === UserRole.ADMIN;
  const isAgent = user.role === UserRole.SALES_AGENT;

  const orders = useMemo(() => {
    if (isAdmin) return dbOrders;
    return dbOrders.filter(o => o.createdBy === user.name);
  }, [dbOrders, isAdmin, user.name]);

  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = newOrder.items?.find(i => i.productId === productId);
    if (existing) {
      // If it exists, we just let the user edit the quantity in the list
      return;
    } else {
      const item: OrderItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        priceAtOrder: product.sellingPrice,
        costAtOrder: product.costPrice
      };
      setNewOrder({ ...newOrder, items: [...(newOrder.items || []), item] });
    }
  };

  const handleUpdateItemQuantity = (productId: string, qty: number) => {
    const updated = newOrder.items?.map(i => 
      i.productId === productId ? { ...i, quantity: Math.max(1, qty) } : i
    );
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleRemoveItem = (productId: string) => {
    const updated = newOrder.items?.filter(i => i.productId !== productId);
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.items?.length) {
      alert("Please add at least one item to the selection.");
      return;
    }

    const total = newOrder.items.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0);
    const order: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      trackingId: 'MAG-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      customerName: newOrder.customerName || '',
      phone: newOrder.phone || '',
      whatsapp: newOrder.whatsapp || '',
      address: newOrder.address || '',
      deliveryInstructions: newOrder.deliveryInstructions || '',
      stateId: newOrder.stateId || '',
      items: newOrder.items,
      totalAmount: total,
      logisticsCost: 0,
      paymentStatus: newOrder.paymentStatus || PaymentStatus.POD,
      deliveryStatus: DeliveryStatus.PENDING,
      createdAt: new Date().toISOString(),
      createdBy: user.name || 'System'
    };

    db.createOrder(order);
    setDbOrders(db.getOrders());
    setShowCreateModal(false);
    setNewOrder({ items: [], logisticsCost: 0, paymentStatus: PaymentStatus.POD });
  };

  const handleStatusChange = (orderId: string, status: DeliveryStatus) => {
    if (isAgent && status !== DeliveryStatus.RESCHEDULED) {
      alert("Sales Agents can only change order status to 'Rescheduled'. Contact an Admin for other changes.");
      return;
    }

    if (status === DeliveryStatus.DELIVERED && isAdmin) {
      setShowLogisticsPrompt({ orderId, status });
      setTempLogisticsCost(0);
    } else if (status === DeliveryStatus.RESCHEDULED) {
      setShowRescheduleModal({ orderId });
      setRescheduleData({ date: '', notes: '', reminder: true });
    } else if (status === DeliveryStatus.CANCELLED) {
      if (window.confirm("Are you sure you want to cancel this order? Stock will be returned if previously marked delivered.")) {
        updateStatus(orderId, status);
      }
    } else {
      updateStatus(orderId, status);
    }
  };

  const handleLogisticsSubmit = () => {
    if (showLogisticsPrompt) {
      updateStatus(showLogisticsPrompt.orderId, showLogisticsPrompt.status, { logisticsCost: tempLogisticsCost });
      setShowLogisticsPrompt(null);
    }
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showRescheduleModal) {
      updateStatus(showRescheduleModal.orderId, DeliveryStatus.RESCHEDULED, {
        rescheduleDate: rescheduleData.date,
        rescheduleNotes: rescheduleData.notes,
        reminderEnabled: rescheduleData.reminder
      });
      setShowRescheduleModal(null);
    }
  };

  const updateStatus = (orderId: string, status: DeliveryStatus, extra?: any) => {
    db.updateOrderStatus(orderId, status, extra);
    setDbOrders([...db.getOrders()]);
  };

  const copyReceiptText = (order: Order) => {
    const itemsText = order.items.map(i => `${i.productName} x${i.quantity} @ ₦${i.priceAtOrder.toLocaleString()}`).join('\n');
    const text = `📜 MAGIRA RECEIPT
Order ID: ${order.id}
Customer: ${order.customerName}
Phone: ${order.phone}
${order.whatsapp ? `WhatsApp: ${order.whatsapp}\n` : ''}Address: ${order.address}
---
Items:
${itemsText}
---
${order.deliveryInstructions ? `Special Instructions: ${order.deliveryInstructions}\n---\n` : ''}Total: ₦${order.totalAmount.toLocaleString()}
Payment: ${order.paymentStatus}
Tracking: ${order.trackingId}`.trim();
    navigator.clipboard.writeText(text);
    alert('Receipt copied to clipboard!');
  };

  const shareWhatsApp = (order: Order) => {
    const targetPhone = order.whatsapp || order.phone;
    const text = `Hello ${order.customerName}, your Magira order ${order.id} is ${order.deliveryStatus}. Tracking: ${order.trackingId}. Total: ₦${order.totalAmount}`;
    const url = `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const getStatusColor = (status: DeliveryStatus) => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Order Management</h1>
          <p className="text-slate-500 text-sm">Track shipments, payments, and customer deliveries.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 transition"
        >
          + New Order
        </button>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Instructions</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No orders found.</td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className={`hover:bg-slate-50/50 transition ${order.deliveryStatus === DeliveryStatus.CANCELLED ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono font-bold text-emerald-600">{order.id}</span>
                      <p className="text-[10px] text-slate-400 mt-1">TRK: {order.trackingId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{order.customerName}</p>
                      <div className="flex flex-col gap-0.5">
                        <p className="text-[10px] text-slate-500 font-bold">📞 {order.phone}</p>
                        {order.whatsapp && <p className="text-[10px] text-emerald-600 font-bold">📲 {order.whatsapp}</p>}
                      </div>
                      {order.deliveryStatus === DeliveryStatus.RESCHEDULED && order.rescheduleDate && (
                        <p className="text-[10px] text-amber-600 font-bold mt-1">📅 Rescheduled: {order.rescheduleDate}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.deliveryStatus} 
                        onChange={(e) => handleStatusChange(order.id, e.target.value as DeliveryStatus)}
                        className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${getStatusColor(order.deliveryStatus)}`}
                      >
                        {Object.values(DeliveryStatus).map(s => {
                          if (isAgent && s !== DeliveryStatus.RESCHEDULED && s !== order.deliveryStatus) return null;
                          return <option key={s} value={s}>{s}</option>;
                        })}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">₦{order.totalAmount.toLocaleString()}</p>
                      {order.deliveryStatus === DeliveryStatus.DELIVERED && order.logisticsCost > 0 && (
                        <p className="text-[10px] text-red-500 font-bold">-{order.logisticsCost.toLocaleString()} logistics</p>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-[10px] text-slate-400 italic line-clamp-2">
                        {order.deliveryInstructions || 'None'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => copyReceiptText(order)} className="p-2 text-slate-400 hover:text-emerald-600" title="Copy Receipt">📄</button>
                        <button onClick={() => shareWhatsApp(order)} className="p-2 text-slate-400 hover:text-emerald-600" title="WhatsApp Customer">📲</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400">
            No orders found.
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col space-y-4 ${order.deliveryStatus === DeliveryStatus.CANCELLED ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">ID: {order.id}</span>
                  <p className="mt-1 font-bold text-slate-800">{order.customerName}</p>
                  <p className="text-xs text-slate-500">📞 {order.phone}</p>
                  {order.whatsapp && <p className="text-xs text-emerald-600 font-bold">📲 {order.whatsapp}</p>}
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">₦{order.totalAmount.toLocaleString()}</p>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Total</span>
                </div>
              </div>

              {order.deliveryInstructions && (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Instruction</p>
                  <p className="text-[11px] text-slate-600 leading-tight italic">"{order.deliveryInstructions}"</p>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-50">
                <select 
                  value={order.deliveryStatus} 
                  onChange={(e) => handleStatusChange(order.id, e.target.value as DeliveryStatus)}
                  className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl border-none focus:ring-0 cursor-pointer w-32 ${getStatusColor(order.deliveryStatus)}`}
                >
                  {Object.values(DeliveryStatus).map(s => {
                    if (isAgent && s !== DeliveryStatus.RESCHEDULED && s !== order.deliveryStatus) return null;
                    return <option key={s} value={s}>{s}</option>;
                  })}
                </select>

                <div className="flex gap-2">
                  <button onClick={() => copyReceiptText(order)} className="p-2 bg-slate-50 rounded-lg text-slate-500">📄</button>
                  <button onClick={() => shareWhatsApp(order)} className="p-2 bg-emerald-50 rounded-lg text-emerald-600">📲</button>
                </div>
              </div>

              {order.deliveryStatus === DeliveryStatus.RESCHEDULED && order.rescheduleDate && (
                <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                  <p className="text-[10px] text-amber-800 font-bold uppercase mb-1">📅 Rescheduled For:</p>
                  <p className="text-xs text-amber-900 font-medium">{order.rescheduleDate}</p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Reschedule</h2>
            <p className="text-slate-500 text-sm mb-6">Set a new delivery date.</p>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Date</label>
                <input 
                  required type="date"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                />
              </div>
              <textarea 
                required placeholder="Instructions..."
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 text-sm"
                rows={3}
                value={rescheduleData.notes}
                onChange={(e) => setRescheduleData({...rescheduleData, notes: e.target.value})}
              />
              <button type="submit" className="w-full bg-amber-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-amber-100 transition">
                Apply Reschedule
              </button>
              <button type="button" onClick={() => setShowRescheduleModal(null)} className="w-full py-2 text-slate-400 font-bold text-sm">
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Logistics Cost Modal */}
      {showLogisticsPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2 text-center sm:text-left">Logistics Cost</h2>
            <p className="text-slate-500 text-sm mb-6 text-center sm:text-left">Enter shipping cost for this delivery.</p>
            <div className="space-y-4">
              <input 
                type="number" autoFocus
                className="w-full bg-slate-50 border-none rounded-xl px-4 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-lg text-center sm:text-left" 
                value={tempLogisticsCost}
                onChange={(e) => setTempLogisticsCost(Number(e.target.value))}
                placeholder="0"
              />
              <div className="flex flex-col gap-2">
                <button onClick={handleLogisticsSubmit} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold">Confirm Delivered</button>
                <button onClick={() => setShowLogisticsPrompt(null)} className="w-full py-2 text-slate-400 font-bold text-sm">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white md:rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full md:h-[85vh]">
            {/* Header Mobile Only */}
            <div className="md:hidden p-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-black text-slate-800">New Order Entry</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 p-2 text-xl">✕</button>
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100 flex flex-col">
              <div className="mb-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Customer Details</h3>
                <form id="order-main-form" onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Customer Name</label>
                    <input required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                    <input required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">WhatsApp Number</label>
                    <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, whatsapp: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Target Hub (State)</label>
                    <select required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 appearance-none" onChange={e => setNewOrder({...newOrder, stateId: e.target.value})}>
                      <option value="">Select State</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Delivery Address</label>
                    <textarea required rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, address: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Delivery Instructions</label>
                    <textarea rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500" placeholder="e.g. Call before arrival..." onChange={e => setNewOrder({...newOrder, deliveryInstructions: e.target.value})} />
                  </div>
                </form>
              </div>

              {/* Dynamic Selection List (CART) */}
              <div className="flex-1 border-t border-slate-100 pt-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Selection Overview</h3>
                <div className="space-y-3">
                  {newOrder.items?.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                      <p className="text-slate-400 text-xs font-bold">Your cart is currently empty.<br/>Add products from the catalog on the right.</p>
                    </div>
                  ) : (
                    newOrder.items?.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:border-emerald-200 transition-all group">
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800">{item.productName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">₦{item.priceAtOrder.toLocaleString()} per unit</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <label className="text-[8px] font-black text-slate-300 uppercase mb-1">Quantity</label>
                            <input 
                              type="number" 
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-20 bg-slate-50 border-none rounded-lg px-2 py-1.5 text-center text-sm font-bold focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="text-right w-24">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Subtotal</p>
                            <p className="text-sm font-black text-slate-900">₦{(item.priceAtOrder * item.quantity).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="hidden md:flex pt-8 justify-between items-center border-t border-slate-100 mt-auto">
                 <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 font-bold text-xs uppercase hover:text-slate-600 transition">Cancel Order</button>
                 <button 
                   type="submit" 
                   form="order-main-form"
                   disabled={!newOrder.items?.length} 
                   className={`px-10 py-4 rounded-2xl font-black text-sm transition-all shadow-xl ${!newOrder.items?.length ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02]'}`}
                 >
                   Commit & Generate Order
                 </button>
              </div>
            </div>

            {/* Catalog Panel */}
            <div className="w-full md:w-96 bg-slate-900 p-6 flex flex-col shrink-0 h-[450px] md:h-auto overflow-hidden text-white">
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white/40">Item Catalog</h3>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded">Live Stock</span>
              </div>
              
              <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto mb-8 pr-2 no-scrollbar">
                {products.map(p => {
                  const isInCart = newOrder.items?.some(i => i.productId === p.id);
                  return (
                    <button 
                      key={p.id}
                      onClick={() => handleAddItem(p.id)}
                      disabled={isInCart}
                      className={`w-full text-left p-4 rounded-2xl transition-all border flex justify-between items-center group shrink-0 ${
                        isInCart 
                          ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60 cursor-default' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-black truncate ${isInCart ? 'text-emerald-400' : 'text-white'}`}>{p.name}</p>
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-0.5">₦{p.sellingPrice.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         {isInCart ? (
                           <span className="text-emerald-400 text-lg">✓</span>
                         ) : (
                           <span className="text-white/20 group-hover:text-white group-hover:scale-125 transition-all text-xl">＋</span>
                         )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-6 shrink-0">
                <div className="flex justify-between items-end">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Grand Total</p>
                    <p className="text-3xl font-black text-white mt-1">
                      ₦{newOrder.items?.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0).toLocaleString() || 0}
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    form="order-main-form"
                    className="md:hidden bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-sm shadow-xl shadow-emerald-950/20 active:scale-95 transition"
                  >
                    Commit Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
