
import React, { useMemo } from 'react';
import { db } from '../services/mockDb';
import { DeliveryStatus, LeadStatus, Order } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const Dashboard: React.FC = () => {
  const orders = db.getOrders();
  const products = db.getProducts();
  const leads = db.getLeads();

  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const deliveredOrders = orders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED);
    
    const salesToday = deliveredOrders.filter(o => o.createdAt.startsWith(today)).reduce((acc, o) => acc + o.totalAmount, 0);
    const realizedRevenue = deliveredOrders.reduce((acc, o) => acc + o.totalAmount, 0);
    const totalLogisticsExpense = deliveredOrders.reduce((acc, o) => acc + o.logisticsCost, 0);
    
    const totalCOGS = deliveredOrders.reduce((acc, o) => {
      return acc + o.items.reduce((itemAcc, item) => itemAcc + (item.costAtOrder || 0) * item.quantity, 0);
    }, 0);

    const netProfit = realizedRevenue - totalLogisticsExpense - totalCOGS;

    const deliveredCount = orders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length;
    const pendingCount = orders.filter(o => o.deliveryStatus === DeliveryStatus.PENDING).length;
    const failedCount = orders.filter(o => o.deliveryStatus === DeliveryStatus.FAILED).length;
    const rescheduledCount = orders.filter(o => o.deliveryStatus === DeliveryStatus.RESCHEDULED).length;

    // Lead Stats
    const leadsToday = leads.filter(l => l.createdAt.startsWith(today)).length;
    const totalConverted = orders.filter(o => !!o.leadId).length;
    const conversionRate = leads.length > 0 ? (totalConverted / leads.length) * 100 : 0;

    // Reminders
    const remindersToday = orders.filter(o => 
      o.deliveryStatus === DeliveryStatus.RESCHEDULED && 
      o.rescheduleDate === today &&
      o.reminderEnabled
    );

    return { 
      salesToday, 
      realizedRevenue, 
      totalLogisticsExpense, 
      netProfit, 
      delivered: deliveredCount, 
      pending: pendingCount, 
      failed: failedCount,
      rescheduled: rescheduledCount,
      leadsToday,
      conversionRate,
      remindersToday
    };
  }, [orders, leads]);

  const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6'];

  const deliveryData = [
    { name: 'Delivered', value: stats.delivered },
    { name: 'Pending', value: stats.pending },
    { name: 'Failed', value: stats.failed },
    { name: 'Rescheduled', value: stats.rescheduled },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Operational Overview</h1>
          <p className="text-slate-500">Real-time stats across sales and distribution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Realized Revenue</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">₦{stats.realizedRevenue.toLocaleString()}</p>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Delivered Orders</span>
            <span className="text-[10px] text-emerald-600 font-bold">₦{stats.salesToday.toLocaleString()} Today</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Logistics Expense</p>
          <p className="text-2xl font-bold text-red-500 mt-1">₦{stats.totalLogisticsExpense.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Total Shipping Cost</p>
        </div>
        <div className="bg-emerald-900 p-6 rounded-2xl shadow-lg border border-emerald-800">
          <p className="text-sm font-medium text-emerald-300">Estimated Net Profit</p>
          <p className="text-2xl font-bold text-white mt-1">₦{stats.netProfit.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-400 mt-1 font-bold uppercase">After Expenses & COGS</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <p className="text-sm font-medium text-slate-500">Web Leads Today</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stats.leadsToday}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase">Conversion: {stats.conversionRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-6 text-center lg:text-left">Delivery Funnel Breakdown</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deliveryData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[8, 8, 0, 0]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reminders Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <span>🔔</span> Follow-up Reminders
            </h3>
            <span className="bg-amber-200 text-amber-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Today</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
            {stats.remindersToday.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                 <div className="text-4xl mb-4">💤</div>
                 <p className="text-sm font-bold text-slate-400">No rescheduled orders due for follow-up today.</p>
              </div>
            ) : (
              stats.remindersToday.map((order: Order) => (
                <div key={order.id} className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl hover:shadow-md transition group">
                   <div className="flex justify-between items-start mb-2">
                      <p className="font-bold text-slate-800 text-sm">{order.customerName}</p>
                      <span className="text-[9px] font-black bg-white text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">{order.id}</span>
                   </div>
                   <p className="text-xs text-slate-500 line-clamp-2 italic">"{order.rescheduleNotes}"</p>
                   <div className="flex items-center justify-between mt-3">
                      <a href={`tel:${order.phone}`} className="text-[10px] font-bold text-amber-700 hover:underline">📞 {order.phone}</a>
                      <button className="text-[9px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition">Mark Handled</button>
                   </div>
                </div>
              ))
            )}
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Active Reminders: {orders.filter(o => o.deliveryStatus === DeliveryStatus.RESCHEDULED && o.reminderEnabled).length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
