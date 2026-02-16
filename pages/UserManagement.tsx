import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb.ts';
import { User } from '../types.ts';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [viewMode, setViewMode] = useState<'categorized' | 'audit'>('categorized');

  const refreshData = () => {
    const freshUsers = db.getUsers();
    console.log('UserManagement FORCE Sync:', freshUsers.length, 'total records found.');
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

  // Categorization logic - more inclusive to ensure nothing is missed
  const pendingUsers = users.filter(u => u.status === 'pending' || (!u.status && u.email !== 'admin@magiracrm.store'));
  const activeUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');
  
  // Any user that doesn't fit the standard 3 buckets exactly
  const outlierUsers = users.filter(u => 
    !['pending', 'approved', 'rejected'].includes(u.status || '') && 
    u.email !== 'admin@magiracrm.store'
  );

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
          <p className="text-slate-500 text-sm font-medium">Monitoring {users.length} total system identities.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex">
            <button 
              onClick={() => setViewMode('categorized')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'categorized' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
            >
              Categorized
            </button>
            <button 
              onClick={() => setViewMode('audit')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${viewMode === 'audit' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
            >
              Full Audit (All Records)
            </button>
          </div>
          <button 
            onClick={refreshData}
            className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition flex items-center gap-2 text-xs font-bold shadow-lg shadow-emerald-100"
          >
            <span>🔄</span> Sync
          </button>
        </div>
      </div>

      {viewMode === 'categorized' ? (
        <div className="grid grid-cols-1 gap-8">
          {/* Outliers Warning */}
          {outlierUsers.length > 0 && (
            <div className="bg-red-50 border-2 border-red-200 p-6 rounded-3xl animate-pulse">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-sm font-black text-red-800 uppercase tracking-tight">CRITICAL: {outlierUsers.length} Uncategorized Identities Detected</h3>
              </div>
              <p className="text-xs text-red-600 mb-4 font-medium">These records exist in the database but have corrupted or missing status fields. They are shown below for emergency review.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {outlierUsers.map(u => (
                  <div key={u.id} className="bg-white p-4 rounded-2xl border border-red-100 flex justify-between items-center shadow-sm">
                    <div>
                      <p className="text-xs font-black text-slate-800">{u.email}</p>
                      <p className="text-[10px] text-slate-400">ID: {u.id} | Raw Status: "{u.status || 'NULL'}"</p>
                    </div>
                    <button onClick={() => handleApprove(u.id)} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Fix & Approve</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Applications - Primary Focus */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${pendingUsers.length > 0 ? 'bg-amber-500 animate-pulse' : 'bg-slate-300'}`}></span>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Applications Awaiting Review ({pendingUsers.length})</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingUsers.length === 0 ? (
                <div className="col-span-full p-16 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 text-center">
                  <div className="text-4xl mb-4 opacity-20">📥</div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Queue is currently empty</p>
                  <p className="text-[10px] text-slate-300 mt-2 font-medium">All registered agents have been processed.</p>
                </div>
              ) : (
                pendingUsers.map(u => (
                  <div key={u.id} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-xl transition-all duration-300 group">
                    <div className="mb-6">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg group-hover:bg-emerald-600 transition-colors">
                          {u.name ? u.name.charAt(0) : '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black text-slate-800 leading-none truncate text-lg">{u.name || 'New Applicant'}</p>
                          <p className="text-xs text-slate-400 mt-1 truncate font-medium">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-tighter">{u.role}</span>
                        <span className="text-[9px] font-black bg-amber-50 text-amber-700 px-2 py-1 rounded-lg uppercase tracking-widest border border-amber-100">Pending Approval</span>
                      </div>
                      {u.registeredAt && (
                        <p className="text-[8px] font-black text-slate-300 uppercase mt-4 tracking-widest">Received: {new Date(u.registeredAt).toLocaleString()}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-6 border-t border-slate-50">
                      <button 
                        onClick={() => handleReject(u.id)}
                        className="py-3 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 rounded-2xl transition"
                      >
                        Decline
                      </button>
                      <button 
                        onClick={() => handleApprove(u.id)}
                        className="py-3 text-[10px] font-black uppercase tracking-widest bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                      >
                        Approve Agent
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Approved Team */}
          <section>
             <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Authorized Team Members ({activeUsers.length})</h2>
             <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Identity</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Designation</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeUsers.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-300 text-xs italic">No approved members.</td></tr>
                    ) : (
                      activeUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50 transition">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white text-[10px] font-black">
                                {u.name ? u.name.charAt(0) : '?'}
                              </div>
                              <div>
                                <p className="text-xs font-black text-slate-800">{u.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg uppercase">{u.role}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button 
                              disabled={u.email === 'admin@magiracrm.store'}
                              onClick={() => handleReject(u.id)} 
                              className={`text-[9px] font-black uppercase text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-xl transition ${u.email === 'admin@magiracrm.store' ? 'opacity-0' : ''}`}
                            >
                              Revoke Access
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </section>
        </div>
      ) : (
        /* AUDIT MODE - 100% TRANSPARENCY, NO FILTERS */
        <section className="animate-in slide-in-from-right-4 duration-300">
          <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-800">
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Master Database Audit</h2>
                <p className="text-slate-400 text-xs mt-1">Direct view of all records in storage. Nothing is hidden here.</p>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 text-xs font-black uppercase tracking-widest">{users.length} Records</p>
                <p className="text-white/20 text-[10px] uppercase font-bold mt-1">Raw System View</p>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Record UID</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Credentials</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Raw Status</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u, i) => (
                    <tr key={u.id} className="hover:bg-white/5 transition group">
                      <td className="px-8 py-6">
                        <p className="font-mono text-[10px] text-white/40 group-hover:text-emerald-400 transition-colors">#{i+1} — {u.id}</p>
                        <p className="text-[9px] text-slate-600 mt-1 uppercase font-black">Ref: {u.registeredAt ? new Date(u.registeredAt).getTime() : 'No T-Stamp'}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-white">{u.email}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">{u.name || 'UNNAMED_RECORD'}</p>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${
                          u.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                          u.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {u.status || 'UNDEFINED'}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleApprove(u.id)} className="text-[9px] font-black bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-500 transition">Override Apprv</button>
                          <button 
                            disabled={u.email === 'admin@magiracrm.store'}
                            onClick={() => handleReject(u.id)} 
                            className="text-[9px] font-black bg-white/5 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-red-600 hover:text-white transition disabled:opacity-0"
                          >
                            Block
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-8 bg-black/20 flex flex-col sm:flex-row items-center justify-between gap-6">
               <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/10 rounded-2xl">
                     <span className="text-xl">☣️</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-tight">System Purge Area</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">Emergency data clearing tools. Use with extreme caution.</p>
                  </div>
               </div>
               <button onClick={handleClearData} className="w-full sm:w-auto px-8 py-4 bg-red-600/10 border border-red-500/20 text-red-500 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-red-600 hover:text-white transition-all shadow-xl">
                 Destroy Entire Database
               </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default UserManagement;