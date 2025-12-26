// ai-workspace/src/components/Header.tsx
import React from 'react';
import type { User } from '../types';
import { Menu, Bell, LogOut, Search } from 'lucide-react';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  toggleSidebar: () => void;
  title: string;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, toggleSidebar, title }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        {/* Search Mock */}
        <div className="hidden md:flex items-center bg-slate-100 rounded-full px-4 py-2 border border-transparent focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
          <Search size={18} className="text-slate-400" />
          <input 
            type="text" 
            placeholder="Search transcripts..." 
            className="bg-transparent border-none focus:outline-none ml-2 text-sm text-slate-700 w-48 lg:w-64 placeholder:text-slate-400"
          />
        </div>

        <button className="relative p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>

        <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

        <div className="flex items-center gap-3">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-slate-800">{user.name}</p>
            <p className="text-xs text-slate-500 truncate max-w-[150px]">{user.email}</p>
          </div>
          <div className="relative group">
            <button className="flex items-center gap-2">
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
              />
            </button>
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 hidden group-hover:block hover:block transform transition-all origin-top-right">
              <div className="px-4 py-2 border-b border-slate-100 md:hidden">
                <p className="text-sm font-medium text-slate-800">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
              <button 
                onClick={onLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;