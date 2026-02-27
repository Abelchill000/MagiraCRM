
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
import AbandonedCarts from './pages/AbandonedCarts.tsx';
import UserManagement from './pages/UserManagement.tsx';
import DatabaseExplorer from './pages/DatabaseExplorer.tsx';

// Components
import Sidebar from './components/Sidebar.tsx';
import Navbar from './components/Navbar.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(db.getCurrentUser());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'pending'>('login');
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [signUpData, setSignUpData] = useState({ name: '', email: '', phone: '', password: '', role: UserRole.SALES_AGENT });
  const [isReady, setIsReady] = useState(db.isAuthReady());

  useEffect(() => {
    const unsub = db.subscribe(() => {
      const currentUser = db.getCurrentUser();
      setUser(currentUser);
      setIsReady(db.isAuthReady());
      
      if (currentUser && !currentUser.isApproved) {
        setAuthView('pending');
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [activeTab]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const loggedUser = await db.login(emailInput, passwordInput);
      setUser(loggedUser);
    } catch (err: any) {
      setAuthError(err.message);
      if (err.message.includes('pending')) {
        setAuthView('pending');
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsRegistering(true);
    
    try {
      await db.register(
        signUpData.name, 
        signUpData.email, 
        signUpData.phone,
        signUpData.password, 
        signUpData.role || UserRole.SALES_AGENT
      );
    } catch (err: any) {
      setAuthError(err.message || 'Registration Failure');
    } finally {
      setIsRegistering(false);
    }
  };

  const handleLogout = async () => {
    await db.logout();
    setUser(null);
    setAuthView('login');
    setPasswordInput('');
    setEmailInput('');
  };

  const handleRoleSwitch = async (newRole: UserRole) => {
    const updatedUser = await db.switchUserRole(newRole);
    if (updatedUser) {
      setUser({ ...updatedUser });
      if (newRole === UserRole.SALES_AGENT && (activeTab === 'analytics' || activeTab === 'formbuilder' || activeTab === 'users' || activeTab === 'database')) {
        setActiveTab('dashboard');
      }
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-50">
        <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-emerald-900 font-black uppercase tracking-widest text-[10px]">Verifying Magira Access...</p>
      </div>
    );
  }

  if (!user || !user.isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl mx-auto flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-emerald-200 mb-4">M</div>
            <h1 className="text-3xl font-black text-slate-800">Magira CRM</h1>
            <p className="text-slate-500 mt-2 text-sm font-medium">Distribution Network Hub</p>
          </div>

          {authView === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100 animate-pulse">{authError}</div>}
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
                Secure Cloud Login
              </button>
              <div className="text-center pt-4">
                <button type="button" onClick={() => { setAuthError(''); setAuthView('signup'); }} className="text-xs font-bold text-emerald-600 hover:underline">
                  Don't have an account? Sign Up as Agent
                </button>
              </div>
            </form>
          )}

          {authView === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {authError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl">
                  <p className="text-[11px] text-red-600 leading-relaxed font-medium">{authError}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                  <input 
                    type="text" required
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                  <input 
                    type="email" required
                    placeholder="agent@email.com"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">WhatsApp / Phone</label>
                  <input 
                    type="tel" required
                    placeholder="08012345678"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Requested Role</label>
                  <select 
                    required
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 font-bold text-sm"
                    onChange={e => setSignUpData({...signUpData, role: e.target.value as UserRole})}
                    value={signUpData.role || UserRole.SALES_AGENT}
                  >
                    <option value={UserRole.SALES_AGENT}>Sales Agent</option>
                    <option value={UserRole.INVENTORY_MANAGER}>Inventory Manager</option>
                    <option value={UserRole.LOGISTICS_MANAGER}>Logistics Manager</option>
                    <option value={UserRole.STATE_MANAGER}>State Manager</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <input 
                    type="password" required
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500"
                    onChange={e => setSignUpData({...signUpData, password: e.target.value})}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isRegistering}
                className={`w-full text-white font-black py-4 rounded-xl shadow-lg transition mt-4 flex items-center justify-center gap-2 ${isRegistering ? 'bg-slate-400' : 'bg-slate-900 hover:bg-black'}`}
              >
                {isRegistering ? 'Registering...' : 'Request System Access'}
              </button>
              <div className="text-center pt-4">
                <button type="button" onClick={() => { setAuthError(''); setAuthView('login'); }} className="text-xs font-bold text-slate-400 hover:text-slate-600">
                  Go back to Login
                </button>
              </div>
            </form>
          )}

          {authView === 'pending' && (
            <div className="text-center py-6 animate-in slide-in-from-bottom-4">
              <div className="text-6xl mb-6">🌩️</div>
              <h2 className="text-2xl font-black text-slate-800">Review in Progress</h2>
              <p className="text-slate-500 text-sm mt-4 px-4 leading-relaxed">
                Your profile has been captured for Magira Distribution.
                <br /><br />
                <strong className="text-emerald-600 font-black uppercase tracking-wider text-[11px]">Strict Security Policy:</strong><br />
                Your dashboard access is currently locked. An administrator will review your application and approve your credentials shortly.
              </p>
              <button 
                onClick={handleLogout} 
                className="mt-8 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition border border-slate-100 px-6 py-3 rounded-xl"
              >
                Log Out & Exit
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
      case 'abandoned': return <AbandonedCarts userRole={user.role} />;
      case 'users': return <UserManagement />;
      case 'database': return <DatabaseExplorer />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
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
      </div>
    </div>
  );
};

export default App;
