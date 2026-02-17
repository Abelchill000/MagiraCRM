import React, { useState, useEffect } from 'react';
import { db } from '../services/mockDb.ts';

type CollectionType = 'users' | 'products' | 'orders' | 'leads' | 'states' | 'logistics';

const DatabaseExplorer: React.FC = () => {
  const [activeCollection, setActiveCollection] = useState<CollectionType>('users');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [data, setData] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState('');

  const refreshData = () => {
    setData({
      users: db.getUsers(),
      products: db.getProducts(),
      orders: db.getOrders(),
      leads: db.getLeads(),
      states: db.getStates(),
      logistics: db.getLogistics()
    });
  };

  useEffect(() => {
    refreshData();
    const unsubscribe = db.subscribe(refreshData);
    return () => unsubscribe();
  }, []);

  const collections = [
    { id: 'users', label: 'users', icon: '👤' },
    { id: 'orders', label: 'orders', icon: '🛒' },
    { id: 'products', label: 'inventory', icon: '📦' },
    { id: 'leads', label: 'leads', icon: '⚡' },
    { id: 'states', label: 'states', icon: '🗺️' },
    { id: 'logistics', label: 'logistics', icon: '🚚' }
  ];

  const currentDocs = (data[activeCollection] || []).filter((doc: any) => 
    JSON.stringify(doc).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDoc = (data[activeCollection] || []).find((doc: any) => doc.id === activeDocId);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-[#051e34] rounded-3xl overflow-hidden shadow-2xl border border-white/5">
      {/* Console Header */}
      <div className="bg-[#031525] px-6 py-4 flex items-center justify-between border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white text-lg">🔥</div>
          <div>
            <h2 className="text-white font-bold text-sm tracking-tight">Cloud Console <span className="text-white/30 mx-2 font-normal">/</span> <span className="text-amber-400 font-mono">Firestore</span></h2>
            <p className="text-[10px] text-white/40 font-mono uppercase tracking-widest mt-0.5">Project: magira-distribution-production</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20 text-xs">🔍</span>
            <input 
              type="text"
              placeholder="Filter documents..."
              className="bg-white/5 border border-white/10 rounded-md pl-8 pr-4 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-500 w-48 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <button onClick={refreshData} className="text-white/60 hover:text-white transition text-sm">🔄</button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Column 1: Collections */}
        <div className="w-48 md:w-64 border-r border-white/10 bg-[#031525]/50 overflow-y-auto shrink-0">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Collections</p>
          </div>
          <div className="p-2 space-y-1">
            {collections.map(col => (
              <button
                key={col.id}
                onClick={() => { setActiveCollection(col.id as CollectionType); setActiveDocId(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all ${
                  activeCollection === col.id 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-lg shadow-amber-900/10' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="text-base">{col.icon}</span>
                <span className="font-mono">{col.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Column 2: Documents */}
        <div className="w-56 md:w-80 border-r border-white/10 overflow-y-auto shrink-0 bg-[#041a2d]">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] sticky top-0 z-10">
            <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Documents</p>
          </div>
          <div className="divide-y divide-white/5">
            {currentDocs.length === 0 ? (
              <div className="p-8 text-center text-white/20 text-xs italic font-mono">No documents found</div>
            ) : (
              currentDocs.map((doc: any) => (
                <button
                  key={doc.id}
                  onClick={() => setActiveDocId(doc.id)}
                  className={`w-full text-left px-5 py-4 transition-all group ${
                    activeDocId === doc.id ? 'bg-blue-500/10 border-l-2 border-blue-500' : 'hover:bg-white/5'
                  }`}
                >
                  <p className={`font-mono text-[11px] truncate ${activeDocId === doc.id ? 'text-blue-400' : 'text-white/70'}`}>
                    {doc.id}
                  </p>
                  <p className="text-[9px] text-white/20 mt-1 truncate group-hover:text-white/40">
                    {doc.name || doc.customerName || doc.trackingId || 'Object'}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Document Content */}
        <div className="flex-1 overflow-y-auto bg-[#051e34]">
          {selectedDoc ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#051e34] z-10">
                <div>
                  <h3 className="text-white font-mono text-xs">{activeCollection} <span className="text-white/20">/</span> {selectedDoc.id}</h3>
                </div>
                <div className="flex gap-2">
                  <button className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded border border-blue-500/20">EDIT DOC</button>
                </div>
              </div>
              
              <div className="p-8">
                <div className="bg-[#031525] rounded-xl p-6 border border-white/10 font-mono text-[11px] text-blue-200 overflow-x-auto leading-relaxed shadow-inner">
                  <pre>{JSON.stringify(selectedDoc, null, 2)}</pre>
                </div>

                {/* Meta Info */}
                <div className="mt-8 grid grid-cols-2 gap-4">
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Index Status</p>
                    <p className="text-xs text-emerald-400 font-bold">✓ Synced</p>
                  </div>
                  <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Last Sync</p>
                    <p className="text-xs text-white/40 font-bold font-mono">{new Date().toLocaleTimeString()}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20 select-none">
              <div className="text-6xl mb-4">📄</div>
              <p className="text-white font-mono text-sm">Select a document to view contents</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseExplorer;