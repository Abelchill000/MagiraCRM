
import React, { useState, useMemo, useEffect } from 'react';
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
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  
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

  // Subscribe to real-time database changes
  useEffect(() => {
    const unsubscribe = db.subscribe(() => {
      setDbOrders(db.getOrders());
    });
    return unsubscribe;
  }, []);

  const isAdmin = user.role === UserRole.ADMIN;
  const isInventoryManager = user.role === UserRole.INVENTORY_MANAGER;
  const isLogisticsManager = user.role === UserRole.LOGISTICS_MANAGER;
  // ONLY this specific agent gets Admin-level global visibility
  const isSuperAgent = user?.email === 'ijasinijafaru@gmail.com';

  const canManageAllOrders = isAdmin || isSuperAgent || isInventoryManager || isLogisticsManager;

  const orders = useMemo(() => {
    // Managers and Admins see everything
    if (canManageAllOrders) {
      return [...dbOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    // Standard agents only see orders they created (or were converted from their leads)
    return dbOrders
      .filter(o => o.createdBy === user?.name)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dbOrders, isAdmin, isSuperAgent, user?.name]);

  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = newOrder.items?.find(i => i.productId === productId);
    if (existing) return;

    const item: OrderItem = {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      priceAtOrder: product.sellingPrice,
      costAtOrder: product.costPrice
    };
    setNewOrder({ ...newOrder, items: [...(newOrder.items || []), item] });
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

  const handleCreateOrder = async (e: React.FormEvent) => {
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

    await db.createOrder(order);
    setShowCreateModal(false);
    setNewOrder({ items: [], logisticsCost: 0, paymentStatus: PaymentStatus.POD });
  };

  const handleStatusChange = (orderId: string, status: DeliveryStatus) => {
    // Managers and Admins have full status control
    if (!canManageAllOrders && status !== DeliveryStatus.RESCHEDULED) {
      alert("Standard Sales Agents can only change order status to 'Rescheduled'. Contact an Admin/Manager for other changes.");
      return;
    }

    if (status === DeliveryStatus.DELIVERED && canManageAllOrders) {
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
  };

  const copyReceiptText = (order: Order) => {
    const itemsText = order.items.map(i => `• ${i.productName} x${i.quantity} @ ₦${i.priceAtOrder.toLocaleString()}`).join('\n');
    const stateName = states.find(s => s.id === order.stateId)?.name || 'General Network';
    const orderDate = new Date(order.createdAt).toLocaleDateString('en-NG', { dateStyle: 'long' });

    const text = `🌿 MAGIRA OFFICIAL RECEIPT
----------------------------
📅 Date: ${orderDate}
🆔 Order ID: ${order.id}
👤 Processed By: ${order.createdBy}
----------------------------
📝 CUSTOMER DETAILS
Name: ${order.customerName}
Phone: ${order.phone}
${order.whatsapp ? `WhatsApp: ${order.whatsapp}\n` : ''}Region: ${stateName}
Address: ${order.address}
----------------------------
📦 ORDER ITEMS
${itemsText}
----------------------------
💰 FINANCIAL SUMMARY
Total Amount: ₦${order.totalAmount.toLocaleString()}
Payment Mode: ${order.paymentStatus}
Status: ${order.deliveryStatus}
----------------------------
📍 TRACKING & NOTES
Tracking ID: ${order.trackingId}
${order.deliveryInstructions ? `Instructions: ${order.deliveryInstructions}\n` : ''}
Thank you for choosing Magira. 
Stay Healthy, Stay Energized!`.trim();

    navigator.clipboard.writeText(text);
    alert('Professional receipt copied to clipboard!');
  };

  const shareWhatsApp = (order: Order) => {
    const targetPhone = order.whatsapp || order.phone;
    const text = `Hello ${order.customerName}, your Magira order ${order.id} is currently ${order.deliveryStatus}. \n\nTracking ID: ${order.trackingId}\nTotal: ₦${order.totalAmount.toLocaleString()}\n\nThank you for choosing Magira!`;
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
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            Order Management
            {(canManageAllOrders && !isAdmin) && (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">Manager Mode</span>
            )}
          </h1>
          <p className="text-slate-500 text-sm font-medium">
            {canManageAllOrders ? 'Global order tracking console.' : 'Tracking orders processed by your sales account.'}
          </p>
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
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Order Details</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Customer Info</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Pricing</th>
                <th className="px-6 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium">No orders in database.</td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order.id} className={`hover:bg-slate-50/50 transition-all ${order.deliveryStatus === DeliveryStatus.CANCELLED ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <span className="font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px]">{order.id}</span>
                      <p className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-tighter">TRK: {order.trackingId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">{order.customerName}</p>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        <p className="text-[10px] text-slate-500 font-bold">📞 {order.phone}</p>
                        {order.whatsapp && <p className="text-[10px] text-emerald-600 font-black">📲 {order.whatsapp}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select 
                        value={order.deliveryStatus} 
                        onChange={(e) => handleStatusChange(order.id, e.target.value as DeliveryStatus)}
                        className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${getStatusColor(order.deliveryStatus)}`}
                      >
                        {Object.values(DeliveryStatus).map(s => {
                          if (!canManageAllOrders && s !== DeliveryStatus.RESCHEDULED && s !== order.deliveryStatus) return null;
                          return <option key={s} value={s}>{s}</option>;
                        })}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-800">₦{order.totalAmount.toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-1">
                        <button onClick={() => setViewingOrder(order)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="View Details">👁️</button>
                        <button onClick={() => copyReceiptText(order)} className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="Copy Receipt">📄</button>
                        <button onClick={() => shareWhatsApp(order)} className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" title="WhatsApp Customer">📲</button>
                        {(canManageAllOrders) && (
                          <button onClick={() => { if(window.confirm('Delete order?')) {} }} className="p-2 text-slate-200 hover:text-red-600 rounded-lg transition-all">🗑️</button>
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

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-3xl border-2 border-dashed border-slate-100 text-slate-400 font-medium">
            No active orders.
          </div>
        ) : (
          orders.map(order => (
            <div key={order.id} className={`bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col space-y-4 ${order.deliveryStatus === DeliveryStatus.CANCELLED ? 'opacity-50' : ''}`}>
              <div className="flex justify-between items-start">
                <div onClick={() => setViewingOrder(order)} className="cursor-pointer">
                  <span className="text-[10px] font-mono font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">ID: {order.id}</span>
                  <p className="mt-2 font-black text-slate-800 text-lg flex items-center gap-2">{order.customerName} <span className="text-xs">👁️</span></p>
                  <p className="text-xs text-slate-500 font-bold">📞 {order.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-slate-900">₦{order.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-50">
                <select 
                  value={order.deliveryStatus} 
                  onChange={(e) => handleStatusChange(order.id, e.target.value as DeliveryStatus)}
                  className={`text-[10px] font-black uppercase px-4 py-2 rounded-xl border-none focus:ring-0 cursor-pointer w-40 ${getStatusColor(order.deliveryStatus)}`}
                >
                  {Object.values(DeliveryStatus).map(s => {
                    if (!canManageAllOrders && s !== DeliveryStatus.RESCHEDULED && s !== order.deliveryStatus) return null;
                    return <option key={s} value={s}>{s}</option>;
                  })}
                </select>

                <div className="flex gap-2">
                  <button onClick={() => copyReceiptText(order)} className="p-2.5 bg-slate-50 rounded-xl text-slate-500 transition">📄</button>
                  <button onClick={() => shareWhatsApp(order)} className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 transition">📲</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Detail Modal */}
      {viewingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Order Fulfillment Profile</h2>
              <button onClick={() => setViewingOrder(null)} className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer Name</label>
                  <p className="text-lg font-black text-slate-900">{viewingOrder.customerName}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tracking ID</label>
                  <p className="text-xs font-mono font-black text-emerald-600 tracking-wider uppercase">{viewingOrder.trackingId}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Contact Phone</label>
                  <p className="text-lg font-black text-slate-900">{viewingOrder.phone}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp Hub</label>
                  <p className="text-lg font-black text-emerald-600">{viewingOrder.whatsapp || 'N/A'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery Hub / State</label>
                  <p className="text-sm font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-xl inline-block">
                    {states.find(s => s.id === viewingOrder.stateId || s.name === viewingOrder.stateId)?.name || 'General Network'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Full Physical Address</label>
                  <p className="text-sm font-bold text-slate-700 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed italic">"{viewingOrder.address}"</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Delivery Directives</label>
                  <p className="text-sm font-medium text-slate-500 bg-slate-50 p-6 rounded-2xl border border-slate-100 leading-relaxed italic">
                    {viewingOrder.deliveryInstructions || 'No custom directives provided.'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Package Details</label>
                  <div className="mt-3 space-y-2">
                    {viewingOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
                        <span className="text-xs font-black uppercase text-slate-800">{item.productName} × {item.quantity}</span>
                        <span className="text-xs font-black text-slate-500">₦{(item.priceAtOrder * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <span className="text-xs font-black text-slate-400 uppercase">Grand Total</span>
                      <span className="text-xl font-black text-slate-900">₦{viewingOrder.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-6 border-t border-slate-100 flex gap-4">
                <button 
                  onClick={() => { copyReceiptText(viewingOrder); }}
                  className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl"
                >
                  Copy Receipt
                </button>
                <button 
                  onClick={() => { shareWhatsApp(viewingOrder); }}
                  className="flex-1 bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-black transition shadow-xl"
                >
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Apply Reschedule</h2>
            <p className="text-slate-500 text-sm mb-6 font-medium">Set a new target delivery date and add context.</p>
            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">New Delivery Date</label>
                <input 
                  required type="date"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 font-bold"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Internal Notes</label>
                <textarea 
                  required placeholder="Why was this order moved? e.g. Customer requested delay"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 text-sm font-medium"
                  rows={3}
                  value={rescheduleData.notes}
                  onChange={(e) => setRescheduleData({...rescheduleData, notes: e.target.value})}
                />
              </div>
              <button type="submit" className="w-full bg-amber-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-amber-100 hover:bg-amber-700 transition active:scale-[0.98]">
                Update Reschedule Schedule
              </button>
              <button type="button" onClick={() => setShowRescheduleModal(null)} className="w-full py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600">
                Cancel Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Logistics Cost Modal */}
      {showLogisticsPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
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

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 z-50">
          <div className="bg-white md:rounded-[2.5rem] w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full md:h-[85vh]">
            <div className="md:hidden p-5 border-b flex justify-between items-center shrink-0 bg-slate-50">
              <h2 className="font-black text-slate-800 uppercase tracking-tight">Manual Order Intake</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 p-2 text-xl font-black">✕</button>
            </div>

            <div className="flex-1 p-6 md:p-10 overflow-y-auto border-r border-slate-100 flex flex-col">
              <div className="mb-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">1. Customer Identification</h3>
                <form id="order-main-form" onSubmit={handleCreateOrder} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                    <input required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 font-medium" onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Voice Phone</label>
                    <input required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 font-medium" onChange={e => setNewOrder({...newOrder, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">WhatsApp Line</label>
                    <input className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 font-medium" onChange={e => setNewOrder({...newOrder, whatsapp: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Destination Hub</label>
                    <select required className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 appearance-none font-medium" onChange={e => setNewOrder({...newOrder, stateId: e.target.value})}>
                      <option value="">Choose Region...</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Street / Delivery Address</label>
                    <textarea required rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 font-medium" onChange={e => setNewOrder({...newOrder, address: e.target.value})} />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Special Logistics Notes</label>
                    <textarea rows={2} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 font-medium italic" placeholder="e.g. Leave at front desk..." onChange={e => setNewOrder({...newOrder, deliveryInstructions: e.target.value})} />
                  </div>
                </form>
              </div>

              <div className="flex-1 border-t border-slate-100 pt-8">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">2. Selection Overview</h3>
                <div className="space-y-4">
                  {newOrder.items?.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                      <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Selection is empty.<br/>Browse the catalog to add items.</p>
                    </div>
                  ) : (
                    newOrder.items?.map(item => (
                      <div key={item.productId} className="flex items-center justify-between bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-emerald-200 transition-all group">
                        <div className="flex-1">
                          <p className="text-sm font-black text-slate-800">{item.productName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase">Unit: ₦{item.priceAtOrder.toLocaleString()}</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-center">
                            <label className="text-[8px] font-black text-slate-300 uppercase mb-1">Quantity</label>
                            <input 
                              type="number" 
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItemQuantity(item.productId, parseInt(e.target.value) || 1)}
                              className="w-20 bg-slate-50 border-none rounded-lg px-2 py-2 text-center text-sm font-black focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <div className="text-right w-24">
                            <p className="text-[8px] font-black text-slate-300 uppercase mb-1">Subtotal</p>
                            <p className="text-sm font-black text-slate-900">₦{(item.priceAtOrder * item.quantity).toLocaleString()}</p>
                          </div>
                          <button 
                            onClick={() => handleRemoveItem(item.productId)}
                            className="p-2 text-slate-200 hover:text-red-500 transition-colors active:scale-90"
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

              <div className="hidden md:flex pt-10 justify-between items-center border-t border-slate-100 mt-auto">
                 <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-slate-600 transition">Discard Draft</button>
                 <button 
                   type="submit" 
                   form="order-main-form"
                   disabled={!newOrder.items?.length} 
                   className={`px-12 py-5 rounded-2xl font-black text-sm transition-all shadow-2xl ${!newOrder.items?.length ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-[0.98]'}`}
                 >
                   Process Order Execution
                 </button>
              </div>
            </div>

            {/* Catalog Panel */}
            <div className="w-full md:w-[26rem] bg-slate-900 p-8 flex flex-col shrink-0 h-[450px] md:h-auto overflow-hidden text-white relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-bl-full pointer-events-none"></div>
              
              <div className="flex items-center justify-between mb-8 shrink-0 relative z-10">
                <h3 className="font-black text-xs uppercase tracking-[0.3em] text-white/40">Product Catalog</h3>
                <span className="text-[10px] text-emerald-400 font-black bg-emerald-500/10 px-3 py-1.5 rounded-full uppercase">Real-time Stock</span>
              </div>
              
              <div className="grid grid-cols-1 gap-3 flex-1 overflow-y-auto mb-10 pr-2 no-scrollbar relative z-10">
                {products.map(p => {
                  const isInCart = newOrder.items?.some(i => i.productId === p.id);
                  return (
                    <button 
                      key={p.id}
                      onClick={() => handleAddItem(p.id)}
                      disabled={isInCart}
                      className={`w-full text-left p-5 rounded-2xl transition-all border flex justify-between items-center group shrink-0 ${
                        isInCart 
                          ? 'bg-emerald-500/10 border-emerald-500/30 opacity-60 cursor-default' 
                          : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20 active:scale-[0.97]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-black truncate transition-colors ${isInCart ? 'text-emerald-400' : 'text-white'}`}>{p.name}</p>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">Price Point: ₦{p.sellingPrice.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                         {isInCart ? (
                           <span className="text-emerald-400 text-xl font-black">✓</span>
                         ) : (
                           <span className="text-white/10 group-hover:text-white group-hover:scale-125 transition-all text-2xl font-black">＋</span>
                         )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 pt-8 shrink-0 relative z-10">
                <div className="flex justify-between items-end">
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-2">Calculated Total</p>
                    <p className="text-4xl font-black text-white tracking-tighter">
                      ₦{newOrder.items?.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0).toLocaleString() || 0}
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    form="order-main-form"
                    className="md:hidden bg-emerald-600 text-white px-10 py-5 rounded-2xl font-black text-sm shadow-xl shadow-emerald-950/40 active:scale-95 transition"
                  >
                    Execute Order
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
