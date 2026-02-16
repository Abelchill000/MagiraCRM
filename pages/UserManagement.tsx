
import React, { useState } from 'react';
import { db } from '../services/mockDb.ts';
import { User } from '../types.ts';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(db.getUsers());

  const pendingUsers = users.filter(u => u.status === 'pending');
  const activeUsers = users.filter(u => u.status === 'approved');
  const rejectedUsers = users.filter(u => u.status === 'rejected');

  const handleApprove = (id: string) => {
    db.approveUser(id);
    setUsers([...db.getUsers()]);
  };

  const handleReject = (id: string) => {
    if (window.confirm("Are you sure you want to deny access to this user?")) {
      db.rejectUser(id);
      setUsers([...db.getUsers()]);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-800">Access Control</h1>
        <p className="text-slate-500 text-sm">Manage pending agent registrations and active users.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Pending Requests */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Pending Approvals ({pendingUsers.length})</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingUsers.length === 0 ? (
              <div className="col-span-full p-12 bg-white rounded-3xl border-2 border-dashed border-slate-100 text-center text-slate-400">
                <p className="text-xs font-bold uppercase tracking-widest">No pending applications</p>
              </div>
            ) : (
              pendingUsers.map(u => (
                <div key={u.id} className="bg-white p-6 rounded-3xl shadow-sm border border-amber-100 flex flex-col justify-between hover:shadow-md transition">
                  <div className="mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 leading-none">{u.name}</p>
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
                      className="py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-xl transition"
                    >
                      Deny Access
                    </button>
                    <button 
                      onClick={() => handleApprove(u.id)}
                      className="py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Active/Rejected Users Combined */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">Team Directory</h2>
          </div>
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Member</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {[...activeUsers, ...rejectedUsers].map(u => (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white ${u.status === 'approved' ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded uppercase tracking-tighter">{u.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[9px] font-black px-2 py-1 rounded uppercase tracking-widest ${u.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                         {u.status === 'rejected' ? (
                           <button onClick={() => handleApprove(u.id)} className="text-[10px] font-bold text-emerald-600 hover:underline">Re-approve</button>
                         ) : (
                           <button onClick={() => handleReject(u.id)} className="text-[10px] font-bold text-red-500 hover:underline">Revoke Access</button>
                         )}
                      </td>
                    </tr>
                  ))}
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
