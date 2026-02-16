
import React from 'react';
import { User, UserRole } from '../types';

interface NavbarProps {
  user: User;
  onLogout: () => void;
  onRoleSwitch: (role: UserRole) => void;
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ user, onLogout, onRoleSwitch, toggleSidebar }) => {
  const isAgent = user.role === UserRole.SALES_AGENT;
  const isAdmin = user.role === UserRole.ADMIN;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center space-x-4">
        <button onClick={toggleSidebar} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="hidden md:block">
          <h1 className="text-lg font-semibold text-slate-800 capitalize">Magira Central CRM</h1>
        </div>
      </div>

      <div className="flex items-center space-x-3 md:space-x-6">
        {/* Role Switcher - Accessible if the user "is" an admin or in agent mode but was an admin */}
        {/* For this mock app, we'll allow switching if role is Admin or Agent */}
        {(isAdmin || isAgent) && (
          <button
            onClick={() => onRoleSwitch(isAdmin ? UserRole.SALES_AGENT : UserRole.ADMIN)}
            className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
              isAdmin 
                ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200' 
                : 'bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700'
            }`}
          >
            <span>🔄</span>
            <span>{isAdmin ? 'Switch to Agent View' : 'Back to Admin'}</span>
          </button>
        )}

        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-900 leading-none">{user.name}</p>
            <p className={`text-[10px] font-black uppercase mt-1 tracking-wider ${isAgent ? 'text-blue-600' : 'text-emerald-600'}`}>
              {user.role}
            </p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold border-2 ${isAgent ? 'bg-blue-600 border-blue-200' : 'bg-emerald-600 border-emerald-200'}`}>
            {user.name.charAt(0)}
          </div>
          <button 
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            title="Logout"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
