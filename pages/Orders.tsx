
import React, { useState, useMemo } from 'react';
import { db } from '../services/mockDb';
import { 
  Order, OrderItem, PaymentStatus, DeliveryStatus, 
  Product, UserRole, User 
} from '../types';

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
    // Enforcement: Sales Agents can ONLY change to Rescheduled
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
    const text = `
📜 MAGIRA RECEIPT
Order ID: ${order.id}
Customer: ${order.customerName}
Phone: ${order.phone}
Address: ${order.address}
---
Items:
${itemsText}
---
Total: ₦${order.totalAmount.toLocaleString()}
Payment: ${order.paymentStatus}
Tracking: ${order.trackingId}
    `.trim();
    
    navigator.clipboard.writeText(text);
    alert('Receipt copied to clipboard!');
  };

  const shareWhatsApp = (order: Order) => {
    const text = `Hello ${order.customerName}, your Magira order ${order.id} is ${order.deliveryStatus}. Tracking: ${order.trackingId}. Total: ₦${order.totalAmount}`;
    const url = `https://wa.me/${order.phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Order Management</h1>
          <p className="text-slate-500">Track shipments, payments, and customer deliveries.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition"
        >
          + New Order
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
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
                        className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-0 cursor-pointer ${
                          order.deliveryStatus === DeliveryStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700' :
                          order.deliveryStatus === DeliveryStatus.FAILED ? 'bg-red-100 text-red-700' :
                          order.deliveryStatus === DeliveryStatus.CANCELLED ? 'bg-slate-200 text-slate-600' :
                          order.deliveryStatus === DeliveryStatus.RESCHEDULED ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {Object.values(DeliveryStatus).map(s => {
                          // Filter options for Agent: They can see current, but only pick Rescheduled if it isn't already
                          if (isAgent && s !== DeliveryStatus.RESCHEDULED && s !== order.deliveryStatus) return null;
                          return <option key={s} value={s}>{s}</option>;
                        })}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800">₦{order.totalAmount.toLocaleString()}</p>
                      {order.deliveryStatus === DeliveryStatus.DELIVERED && order.logisticsCost > 0 && (
                        <p className="text-[10px] text-red-500 font-bold">-{order.logisticsCost.toLocaleString()} logistics deduction</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <button onClick={() => copyReceiptText(order)} className="p-2 text-slate-400 hover:text-emerald-600" title="Copy Receipt">📄</button>
                        <button onClick={() => shareWhatsApp(order)} className="p-2 text-slate-400 hover:text-green-500" title="WhatsApp Share">📲</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Reschedule Delivery</h2>
            <p className="text-slate-500 text-sm mb-6">Set a new delivery date and capture specific customer instructions.</p>
            
            <form onSubmit={handleRescheduleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Reschedule Date</label>
                <input 
                  required
                  type="date"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 transition-all font-bold"
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({...rescheduleData, date: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Customer Instructions</label>
                <textarea 
                  required
                  placeholder="e.g. Deliver only in the evening after 6pm..."
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-amber-500 transition-all text-sm"
                  rows={3}
                  value={rescheduleData.notes}
                  onChange={(e) => setRescheduleData({...rescheduleData, notes: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-3 bg-amber-50 p-4 rounded-xl border border-amber-100">
                <input 
                  type="checkbox"
                  id="reminder"
                  className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-slate-300 rounded"
                  checked={rescheduleData.reminder}
                  onChange={(e) => setRescheduleData({...rescheduleData, reminder: e.target.checked})}
                />
                <label htmlFor="reminder" className="text-xs font-bold text-amber-800">Remind me on this date</label>
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button type="submit" className="w-full bg-amber-600 hover:bg-amber-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-amber-100 transition-all">
                  Apply Reschedule
                </button>
                <button type="button" onClick={() => setShowRescheduleModal(null)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Logistics Cost Modal */}
      {showLogisticsPrompt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Confirm Delivery</h2>
            <p className="text-slate-500 text-sm mb-6">Enter the logistics cost for this delivery. This will be deducted from revenue calculations.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5">Logistics Cost (₦)</label>
                <input 
                  type="number" 
                  autoFocus
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 transition-all font-bold text-lg" 
                  value={tempLogisticsCost}
                  onChange={(e) => setTempLogisticsCost(Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="flex flex-col gap-3 pt-4">
                <button 
                  onClick={handleLogisticsSubmit}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 transition-all"
                >
                  Finalize Delivery
                </button>
                <button 
                  onClick={() => setShowLogisticsPrompt(null)} 
                  className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[85vh]">
            <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Create New Order</h2>
              <form onSubmit={handleCreateOrder} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Customer Name</label>
                    <input required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, customerName: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                    <input required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">State</label>
                    <select required className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, stateId: e.target.value})}>
                      <option value="">-- Select State --</option>
                      {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700">Delivery Address</label>
                    <textarea required rows={2} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, address: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Payment Status</label>
                    <select className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500" onChange={e => setNewOrder({...newOrder, paymentStatus: e.target.value as PaymentStatus})}>
                      {Object.values(PaymentStatus).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                   <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 font-medium hover:text-slate-600 transition">Cancel</button>
                   <button type="submit" disabled={!newOrder.items?.length} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-bold transition disabled:opacity-50 shadow-lg shadow-emerald-100">
                    Generate Order
                   </button>
                </div>
              </form>
            </div>

            <div className="w-full md:w-96 bg-slate-50 p-6 flex flex-col border-l border-slate-200">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                <span>Product Catalog</span>
                <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Click to Add</span>
              </h3>
              <div className="grid grid-cols-1 gap-2 flex-1 overflow-y-auto mb-6 pr-1">
                {products.map(p => (
                  <button 
                    key={p.id}
                    onClick={() => handleAddItem(p.id)}
                    className="w-full text-left bg-white border border-slate-200 p-3 rounded-xl hover:border-emerald-500 hover:shadow-sm transition group relative flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-emerald-600 font-black">₦{p.sellingPrice.toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 rounded-lg w-6 h-6 flex items-center justify-center text-xs font-bold group-hover:bg-emerald-600 group-hover:text-white transition-colors">+</div>
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-200 pt-6">
                <h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Selected Cart Items</h3>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {newOrder.items?.map(item => (
                    <div key={item.productId} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm animate-in fade-in slide-in-from-right-2 duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[11px] font-bold text-slate-700 truncate flex-1">{item.productName}</span>
                        <button onClick={() => handleRemoveItem(item.productId)} className="text-slate-300 hover:text-red-500 text-[10px] ml-2 font-black">✕</button>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                           <span className="text-[10px] text-slate-500 font-bold mr-2 uppercase">Qty:</span>
                           <span className="text-xs font-black text-slate-800">{item.quantity}</span>
                        </div>
                        <div className="flex-1 relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-600 font-black">₦</span>
                          <input 
                            type="number"
                            className="w-full bg-emerald-50/50 border border-emerald-100 rounded-lg pl-5 py-1 text-xs font-black text-emerald-700 focus:ring-1 focus:ring-emerald-500 border-none appearance-none"
                            value={item.priceAtOrder}
                            onChange={(e) => handleUpdateItemPrice(item.productId, Number(e.target.value))}
                            title="Manual Price Adjustment"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!newOrder.items || newOrder.items.length === 0) && (
                    <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white/50">
                       <p className="text-[10px] text-slate-400 font-bold uppercase">Empty Cart</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Order Value</p>
                      <p className="text-2xl font-black text-slate-900 leading-none mt-1">
                        ₦{newOrder.items?.reduce((acc, i) => acc + (i.priceAtOrder * i.quantity), 0).toLocaleString() || 0}
                      </p>
                    </div>
                    {newOrder.items && newOrder.items.length > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-2 py-1 rounded uppercase">
                        {newOrder.items.length} Product(s)
                      </span>
                    )}
                  </div>
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
