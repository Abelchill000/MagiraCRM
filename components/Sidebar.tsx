
import React from 'react';
import { UserRole } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  userRole: UserRole;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, userRole }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { 
      id: 'products', 
      label: userRole === UserRole.ADMIN ? 'Inventory' : 'Inventory Management', 
      icon: '📦', 
      roles: [UserRole.ADMIN, UserRole.STATE_MANAGER] 
    },
    { id: 'leads', label: 'Web Leads', icon: '⚡', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { id: 'orders', label: 'Orders', icon: '🛒', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { id: 'formbuilder', label: 'Form Builder', icon: '🧱', roles: [UserRole.ADMIN] },
    { id: 'logistics', label: 'Logistics', icon: '🚚', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER] },
    { id: 'whatsapp', label: 'WhatsApp Hub', icon: '📱', roles: [UserRole.ADMIN, UserRole.STATE_MANAGER, UserRole.SALES_AGENT] },
    { id: 'analytics', label: 'Analytics', icon: '📈', roles: [UserRole.ADMIN] },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside 
      className={`transition-all duration-300 bg-emerald-900 text-white flex flex-col h-screen sticky top-0 z-30 shadow-2xl ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      <div className={`p-6 flex items-center ${isOpen ? 'justify-start' : 'justify-center'}`}>
        <h2 className={`font-bold tracking-tight transition-all duration-300 ${isOpen ? 'text-2xl' : 'text-xl'}`}>
          {isOpen ? 'Magira CRM' : 'M'}
        </h2>
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
                : 'text-emerald-100 hover:bg-emerald-800/50'
            } ${isOpen ? 'px-4 py-3 space-x-3' : 'px-0 py-3 justify-center'}`}
          >
            <span className={`text-xl transition-transform duration-200 group-hover:scale-110 ${!isOpen ? 'mx-auto' : ''}`}>
              {item.icon}
            </span>
            {isOpen && (
              <span className="font-medium whitespace-nowrap overflow-hidden animate-in fade-in slide-in-from-left-2 duration-300">
                {item.label}
              </span>
            )}
            
            {!isOpen && activeTab === item.id && (
              <div className="absolute left-0 w-1 h-6 bg-white rounded-r-full" />
            )}
          </button>
        ))}
      </nav>

      <div className={`p-4 border-t border-emerald-800/50 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 h-0 p-0 overflow-hidden'}`}>
        <p className="text-[10px] text-emerald-300 uppercase tracking-widest font-black text-center">
          Premium Distribution
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
