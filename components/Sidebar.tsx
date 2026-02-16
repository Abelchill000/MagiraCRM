
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
    <aside className={`${isOpen ? 'w-64' : 'w-0 overflow-hidden'} transition-all duration-300 bg-emerald-900 text-white flex flex-col h-screen sticky top-0`}>
      <div className="p-6">
        <h2 className="text-2xl font-bold tracking-tight">Magira CRM</h2>
      </div>
      <nav className="flex-1 mt-4 px-4 space-y-2">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors ${
              activeTab === item.id ? 'bg-emerald-600 text-white' : 'text-emerald-100 hover:bg-emerald-800'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-6 border-t border-emerald-800">
        <p className="text-xs text-emerald-300 uppercase tracking-widest font-semibold">Magira Health Drinks</p>
      </div>
    </aside>
  );
};

export default Sidebar;
