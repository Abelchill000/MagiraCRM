
import React from 'react';
import { User, UserRole } from '../types.ts';

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
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center space-x-2 md:space-x-4">
        {/* Logo on the left */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-lg shadow-emerald-100">M</div>
          <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight">Magira</h1>
        </div>
      </div>

      <div className="flex items-center space-x-2 md:space-x-6">
        {/* Role Switcher - ADMIN ONLY */}
        {isAdmin && (
          <div className="hidden lg:flex items-center gap-2">
            <button
              onClick={() => onRoleSwitch(UserRole.SALES_AGENT)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border bg-slate-50 text-slate-600 border-slate-200 hover:bg-blue-50 hover:text-blue-700"
            >
              <span>🔄</span>
              <span>Agent View</span>
            </button>
            <button
              onClick={() => onRoleSwitch(UserRole.INVENTORY_MANAGER)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <span>🔄</span>
              <span>Inventory View</span>
            </button>
            <button
              onClick={() => onRoleSwitch(UserRole.LOGISTICS_MANAGER)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border bg-slate-50 text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700"
            >
              <span>🔄</span>
              <span>Logistics View</span>
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-none">{user.name}</p>
            <p className={`text-[9px] font-black uppercase mt-1 tracking-wider ${isAgent ? 'text-blue-600' : 'text-emerald-600'}`}>
              {user.role}
            </p>
          </div>
          
          {/* User Avatar */}
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-bold border-2 ${isAgent ? 'bg-blue-600 border-blue-200' : 'bg-emerald-600 border-emerald-200'}`}>
            {user.name.charAt(0)}
          </div>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Sign Out Button */}
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all group"
            title="Sign Out"
          >
            <span className="hidden lg:inline text-[10px] font-black uppercase tracking-widest">Sign Out</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          <button 
            onClick={toggleSidebar} 
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
            aria-label="Toggle Menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
