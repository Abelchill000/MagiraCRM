
import React, { useState, useEffect } from 'react';
import { db } from './services/mockDb.ts';
import { User, UserRole } from './types.ts';

// Pages
import Dashboard from './pages/Dashboard.tsx';
import Products from './pages/Products.tsx';
import Orders from './pages/Orders.tsx';
import Logistics from './pages/Logistics.tsx';
import WhatsAppCenter from './pages/WhatsAppCenter.tsx';
import Analytics from './pages/Analytics.tsx';
import FormBuilder from './pages/FormBuilder.tsx';
import WebLeads from './pages/WebLeads.tsx';

// Components
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-600">Magira CRM</h1>
            <p className="text-slate-500 mt-2">Health Drink Distribution Management</p>
          </div>
          <div className="space-y-4">
            <button 
              onClick={() => setUser(db.login(UserRole.ADMIN))}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Login as Admin
            </button>
            <button 
              onClick={() => setUser(db.login(UserRole.STATE_MANAGER))}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg transition"
            >
              Login as State Manager
            </button>
            <button 
              onClick={() => setUser(db.login(UserRole.SALES_AGENT))}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-lg transition"
            >
              Login as Sales Agent
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    db.logout();
    setUser(null);
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    const updatedUser = db.switchUserRole(newRole);
    if (updatedUser) {
      setUser({ ...updatedUser });
      if (newRole === UserRole.SALES_AGENT && (activeTab === 'analytics' || activeTab === 'formbuilder')) {
        setActiveTab('dashboard');
      }
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'products': return <Products userRole={user.role} />;
      case 'orders': return <Orders user={user} />;
      case 'logistics': return <Logistics userRole={user.role} />;
      case 'whatsapp': return <WhatsAppCenter />;
      case 'analytics': return <Analytics />;
      case 'formbuilder': return <FormBuilder />;
      case 'leads': return <WebLeads userRole={user.role} />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setSidebarOpen} 
        userRole={user.role}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          onRoleSwitch={handleRoleSwitch}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
        />
        <main className="p-4 md:p-8 overflow-y-auto max-h-[calc(100vh-64px)]">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;