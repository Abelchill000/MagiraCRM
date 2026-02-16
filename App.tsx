
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
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close sidebar on mobile when tab changes
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeTab]);

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

  const mobileQuickActions = [
    { id: 'leads', icon: '⚡', label: 'Leads' },
    { id: 'orders', icon: '🛒', label: 'Orders' },
    { id: 'logistics', icon: '🚚', label: 'Logistics' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Overlay Backdrop */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setSidebarOpen} 
        userRole={user.role}
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">
        <Navbar 
          user={user} 
          onLogout={handleLogout} 
          onRoleSwitch={handleRoleSwitch}
          toggleSidebar={() => setSidebarOpen(!isSidebarOpen)} 
        />
        
        <main className="flex-1 p-4 md:p-8 overflow-y-auto overflow-x-hidden pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>

        {/* Mobile Quick Actions Dock */}
        <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 px-4 w-full max-w-sm">
          <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 p-2 flex items-center justify-around">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              <span className="text-lg">📊</span>
              <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
            </button>
            {mobileQuickActions.map(action => (
              <button 
                key={action.id}
                onClick={() => setActiveTab(action.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${activeTab === action.id ? 'text-emerald-400' : 'text-slate-400'}`}
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-[9px] font-black uppercase tracking-widest">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
