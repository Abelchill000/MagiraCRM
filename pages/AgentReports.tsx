
import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../services/mockDb';
import { Order, User, DeliveryStatus, UserRole } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

const AgentReports: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(db.getOrders());
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [selectedAgentId, setSelectedAgentId] = useState<string>('all');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showLogisticsPrompt, setShowLogisticsPrompt] = useState<{orderId: string} | null>(null);
  const [tempLogisticsCost, setTempLogisticsCost] = useState<number>(0);

  const user = db.getCurrentUser();
  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setOrders(db.getOrders());
      setUsers(db.getUsers());
    });
    return unsub;
  }, []);

  const agents = useMemo(() => {
    return users.filter(u => u.role === UserRole.SALES_AGENT || u.role === UserRole.ADMIN);
  }, [users]);

  const filteredOrders = useMemo(() => {
    let result = orders;
    
    // Filter by agent
    if (selectedAgentId !== 'all') {
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent) {
        result = result.filter(o => o.createdBy === agent.name);
      }
    }

    // Filter by period
    const date = new Date(selectedDate);
    result = result.filter(o => {
      const orderDate = new Date(o.createdAt);
      if (period === 'daily') {
        return orderDate.toDateString() === date.toDateString();
      } else if (period === 'weekly') {
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return orderDate >= startOfWeek && orderDate <= endOfWeek;
      } else {
        return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
      }
    });

    return result;
  }, [orders, selectedAgentId, period, selectedDate, agents]);

  const stats = useMemo(() => {
    const total = filteredOrders.length;
    const delivered = filteredOrders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length;
    const revenue = filteredOrders
      .filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED)
      .reduce((acc, o) => acc + o.totalAmount, 0);
    const successRate = total > 0 ? (delivered / total) * 100 : 0;

    return { total, delivered, revenue, successRate };
  }, [filteredOrders]);

  const chartData = useMemo(() => {
    if (period === 'monthly') {
      // Group by day of month
      const daysInMonth = new Date(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth() + 1, 0).getDate();
      const data = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const dayOrders = filteredOrders.filter(o => new Date(o.createdAt).getDate() === i);
        data.push({
          name: `${i}`,
          orders: dayOrders.length,
          delivered: dayOrders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length
        });
      }
      return data;
    } else if (period === 'weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return days.map((day, index) => {
        const dayOrders = filteredOrders.filter(o => new Date(o.createdAt).getDay() === index);
        return {
          name: day,
          orders: dayOrders.length,
          delivered: dayOrders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length
        };
      });
    } else {
      // Hourly for daily
      const data = [];
      for (let i = 0; i < 24; i++) {
        const hourOrders = filteredOrders.filter(o => new Date(o.createdAt).getHours() === i);
        data.push({
          name: `${i}:00`,
          orders: hourOrders.length,
          delivered: hourOrders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length
        });
      }
      return data;
    }
  }, [filteredOrders, period, selectedDate]);

  const downloadCSV = () => {
    const headers = ['Order ID', 'Date', 'Agent', 'Customer', 'Amount', 'Status'];
    const rows = filteredOrders.map(o => [
      o.id,
      new Date(o.createdAt).toLocaleDateString(),
      o.createdBy,
      o.customerName,
      o.totalAmount,
      o.deliveryStatus
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agent_report_${selectedAgentId}_${period}_${selectedDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (orderId: string, currentStatus: DeliveryStatus) => {
    if (!isAdmin) return;

    if (currentStatus === DeliveryStatus.DELIVERED) {
      if (window.confirm("Unmark this order as delivered? Stock will be adjusted.")) {
        await db.updateOrderStatus(orderId, DeliveryStatus.PENDING);
        alert("Order unmarked as delivered.");
      }
    } else {
      setShowLogisticsPrompt({ orderId });
      setTempLogisticsCost(0);
    }
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Agent Performance Reports</h1>
          <p className="text-slate-500 text-sm font-medium">Detailed breakdown of sales and delivery metrics.</p>
        </div>
        <button 
          onClick={downloadCSV}
          className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition flex items-center gap-2"
        >
          <span>📥</span> Download CSV Report
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select Agent</label>
          <select 
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Collectively (All Agents)</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>{agent.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Time Period</label>
          <div className="flex bg-slate-50 p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition ${period === p ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Reference Date</label>
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div className="flex items-end">
          <div className="w-full bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border border-emerald-100">
            {filteredOrders.length} Records Found
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
          <p className="text-3xl font-black text-slate-900">{stats.total}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-2 italic">Generated in period</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Delivered</p>
          <p className="text-3xl font-black text-emerald-600">{stats.delivered}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-2 italic">Successfully completed</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Success Rate</p>
          <p className="text-3xl font-black text-blue-600">{stats.successRate.toFixed(1)}%</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${stats.successRate}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
          <p className="text-3xl font-black text-slate-900">₦{stats.revenue.toLocaleString()}</p>
          <p className="text-[9px] font-bold text-slate-400 mt-2 italic">From delivered orders</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Trend Analysis</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Delivered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Orders</span>
            </div>
          </div>
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '12px' }}
              />
              <Bar dataKey="orders" fill="#e2e8f0" radius={[4, 4, 0, 0]} barSize={period === 'daily' ? 10 : 20} />
              <Bar dataKey="delivered" fill="#10b981" radius={[4, 4, 0, 0]} barSize={period === 'daily' ? 10 : 20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Detailed Transaction Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Order ID</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Agent</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                {isAdmin && <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-8 py-12 text-center text-slate-400 font-medium italic">No records found for this selection.</td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 font-black text-slate-900 text-xs">#{order.id}</td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-600">{order.createdBy}</td>
                    <td className="px-8 py-4 text-xs font-bold text-slate-600">{order.customerName}</td>
                    <td className="px-8 py-4 text-xs font-black text-slate-900">₦{order.totalAmount.toLocaleString()}</td>
                    <td className="px-8 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                        order.deliveryStatus === DeliveryStatus.DELIVERED ? 'bg-emerald-100 text-emerald-700' :
                        order.deliveryStatus === DeliveryStatus.CANCELLED ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {order.deliveryStatus}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-[10px] font-bold text-slate-400">{new Date(order.createdAt).toLocaleDateString()}</td>
                    {isAdmin && (
                      <td className="px-8 py-4">
                        <button 
                          onClick={() => handleStatusChange(order.id, order.deliveryStatus)}
                          className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-xl transition-all ${
                            order.deliveryStatus === DeliveryStatus.DELIVERED 
                              ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          }`}
                        >
                          {order.deliveryStatus === DeliveryStatus.DELIVERED ? 'Unmark Delivered' : 'Mark Delivered'}
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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

export default AgentReports;
