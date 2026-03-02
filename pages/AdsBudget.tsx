
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../services/mockDb';
import { User, UserRole, AdsBudget } from '../types';

const AdsBudgetPage: React.FC = () => {
  const currentUser = db.getCurrentUser();
  const [budgets, setBudgets] = useState<AdsBudget[]>(db.getBudgets());
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    userId: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0]
  });

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setBudgets(db.getBudgets());
      setUsers(db.getUsers());
    });
    return unsub;
  }, []);

  const filteredBudgets = useMemo(() => {
    if (isAdmin) return budgets.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return budgets
      .filter(b => b.userId === currentUser?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [budgets, isAdmin, currentUser?.id]);

  const userStats = useMemo(() => {
    const stats: Record<string, { daily: number; total: number }> = {};
    const today = new Date().toISOString().split('T')[0];

    filteredBudgets.forEach(b => {
      if (!stats[b.userId]) stats[b.userId] = { daily: 0, total: 0 };
      stats[b.userId].total += b.amount;
      if (b.date === today) {
        stats[b.userId].daily += b.amount;
      }
    });

    return stats;
  }, [filteredBudgets]);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.userId || newBudget.amount <= 0) return;

    const selectedUser = users.find(u => u.id === newBudget.userId);
    if (!selectedUser) return;

    const budget: AdsBudget = {
      id: 'BUD-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      userId: newBudget.userId,
      userName: selectedUser.name,
      amount: newBudget.amount,
      date: newBudget.date,
      createdAt: new Date().toISOString()
    };

    await db.saveBudget(budget);
    setShowAddModal(false);
    setNewBudget({ userId: '', amount: 0, date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Meta Ads Budget</h1>
          <p className="text-slate-500 text-sm font-medium">Tracking daily ad spend and total allocations.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-black shadow-lg shadow-emerald-100 transition text-[11px] uppercase tracking-widest"
          >
            + Add Daily Budget
          </button>
        )}
      </div>

      {!isAdmin && currentUser && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Today's Ad Budget</p>
            <p className="text-4xl font-black text-emerald-600">₦{(userStats[currentUser.id]?.daily || 0).toLocaleString()}</p>
          </div>
          <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 text-white/50">Total Ad Spend</p>
            <p className="text-4xl font-black text-white">₦{(userStats[currentUser.id]?.total || 0).toLocaleString()}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <h3 className="font-black text-slate-800 uppercase tracking-widest text-xs">Budget History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                {isAdmin && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>}
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Created At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredBudgets.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="px-8 py-12 text-center text-slate-400 font-medium">No budget records found.</td>
                </tr>
              ) : (
                filteredBudgets.map(budget => (
                  <tr key={budget.id} className="hover:bg-slate-50/50 transition-all">
                    <td className="px-8 py-5">
                      <span className="font-bold text-slate-800">{new Date(budget.date).toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-8 py-5">
                        <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">{budget.userName}</span>
                      </td>
                    )}
                    <td className="px-8 py-5">
                      <span className="font-black text-slate-900">₦{budget.amount.toLocaleString()}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] text-slate-400 font-medium">{new Date(budget.createdAt).toLocaleString()}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl p-10 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-slate-800 mb-2">Add Ad Budget</h2>
            <p className="text-slate-500 text-sm mb-8 font-medium">Allocate daily Meta ads budget to a specific user.</p>
            
            <form onSubmit={handleAddBudget} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Select User</label>
                <select 
                  required
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold"
                  value={newBudget.userId}
                  onChange={e => setNewBudget({...newBudget, userId: e.target.value})}
                >
                  <option value="">-- Choose User --</option>
                  {users.filter(u => u.isApproved).map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Budget Amount (₦)</label>
                <input 
                  type="number" required min="1"
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-black text-xl"
                  placeholder="5000"
                  value={newBudget.amount || ''}
                  onChange={e => setNewBudget({...newBudget, amount: Number(e.target.value)})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Target Date</label>
                <input 
                  type="date" required
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold"
                  value={newBudget.date}
                  onChange={e => setNewBudget({...newBudget, date: e.target.value})}
                />
              </div>

              <div className="pt-4 flex flex-col gap-3">
                <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition shadow-xl shadow-emerald-100">
                  Save Allocation
                </button>
                <button type="button" onClick={() => setShowAddModal(false)} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdsBudgetPage;
