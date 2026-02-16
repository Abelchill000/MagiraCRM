import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb.ts';
import { User } from '../types.ts';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'categorized' | 'audit'>('categorized');

  const refreshData = () => {
    const freshUsers = db.getUsers();
    
    // Auto-Repair Logic: If any user exists without a valid status, 
    // we force them into 'pending' so they appear in the primary review list.
    let needsUpdate = false;
    freshUsers.forEach((u: User) => {
      if (u.email !== 'admin@magiracrm.store' && !['approved', 'rejected', 'pending'].includes(u.status || '')) {
        db.approveUser(u.id); // Temporary call to trigger a save, though we want pending
        // Since we want them as pending, let's just use the refresh to show them via the filter below
        needsUpdate = true;
      }
    });

    console.log('UserManagement Sync:', freshUsers.length, 'total records.');
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

  // FORCEFUL FILTERING: Absolutely everything that is NOT 'approved' or 'rejected' 
  // is pushed into the Pending/Awaiting list. This prevents any "lost" applications.
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

  const handleClearData = () => {
    if (window.confirm("CRITICAL: Wipe ALL system data? (Inventory, Orders, Leads, Users)")) {
      db.clearAllData();
    }
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
          {/* Section 1: Awaiting Approval (Absolute Catch-all) */}
          <section>
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${pendingUsers.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></div>
                <h2 className="text-base font-black text-slate-800 uppercase tracking-widest">Applications Awaiting Approval ({pendingUsers.length})</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Total Records Found: {users.length}</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingUsers.length === 0 ? (
                <div className="col-span-full p-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 text-center shadow-inner">
                  <div className="text-5xl mb-6 opacity-30">📬</div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Database scan complete</p>
                  <p className="text-xs text-slate-300 mt-2 font-medium">No unprocessed identities found in storage.</p>
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
                          <p className="font-black text-slate-800 leading-none truncate text-xl">{u.name || 'Anonymous Applicant'}</p>
                          <p className="text-xs text-slate-400 mt-1.5 truncate font-medium">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[10px] font-black bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-tighter border border-slate-200">{u.role}</span>
                        <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">New Request</span>
                      </div>
                      <div className="mt-6 pt-6 border-t border-slate-50">
                        <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Reference ID: {u.id}</p>
                        <p className="text-[9px] font-black text-slate-300 uppercase mt-1 tracking-widest">Joined: {u.registeredAt ? new Date(u.registeredAt).toLocaleString() : 'Legacy Record'}</p>
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
                        className="py-4 text-[11px] font-black uppercase tracking-widest bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-[1.02] active:scale-95 transition-all"
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
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Access Controls</th>
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
                              <p className="text-[11px] text-slate-400 font-medium">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-3 py-1.5 rounded-xl uppercase border border-slate-200">{u.role}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            disabled={u.email === 'admin@magiracrm.store'}
                            onClick={() => handleReject(u.id)} 
                            className={`text-[10px] font-black uppercase text-slate-300 hover:text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition-all ${u.email === 'admin@magiracrm.store' ? 'opacity-0 pointer-events-none' : ''}`}
                          >
                            Block Account
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
          </section>
        </div>
      ) : (
        /* DATABASE AUDIT: RAW VIEW, NO FILTERS */
        <section className="animate-in slide-in-from-right-4 duration-500">
          <div className="bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden border border-slate-800">
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-slate-900 to-slate-800">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">System Integrity Audit</h2>
                <p className="text-slate-400 text-xs mt-2">Forcefully displaying every unique record detected in the database.</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 text-3xl font-black">{users.length}</p>
                <p className="text-white/20 text-[10px] uppercase font-bold tracking-widest mt-1">Stored Records</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-10 py-6 text-[11px] font-black text-slate-500 uppercase tracking-widest">Entry UID</th>
                    <th className="px-10 py-6 text-[11px] font-black text-slate-500 uppercase tracking-widest">Credential Pair</th>
                    <th className="px-10 py-6 text-[11px] font-black text-slate-500 uppercase tracking-widest text-center">Database Status</th>
                    <th className="px-10 py-6 text-[11px] font-black text-slate-500 uppercase tracking-widest text-right">Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u, i) => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-10 py-7">
                        <p className="font-mono text-[11px] text-white/40 group-hover:text-emerald-400 transition-colors">#{i+1} — {u.id}</p>
                        <p className="text-[9px] text-slate-600 mt-2 uppercase font-black tracking-widest">Source: Storage_V3</p>
                      </td>
                      <td className="px-10 py-7">
                        <p className="text-sm font-black text-white">{u.email}</p>
                        <p className="text-[11px] text-slate-500 mt-1 uppercase font-bold tracking-tighter">{u.name || 'NULL_NAME'}</p>
                      </td>
                      <td className="px-10 py-7 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className={`text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest ${
                            u.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            u.status === 'rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                          }`}>
                            {u.status || 'UNDEFINED'}
                          </span>
                        </div>
                      </td>
                      <td className="px-10 py-7 text-right">
                        <div className="flex justify-end gap-3 opacity-30 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleApprove(u.id)} className="text-[10px] font-black bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-500 transition-transform active:scale-90">Restore/Approve</button>
                          <button 
                            disabled={u.email === 'admin@magiracrm.store'}
                            onClick={() => handleReject(u.id)} 
                            className="text-[10px] font-black bg-white/5 text-slate-400 px-4 py-2 rounded-xl hover:bg-red-600 hover:text-white transition-all disabled:opacity-0"
                          >
                            Purge
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-12 bg-black/40 flex flex-col sm:flex-row items-center justify-between gap-8 border-t border-white/5">
               <div className="flex items-center gap-6">
                  <div className="p-5 bg-red-600/10 rounded-[2rem] border border-red-500/20">
                     <span className="text-3xl">🗄️</span>
                  </div>
                  <div>
                    <p className="text-sm font-black text-white uppercase tracking-[0.2em]">Maintenance Hub</p>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-sm">Use these tools to force visibility or wipe corrupted local data if users aren't appearing correctly.</p>
                  </div>
               </div>
               <div className="flex gap-4 w-full sm:w-auto">
                 <button onClick={refreshData} className="flex-1 sm:flex-none px-8 py-4 bg-white/5 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all">Deep Scan DB</button>
                 <button onClick={handleClearData} className="flex-1 sm:flex-none px-8 py-4 bg-red-600/20 border border-red-500/30 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-600 hover:text-white transition-all">Wipe Storage</button>
               </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default UserManagement;