
import React from 'react';
import { UserRole } from '../types.ts';
import { db } from '../services/mockDb.ts';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userRole: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, userRole }) => {
  const pendingCount = db.getPendingUserCount();
  const abandonedCount = db.getAbandonedCarts().filter(c => c.status === 'abandoned').length;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { 
      id: 'products', 
      label: userRole === UserRole.ADMIN ? 'Inventory' : 'Stock Levels', 
      icon: '📦', 
      roles: [UserRole.ADMIN, UserRole.STATE_MANAGER] 
    },
    { id: 'leads', label: 'Web Leads', icon: '⚡', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { 
      id: 'abandoned', 
      label: 'Lost Carts', 
      icon: '🛒', 
      roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT],
      badge: abandonedCount > 0 ? abandonedCount : null,
      badgeColor: 'bg-amber-500'
    },
    { id: 'orders', label: 'Orders', icon: '📦', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { id: 'formbuilder', label: 'Page Builder', icon: '🧱', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { id: 'logistics', label: 'Logistics', icon: '🚚', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER] },
    { 
      id: 'users', 
      label: 'Team Access', 
      icon: '👤', 
      roles: [UserRole.ADMIN],
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-red-500'
    },
    { id: 'database', label: 'Database Console', icon: '🔥', roles: [UserRole.ADMIN] },
    { id: 'whatsapp', label: 'WhatsApp Hub', icon: '📱', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { id: 'analytics', label: 'Analytics', icon: '📈', roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside 
      className={`
        fixed inset-y-0 right-0 z-50 transition-all duration-300 transform bg-slate-900 text-white flex flex-col h-screen shadow-2xl
        md:relative md:inset-auto md:translate-x-0 md:bg-emerald-900
        ${isOpen ? 'translate-x-0 w-64' : 'translate-x-full md:translate-x-0 md:w-20'}
      `}
    >
      <div className={`p-6 flex items-center justify-between`}>
        <h2 className={`font-bold tracking-tight transition-all duration-300 ${isOpen ? 'text-2xl' : 'text-xl'}`}>
          {isOpen ? 'Magira CRM' : 'M'}
        </h2>
        <button 
          className="md:hidden text-slate-400 hover:text-white p-2"
          onClick={() => setIsOpen(false)}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <nav className="flex-1 mt-4 px-3 space-y-2 overflow-y-auto no-scrollbar">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            title={!isOpen ? item.label : undefined}
            className={`w-full flex items-center rounded-xl transition-all duration-200 group relative ${
              activeTab === item.id 
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/20' 
                : 'text-slate-400 md:text-emerald-100 hover:bg-slate-800 md:hover:bg-emerald-800/50'
            } ${isOpen ? 'px-4 py-3 space-x-3' : 'px-0 py-3 justify-center'}`}
          >
            <span className={`text-xl transition-transform duration-200 group-hover:scale-110 ${!isOpen ? 'mx-auto' : ''}`}>
              {item.icon}
            </span>
            {isOpen && (
              <span className="font-medium whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300 flex-1 text-sm">
                {item.label}
              </span>
            )}

            {item.badge && (
               <span className={`
                 flex items-center justify-center text-white font-black rounded-full animate-bounce
                 ${item.badgeColor || 'bg-red-500'}
                 ${isOpen ? 'text-[9px] w-5 h-5 ml-auto' : 'absolute top-1 right-1 w-4 h-4 text-[7px]'}
               `}>
                 {item.badge}
               </span>
            )}
            
            {!isOpen && activeTab === item.id && (
              <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
            )}
          </button>
        ))}
      </nav>

      <div className={`p-4 border-t border-slate-800 md:border-emerald-800/50 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 h-0 p-0 overflow-hidden'}`}>
        <p className="text-[10px] text-slate-500 md:text-emerald-300 uppercase tracking-widest font-black text-center">
          Premium Distribution
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
