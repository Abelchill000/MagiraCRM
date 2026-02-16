
import React from 'react';
import { db } from '../services/mockDb';

const WhatsAppCenter: React.FC = () => {
  const states = db.getStates();

  const broadcastTemplate = `
🌿 MAGIRA HEALTH UPDATE
Hello everyone! We have fresh stock of Ginger & Beet Root shots available at our state hubs.
Price: ₦1,200 - ₦1,500
Contact your local manager to order!
🚚 Fast Delivery Guaranteed.
  `.trim();

  const copyTemplate = () => {
    navigator.clipboard.writeText(broadcastTemplate);
    alert('Template copied!');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">WhatsApp Control Center</h1>
        <p className="text-slate-500">Quick access to state distribution groups and broadcast tools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">State Groups</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {states.map(state => (
              <div key={state.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-emerald-500 transition-all flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-bold text-slate-800">{state.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">Magira Official Group</p>
                </div>
                <a 
                  href={state.whatsappGroupLink} 
                  target="_blank" 
                  rel="noreferrer"
                  className="mt-6 w-full bg-emerald-50 text-emerald-600 font-bold py-2 rounded-lg text-center hover:bg-emerald-600 hover:text-white transition"
                >
                  Join / Open Group
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col h-fit">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800">Broadcast Template</h3>
            <button onClick={copyTemplate} className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Copy</button>
          </div>
          <div className="flex-1 bg-slate-50 p-4 rounded-xl text-sm font-mono text-slate-600 whitespace-pre-wrap border border-slate-100">
            {broadcastTemplate}
          </div>
          <p className="text-xs text-slate-400 mt-4 italic">Use this for weekly status updates across all groups.</p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppCenter;
