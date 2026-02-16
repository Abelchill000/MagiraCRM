
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

  // Filter orders: Admins see all, others only see their own
  const orders = useMemo(() => {
    if (isAdmin) return dbOrders;
    return dbOrders.filter(o => o.createdBy === user.name);
  }, [dbOrders, isAdmin, user.name]);

  const handleAddItem = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existing = newOrder.items?.find(i => i.productId === productId);
    if (existing) {
      const updated = newOrder.items?.map(i => 
        i.productId === productId ? { ...i, quantity: i.quantity + 1 } : i
      );
      setNewOrder({ ...newOrder, items: updated });
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

  const handleUpdateItemPrice = (productId: string, newPrice: number) => {
    const updated = newOrder.items?.map(i => 
      i.productId === productId ? { ...i, priceAtOrder: newPrice } : i
    );
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleRemoveItem = (productId: string) => {
    const updated = newOrder.items?.filter(i => i.productId !== productId);
    setNewOrder({ ...newOrder, items: updated });
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrder.items?.length) return;

    const total = newOrder.items.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0);
    const order: Order = {
      id: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      trackingId: 'MAG-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
      customerName: newOrder.customerName || '',
      phone: newOrder.phone || '',
      address: newOrder.address || '',
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
    const text = `📜 MAGIRA RECEIPT\nOrder ID: ${order.id}\nCustomer: ${order.customerName}\nPhone: ${order.phone}\nAddress: ${order.address}\n---\nItems:\n${itemsText}\n---\nTotal: ₦${order.totalAmount.toLocaleString()}\nPayment: ${order.paymentStatus}\nTracking: ${order.trackingId}`.trim();
    navigator.clipboard.writeText(text);
    alert('Receipt copied to clipboard!');
  };

  const shareWhatsApp = (order: Order) => {
    const text = `Hello ${order.customerName}, your Magira order ${order.id} is ${order.deliveryStatus}. Tracking: ${order.trackingId}. Total: ₦${order.totalAmount}`;
    const url = `https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
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
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">No orders found.</td>
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
                      <p className="text-xs text-slate-500">{order.phone}</p>
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
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => copyReceiptText(order)} className="p-2 text-slate-400 hover:text-emerald-600">📄</button>
                        <button onClick={() => shareWhatsApp(order)} className="p-2 text-slate-400 hover:text-green-500">📲</button>
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
                  <p className="text-xs text-slate-500">{order.phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-slate-900">₦{order.totalAmount.toLocaleString()}</p>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Total</span>
                </div>
              </div>

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
          <div className="bg-white md:rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-full md:h-[85vh]">
            {/* Header Mobile Only */}
            <div className="md:hidden p-4 border-b flex justify-between items-center shrink-0">
              <h2 className="font-black text-slate-800">New Order</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 p-2">✕</button>
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-y-auto border-r border-slate-100">
              <form onSubmit={handleCreateOrder} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                    <input required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-3" onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                    <input required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-3" onChange={e => setNewOrder({...newOrder, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">State</label>
                    <select required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-3" onChange={e => setNewOrder({...newOrder, stateId: e.target.value})}>
                      <option value="">-- Select --</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Address</label>
                    <textarea required rows={2} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-3" onChange={e => setNewOrder({...newOrder, address: e.target.value})} />
                  </div>
                </div>
                
                <div className="hidden md:flex pt-4 border-t border-slate-100 justify-between items-center">
                   <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 font-medium">Cancel</button>
                   <button type="submit" disabled={!newOrder.items?.length} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold">
                    Generate Order
                   </button>
                </div>
              </form>
            </div>

            <div className="w-full md:w-96 bg-slate-50 p-6 flex flex-col border-l border-slate-200 shrink-0 h-[400px] md:h-auto overflow-hidden">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between shrink-0">
                <span>Catalog</span>
                <span className="text-[10px] text-slate-400 uppercase font-black">Tap to Add</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-1 gap-2 flex-1 overflow-y-auto mb-6 pr-1">
                {products.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleAddItem(p.id)}
                    className="w-full text-left bg-white border border-slate-200 p-3 rounded-xl hover:border-emerald-500 flex justify-between items-center group shrink-0"
                  >
                    <div>
                      <p className="text-[11px] font-bold text-slate-800 line-clamp-1">{p.name}</p>
                      <p className="text-[10px] text-emerald-600 font-black">₦{p.sellingPrice.toLocaleString()}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-4 shrink-0 bg-slate-50">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cart Total</p>
                    <p className="text-xl font-black text-slate-900 mt-1">
                      ₦{newOrder.items?.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0).toLocaleString() || 0}
                    </p>
                  </div>
                  <button 
                    type="submit" 
                    onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }))}
                    className="md:hidden bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-sm"
                  >
                    Generate Order
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
