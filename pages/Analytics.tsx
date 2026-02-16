
import React, { useMemo } from 'react';
import { db } from '../services/mockDb';
import { DeliveryStatus } from '../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, BarChart, Bar 
} from 'recharts';

const Analytics: React.FC = () => {
  const orders = db.getOrders();
  const states = db.getStates();

  const successRateByState = useMemo(() => {
    return states.map(s => {
      const stateOrders = orders.filter(o => o.stateId === s.id);
      const delivered = stateOrders.filter(o => o.deliveryStatus === DeliveryStatus.DELIVERED).length;
      return {
        name: s.name,
        rate: stateOrders.length > 0 ? (delivered / stateOrders.length) * 100 : 0,
        total: stateOrders.length
      };
    });
  }, [states, orders]);

  // Mock weekly revenue data
  const revenueTrend = [
    { day: 'Mon', revenue: 45000 },
    { day: 'Tue', revenue: 52000 },
    { day: 'Wed', revenue: 38000 },
    { day: 'Thu', revenue: 61000 },
    { day: 'Fri', revenue: 95000 },
    { day: 'Sat', revenue: 120000 },
    { day: 'Sun', revenue: 85000 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Advanced Analytics</h1>
        <p className="text-slate-500">Logistics performance and revenue trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Growth (Weekly)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Delivery Success Rate per State (%)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={successRateByState} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="rate" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-emerald-900 text-white p-6 rounded-2xl">
          <p className="text-emerald-300 text-xs font-bold uppercase mb-1">Top Performing State</p>
          <p className="text-2xl font-bold">Lagos Hub</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">94.2% Success</span>
            <span className="bg-emerald-700 px-2 py-1 rounded text-xs">▲ 12%</span>
          </div>
        </div>
        <div className="bg-slate-800 text-white p-6 rounded-2xl">
          <p className="text-slate-400 text-xs font-bold uppercase mb-1">Highest Selling Product</p>
          <p className="text-2xl font-bold">Ginger Shot</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">1,240 Units sold</span>
            <span className="bg-slate-700 px-2 py-1 rounded text-xs">Best Seller</span>
          </div>
        </div>
        <div className="bg-blue-900 text-white p-6 rounded-2xl">
          <p className="text-blue-300 text-xs font-bold uppercase mb-1">Logistics Reliability</p>
          <p className="text-2xl font-bold">GIG Logistics</p>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm">98% Avg Delivery</span>
            <span className="bg-blue-700 px-2 py-1 rounded text-xs">Gold Tier</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
