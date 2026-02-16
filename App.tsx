
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
import UserManagement from './pages/UserManagement.tsx';

// Components
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'pending'>('login');
  const [authError, setAuthError] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signUpData, setSignUpData] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const loggedUser = db.login(emailInput, passwordInput);
      setUser(loggedUser);
    } catch (err: any) {
      setAuthError(err.message);
      if (err.message === 'Account pending approval') {
        setAuthView('pending');
      }
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      db.register(signUpData.name, signUpData.email, signUpData.password, UserRole.SALES_AGENT);
      setAuthView('pending');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    db.logout();
    setUser(null);
    setAuthView('login');
    setPasswordInput('');
  };

  const handleRoleSwitch = (newRole: UserRole) => {
    const updatedUser = db.switchUserRole(newRole);
    if (updatedUser) {
      setUser({ ...updatedUser });
      if (newRole === UserRole.SALES_AGENT && (activeTab === 'analytics' || activeTab === 'formbuilder' || activeTab === 'users')) {
        setActiveTab('dashboard');
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-emerald-200 mb-4">M</div>
            <h1 className="text-3xl font-black text-slate-800">Magira CRM</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Distribution & Sales Management</p>
          </div>

          {authView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{authError}</div>}
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                <input 
                  type="email" required
                  placeholder="admin@magiracrm.store"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                <input 
                  type="password" required
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                  value={passwordInput}
                  onChange={e => setPasswordInput(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-200 transition">
                Enter Dashboard
              </button>
              <div className="text-center pt-4">
                <button type="button" onClick={() => setAuthView('signup')} className="text-xs font-bold text-emerald-600 hover:underline">
                  Don't have an account? Sign Up as Agent
                </button>
              </div>
            </form>
          )}

          {authView === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">{authError}</div>}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <input 
                    type="text" required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                  <input 
                    type="email" required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Create Password</label>
                  <input 
                    type="password" required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, password: e.target.value})}
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-lg transition mt-4">
                Register for Approval
              </button>
              <div className="text-center pt-4">
                <button type="button" onClick={() => setAuthView('login')} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                  Already have an account? Log In
                </button>
              </div>
            </form>
          )}

          {authView === 'pending' && (
            <div className="text-center py-6 animate-in slide-in-from-bottom-4">
              <div className="text-6xl mb-6">⏳</div>
              <h2 className="text-2xl font-black text-slate-800">Pending Approval</h2>
              <p className="text-slate-500 text-sm mt-4 px-4 leading-relaxed">
                Your application has been received. Our administrators will review your profile shortly. Please check back later.
              </p>
              <button onClick={() => setAuthView('login')} className="mt-8 text-xs font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-6 py-3 rounded-full">
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

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
      case 'users': return <UserManagement />;
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
