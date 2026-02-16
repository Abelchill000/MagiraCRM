import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb.ts';
import { User } from '../types.ts';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const refreshData = () => {
    const freshUsers = db.getUsers();
    setUsers([...freshUsers]);
    setLastUpdated(freshUsers.length > 0 ? new Date() : lastUpdated);
  };

  useEffect(() => {
    // Initial fetch
    refreshData();
    
    // Subscribe to DB changes (real-time updates from same or other tabs)
    const unsubscribe = db.subscribe(() => {
      refreshData();
    });

    // Fallback interval
    const interval = setInterval(refreshData, 10000);
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');
  const unclassifiedUsers = users.filter(u => !['pending', 'approved', 'rejected'].includes(u.status));

  const handleApprove = (id: string) => {
    db.approveUser(id);
  };

  const handleReject = (id: string) => {
    if (window.confirm("Are you sure you want to deny access to this user?")) {
      db.rejectUser(id);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Access Control</h1>
          <p className="text-slate-500 text-sm">Review applications and manage the distribution team. ({users.length} total records found)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Synced</p>
            <p className="text-[10px] font-bold text-emerald-600">{lastUpdated.toLocaleTimeString()}</p>
          </div>
          <button 
            onClick={refreshData}
            className="bg-white border border-slate-200 text-slate-500 p-2.5 rounded-xl hover:bg-slate-50 transition flex items-center gap-2 text-xs font-bold"
          >
            <span>🔄</span> Force Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Pending Requests */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className={`w-2.5 h-2.5 rounded-full ${pendingUsers.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Awaiting Approval ({pendingUsers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.length === 0 ? (
              <div className="col-span-full p-12 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center text-slate-400">
                <p className="text-xs font-bold uppercase tracking-widest">No pending applications</p>
                <p className="text-[10px] mt-2 italic">New agent sign-ups will appear here instantly.</p>
              </div>
            ) : (
              pendingUsers.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-3xl shadow-sm border border-amber-100 flex flex-col justify-between hover:shadow-md transition animate-in slide-in-from-bottom-2">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black">
                        {u.name ? u.name.charAt(0) : '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-none">{u.name || 'Anonymous User'}</p>
                        <p className="text-xs text-slate-400 mt-1">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase">{u.role}</span>
                      <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-1 rounded uppercase">Review Needed</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 pt-4 border-t border-slate-50">
                    <button 
                      onClick={() => handleReject(u.id)}
                      className="py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      Deny Access
                    </button>
                    <button 
                      onClick={() => handleApprove(u.id)}
                      className="py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                    >
                      Approve Member
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Unclassified/Error Users fallback */}
        {unclassifiedUsers.length > 0 && (
          <section className="bg-red-50 border border-red-100 p-4 rounded-2xl">
             <h2 className="text-[10px] font-black text-red-700 uppercase mb-2">Integrity Alert: {unclassifiedUsers.length} Users with Invalid Status</h2>
             <div className="space-y-1">
                {unclassifiedUsers.map(u => (
                  <div key={u.id} className="flex justify-between items-center text-xs">
                    <span className="font-bold">{u.email}</span>
                    <button onClick={() => handleApprove(u.id)} className="text-emerald-600 underline">Set to Approved</button>
                  </div>
                ))}
             </div>
          </section>
        )}

        {/* Team Directory */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Full Team Directory</h2>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member Details</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Designation</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">System Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...activeUsers, ...rejectedUsers].length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-xs italic">
                        No team members registered yet.
                      </td>
                    </tr>
                  ) : (
                    [...activeUsers, ...rejectedUsers]
                      .sort((a,b) => (b.registeredAt || '').localeCompare(a.registeredAt || ''))
                      .map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white ${u.status === 'approved' ? 'bg-emerald-600 shadow-lg shadow-emerald-100' : 'bg-slate-400'}`}>
                              {u.name ? u.name.charAt(0) : '?'}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{u.name || 'Anonymous'}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-tighter">{u.role}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${u.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           {u.status === 'rejected' ? (
                             <button onClick={() => handleApprove(u.id)} className="text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition">Re-approve Access</button>
                           ) : (
                             <button 
                               onClick={() => handleReject(u.id)} 
                               disabled={u.email === 'admin@magiracrm.store'}
                               className={`text-[10px] font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition ${u.email === 'admin@magiracrm.store' ? 'opacity-0 pointer-events-none' : ''}`}
                             >
                               Revoke Permission
                             </button>
                           )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default UserManagement;