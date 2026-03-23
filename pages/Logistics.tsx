
import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb';
import { LogisticsPartner, UserRole, StateConfig } from '../types';

const Logistics: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [partners, setPartners] = useState<LogisticsPartner[]>(db.getLogistics());
  const [states, setStates] = useState<StateConfig[]>(db.getStates());
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [editingState, setEditingState] = useState<Partial<StateConfig> | null>(null);

  // Access check
  const isLogisticsManager = user?.role === UserRole.LOGISTICS_MANAGER || user?.email === 'iconfidence909@gmail.com';
  const isGlobalAdmin = user?.role === UserRole.ADMIN && user?.email === 'admin@magiracrm.store';
  const isAuthorized = isGlobalAdmin || isLogisticsManager;

  useEffect(() => {
    const unsub = db.subscribe(() => {
      setPartners(db.getLogistics());
      setStates(db.getStates());
    });
    return unsub;
  }, []);

  const handleAddLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newPartner: LogisticsPartner = {
      id: 'l' + Math.random().toString(36).substr(2, 5),
      name: formData.get('name') as string,
      contactPerson: formData.get('contact') as string,
      phone: formData.get('phone') as string,
    };
    db.saveLogistics(newPartner);
    setShowLogisticsModal(false);
  };

  const handleSaveState = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingState?.name) return;

    const state: StateConfig = {
      id: editingState.id || 'st' + Math.random().toString(36).substr(2, 5),
      name: editingState.name,
      whatsappLink: editingState.whatsappLink || '',
      isActive: editingState.isActive ?? true
    };

    db.saveState(state);
    setShowStateModal(false);
    setEditingState(null);
  };

  const handleDeleteState = (id: string) => {
    if (window.confirm('Are you sure you want to delete this state configuration?')) {
      db.deleteState(id);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Logistics & Regional Controls</h1>
          <p className="text-slate-500 text-sm font-medium">Manage delivery partners and regional WhatsApp routing.</p>
        </div>
        <div className="flex gap-3">
          {isAuthorized && (
            <>
              <button 
                onClick={() => { setEditingState({}); setShowStateModal(true); }} 
                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition"
              >
                + Add State
              </button>
              <button 
                onClick={() => setShowLogisticsModal(true)} 
                className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition"
              >
                + Add Partner
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* States & WhatsApp Links */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Regional WhatsApp Routing</h3>
            <span className="text-[10px] font-bold text-slate-400">{states.length} Active Regions</span>
          </div>
          <div className="p-8 space-y-4">
            {states.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-xs font-bold italic">No states configured. Add one to enable regional routing.</p>
              </div>
            ) : (
              states.map(state => (
                <div key={state.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-black text-slate-800 text-sm">{state.name}</p>
                      {!state.isActive && <span className="text-[8px] font-black bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded uppercase">Inactive</span>}
                    </div>
                    <p className="text-[10px] text-emerald-600 font-bold truncate max-w-[200px] mt-1">{state.whatsappLink || 'No link set'}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isAuthorized && (
                      <>
                        <button 
                          onClick={() => { setEditingState(state); setShowStateModal(true); }}
                          className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded-xl shadow-sm border border-slate-100"
                        >
                          ✏️
                        </button>
                        <button 
                          onClick={() => handleDeleteState(state.id)}
                          className="p-2 text-slate-400 hover:text-red-600 bg-white rounded-xl shadow-sm border border-slate-100"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logistics Partners */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Logistics Partners</h3>
            <span className="text-[10px] font-bold text-slate-400">{partners.length} Registered</span>
          </div>
          <div className="p-8 space-y-4">
            {partners.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-slate-400 text-xs font-bold italic">No logistics partners registered.</p>
              </div>
            ) : (
              partners.map(partner => (
                <div key={partner.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-800 text-sm">{partner.name}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1">{partner.contactPerson} • {partner.phone}</p>
                  </div>
                  <a href={`tel:${partner.phone}`} className="w-10 h-10 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition">
                    📞
                  </a>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* State Modal */}
      {showStateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Regional Config</h2>
              <button onClick={() => setShowStateModal(false)} className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <form onSubmit={handleSaveState} className="p-10 space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">State Name</label>
                <input 
                  required 
                  placeholder="e.g. Lagos"
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500 font-bold"
                  value={editingState?.name || ''}
                  onChange={e => setEditingState({...editingState, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">WhatsApp Group Link</label>
                <input 
                  placeholder="https://chat.whatsapp.com/..."
                  className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-blue-500 font-medium text-sm"
                  value={editingState?.whatsappLink || ''}
                  onChange={e => setEditingState({...editingState, whatsappLink: e.target.value})}
                />
              </div>
              <div className="flex items-center gap-3 ml-1">
                <input 
                  type="checkbox"
                  id="isActive"
                  className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  checked={editingState?.isActive ?? true}
                  onChange={e => setEditingState({...editingState, isActive: e.target.checked})}
                />
                <label htmlFor="isActive" className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active for Routing</label>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowStateModal(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-100 hover:bg-blue-700 transition">
                  Save Region
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogisticsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Register Partner</h2>
              <button onClick={() => setShowLogisticsModal(false)} className="text-slate-400 hover:text-slate-600 bg-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm">✕</button>
            </div>
            <form onSubmit={handleAddLogistics} className="p-10 space-y-6">
              <input name="name" required placeholder="Company Name" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold" />
              <input name="contact" required placeholder="Contact Person Name" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold" />
              <input name="phone" required placeholder="Phone Number" className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold" />
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setShowLogisticsModal(false)} className="px-6 py-3 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition">Commit Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logistics;
