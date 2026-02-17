
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb.ts';
import { User } from '../types.ts';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'categorized' | 'audit'>('categorized');

  const refreshData = () => {
    const freshUsers = db.getUsers();
    setUsers([...freshUsers]);
    setLastUpdated(new Date());
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = db.subscribe(() => {
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  const pendingUsers = users.filter(u => 
    u.email !== 'admin@magiracrm.store' && 
    u.status !== 'approved' && 
    u.status !== 'rejected'
  );
  
  const approvedUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  const handleApprove = (id: string) => {
    db.approveUser(id);
    refreshData();
  };

  const handleReject = (id: string) => {
    if (window.confirm("Deny system access to this user?")) {
      db.rejectUser(id);
      refreshData();
    }
  };

  const sendWhatsAppNotification = (user: User) => {
    const message = `Hello ${user.name}, your Magira CRM account has been approved! You can now log in at https://magiracrm.store`;
    const url = `https://wa.me/${user.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendEmailNotification = (user: User) => {
    const subject = "Magira CRM Account Approved";
    const body = `Hello ${user.name},\n\nWelcome to the team! Your Magira CRM Sales Agent account has been approved. You can now log in using your email (${user.email}) and password.\n\nLogin here: https://magiracrm.store\n\nBest regards,\nMagira Admin`;
    const mailto = `mailto:${user.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Access Control</h1>
          <p className="text-slate-500 text-sm font-medium">Monitoring {users.length} total identities in database.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
            <button 
              onClick={() => setViewMode('categorized')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'categorized' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
            >
              Review Board
            </button>
            <button 
              onClick={() => setViewMode('audit')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'audit' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
            >
              Database Audit
            </button>
          </div>
          <button 
            onClick={refreshData}
            className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 text-xs font-bold shadow-lg shadow-emerald-100"
          >
            <span>🔄</span> Force Refresh
          </button>
        </div>
      </div>

      {viewMode === 'categorized' ? (
        <div className="grid grid-cols-1 gap-12">
          {/* Section 1: Awaiting Approval */}
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${pendingUsers.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Applications Awaiting Approval ({pendingUsers.length})</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingUsers.length === 0 ? (
                <div className="col-span-full p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center shadow-inner">
                  <div className="text-5xl mb-6 opacity-30">📬</div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No new applications</p>
                </div>
              ) : (
                pendingUsers.map(u => (
                  <div key={u.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-[4rem] -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    
                    <div className="relative z-10 mb-8">
                      <div className="flex items-center gap-5 mb-6">
                        <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl group-hover:bg-emerald-600 transition-all duration-300">
                          {u.name ? u.name.charAt(0) : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 leading-none truncate text-xl">{u.name}</p>
                          <p className="text-xs text-slate-400 mt-1.5 truncate font-medium">{u.email}</p>
                          <p className="text-[10px] text-emerald-600 mt-1 font-black">{u.phone}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-slate-200">{u.role}</span>
                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">Pending</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 relative z-10">
                      <button 
                        onClick={() => handleReject(u.id)}
                        className="py-4 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                      >
                        Ignore
                      </button>
                      <button 
                        onClick={() => handleApprove(u.id)}
                        className="py-4 text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] transition-all"
                      >
                        Grant Access
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Section 2: Authorized Team */}
          <section>
             <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <span className="w-6 h-px bg-slate-200"></span>
               Authorized Directory ({approvedUsers.length})
             </h2>
             <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identified Member</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">System Role</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Notify / Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {approvedUsers.map(u => (
                      <tr key={u.id} className="hover:bg-slate-50/30 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                              {u.name ? u.name.charAt(0) : '?'}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800">{u.name}</p>
                              <p className="text-[11px] text-slate-400 font-medium">{u.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl uppercase border border-slate-200">{u.role}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex justify-end gap-2">
                            {u.email !== 'admin@magiracrm.store' && (
                              <>
                                <button 
                                  onClick={() => sendWhatsAppNotification(u)}
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition shadow-sm"
                                  title="Notify via WhatsApp"
                                >
                                  📲
                                </button>
                                <button 
                                  onClick={() => sendEmailNotification(u)}
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition shadow-sm"
                                  title="Notify via Email"
                                >
                                  📧
                                </button>
                                <button 
                                  onClick={() => handleReject(u.id)} 
                                  className="p-2 text-slate-300 hover:text-red-500 transition"
                                  title="Revoke Access"
                                >
                                  🚫
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </section>
        </div>
      ) : (
        <section className="animate-in slide-in-from-right-4 duration-500">
           {/* Audit view stays similar but includes phone */}
           <div className="bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800 p-10">
              <p className="text-white font-black">Database Audit Mode</p>
              <div className="mt-8 space-y-4">
                 {users.map(u => (
                   <div key={u.id} className="flex items-center justify-between text-white/50 border-b border-white/5 pb-4">
                      <div>
                        <p className="text-white font-bold">{u.name}</p>
                        <p className="text-xs">{u.email} • {u.phone}</p>
                      </div>
                      <span className="font-mono text-[10px]">{u.status}</span>
                   </div>
                 ))}
              </div>
           </div>
        </section>
      )}
    </div>
  );
};

export default UserManagement;
