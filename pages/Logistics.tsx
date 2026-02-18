
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { LogisticsPartner, State, UserRole } from '../types';

const Logistics: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [partners, setPartners] = useState<LogisticsPartner[]>(db.getLogistics());
  const [states, setStates] = useState<State[]>(db.getStates());
  const [showStateModal, setShowStateModal] = useState(false);
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);

  // Access check for specific email
  const isLogisticsManager = user?.email === 'iconfidence909@gmail.com';
  const isAuthorized = userRole === UserRole.ADMIN || isLogisticsManager;

  const handleAddState = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newState: State = {
      id: editingState?.id || 's' + Math.random().toString(36).substr(2, 5),
      name: formData.get('name') as string,
      whatsappGroupLink: formData.get('whatsapp') as string
    };
    db.saveState(newState);
    setStates(db.getStates());
    setShowStateModal(false);
    setEditingState(null);
  };

  const handleAddLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const newPartner: LogisticsPartner = {
      id: 'l' + Math.random().toString(36).substr(2, 5),
      name: formData.get('name') as string,
      stateId: formData.get('stateId') as string,
      contactPerson: formData.get('contact') as string,
      phone: formData.get('phone') as string,
    };
    db.saveLogistics(newPartner);
    setPartners(db.getLogistics());
    setShowLogisticsModal(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logistics & States</h1>
          <p className="text-slate-500">Manage state hubs and delivery partners.</p>
        </div>
        <div className="space-x-2">
          {isAuthorized && (
            <button onClick={() => { setEditingState(null); setShowStateModal(true); }} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg font-medium hover:bg-slate-50">
              Add State
            </button>
          )}
          {isAuthorized && (
            <button onClick={() => setShowLogisticsModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
              Add Partner
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* States List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Active States</h3>
          <div className="space-y-3">
            {states.map(state => (
              <div key={state.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between group">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-800">{state.name}</p>
                  <p className="text-xs text-slate-500 truncate max-w-[200px]">{state.whatsappGroupLink}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                    {partners.filter(p => p.stateId === state.id).length} Partners
                  </span>
                  {isAuthorized && (
                    <button 
                      onClick={() => { setEditingState(state); setShowStateModal(true); }}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 transition opacity-0 group-hover:opacity-100"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Partners List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Logistics Partners</h3>
          <div className="space-y-3">
            {partners.map(partner => (
              <div key={partner.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-bold text-slate-800">{partner.name}</p>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded uppercase font-bold">
                      {states.find(s => s.id === partner.stateId)?.name}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{partner.contactPerson} • {partner.phone}</p>
                </div>
                <button className="p-2 text-slate-300 hover:text-emerald-500 transition">📞</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showStateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">{editingState ? 'Edit State Hub' : 'Add New State'}</h2>
            <form onSubmit={handleAddState} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">State Name</label>
                <input name="name" required defaultValue={editingState?.name || ''} placeholder="e.g. Enugu" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">WhatsApp Group Link</label>
                <input name="whatsapp" required defaultValue={editingState?.whatsappGroupLink || ''} placeholder="https://chat.whatsapp.com/..." className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => { setShowStateModal(false); setEditingState(null); }} className="text-slate-400">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLogisticsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Register Partner</h2>
            <form onSubmit={handleAddLogistics} className="space-y-4">
              <input name="name" required placeholder="Company Name" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              <select name="stateId" required className="w-full border border-slate-200 rounded-lg px-4 py-2">
                <option value="">-- Assign to State --</option>
                {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input name="contact" required placeholder="Contact Person Name" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              <input name="phone" required placeholder="Phone Number" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowLogisticsModal(false)} className="text-slate-400">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Save Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logistics;
