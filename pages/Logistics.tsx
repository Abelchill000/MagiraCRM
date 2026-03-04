
import React, { useState } from 'react';
import { db } from '../services/mockDb';
import { LogisticsPartner, UserRole } from '../types';

const Logistics: React.FC<{ userRole: UserRole }> = ({ userRole }) => {
  const user = db.getCurrentUser();
  const [partners, setPartners] = useState<LogisticsPartner[]>(db.getLogistics());
  const [showLogisticsModal, setShowLogisticsModal] = useState(false);

  // Access check
  const isLogisticsManager = user?.role === UserRole.LOGISTICS_MANAGER || user?.email === 'iconfidence909@gmail.com';
  const isAuthorized = userRole === UserRole.ADMIN || isLogisticsManager;

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
    setPartners(db.getLogistics());
    setShowLogisticsModal(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Logistics Partners</h1>
          <p className="text-slate-500">Manage delivery partners and couriers.</p>
        </div>
        <div className="space-x-2">
          {isAuthorized && (
            <button onClick={() => setShowLogisticsModal(true)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700">
              Add Partner
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Logistics Partners</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partners.map(partner => (
            <div key={partner.id} className="p-4 bg-white border border-slate-100 rounded-xl shadow-sm flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800">{partner.name}</p>
                <p className="text-sm text-slate-500">{partner.contactPerson} • {partner.phone}</p>
              </div>
              <button className="p-2 text-slate-300 hover:text-emerald-500 transition">📞</button>
            </div>
          ))}
        </div>
      </div>

      {showLogisticsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 uppercase tracking-tight font-black">Register Partner</h2>
            <form onSubmit={handleAddLogistics} className="space-y-4">
              <input name="name" required placeholder="Company Name" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              <input name="contact" required placeholder="Contact Person Name" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              <input name="phone" required placeholder="Phone Number" className="w-full border border-slate-200 rounded-lg px-4 py-2" />
              <div className="flex justify-end space-x-3 mt-6">
                <button type="button" onClick={() => setShowLogisticsModal(false)} className="text-slate-400 font-bold uppercase text-[10px]">Cancel</button>
                <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-100">Commit Partner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Logistics;
