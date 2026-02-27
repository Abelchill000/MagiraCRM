
import React, { useMemo } from 'react';
import { db } from '../services/mockDb.ts';
import { DeliveryStatus, LeadStatus, Order } from '../types.ts';
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

    // Lead Pipeline Value
    const leadPipeline = leads.reduce((acc, lead) => {
      const leadValue = lead.items.reduce((itemAcc, item) => {
        const product = products.find(p => p.id === item.productId);
        return itemAcc + (product ? product.sellingPrice * item.quantity : 0);
      }, 0);
      
      const status = lead.status;
      acc[status] = (acc[status] || 0) + leadValue;
      acc.total = (acc.total || 0) + leadValue;
      return acc;
    }, { total: 0 } as Record<string, number>);

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
      leadPipeline,
      remindersToday
    };
  }, [orders, leads, products]);

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-800">Sales & Lead Pipeline</h3>
              <p className="text-xs text-slate-500">Monetary value of generated leads vs realized revenue.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Lead Value</p>
                <p className="text-xl font-black text-slate-900">₦{stats.leadPipeline.total.toLocaleString()}</p>
              </div>
              <div className="w-px h-10 bg-slate-100" />
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Delivered Value</p>
                <p className="text-xl font-black text-emerald-600">₦{stats.realizedRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lead Status Distribution (Value)</span>
                <span className="text-[10px] font-bold text-slate-500">{leads.length} Total Leads</span>
              </div>
              <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <div 
                  style={{ width: `${stats.leadPipeline.total > 0 ? (stats.leadPipeline[LeadStatus.VERIFIED] || 0) / stats.leadPipeline.total * 100 : 0}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-500"
                  title="Verified"
                />
                <div 
                  style={{ width: `${stats.leadPipeline.total > 0 ? (stats.leadPipeline[LeadStatus.NEW] || 0) / stats.leadPipeline.total * 100 : 0}%` }} 
                  className="bg-blue-500 h-full transition-all duration-500"
                  title="New"
                />
                <div 
                  style={{ width: `${stats.leadPipeline.total > 0 ? ((stats.leadPipeline[LeadStatus.REJECTED] || 0) + (stats.leadPipeline[LeadStatus.FAKE] || 0)) / stats.leadPipeline.total * 100 : 0}%` }} 
                  className="bg-slate-300 h-full transition-all duration-500"
                  title="Rejected/Fake"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest mb-1">Verified Leads</p>
                <p className="text-sm font-bold text-emerald-900">₦{(stats.leadPipeline[LeadStatus.VERIFIED] || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <p className="text-[9px] font-black text-blue-700 uppercase tracking-widest mb-1">New Leads</p>
                <p className="text-sm font-bold text-blue-900">₦{(stats.leadPipeline[LeadStatus.NEW] || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Rejected/Fake</p>
                <p className="text-sm font-bold text-slate-700">₦{((stats.leadPipeline[LeadStatus.REJECTED] || 0) + (stats.leadPipeline[LeadStatus.FAKE] || 0)).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline Efficiency</p>
                <p className="text-sm font-bold text-white">
                  {stats.leadPipeline.total > 0 ? ((stats.realizedRevenue / stats.leadPipeline.total) * 100).toFixed(1) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center text-center">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivered Orders Total</p>
          <p className="text-3xl font-black text-emerald-600">₦{stats.realizedRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-slate-400 mt-2">Total value of all orders marked as <span className="text-emerald-600 font-bold">Delivered</span></p>
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