// ai-workspace/src/components/Sidebar.tsx
import React from 'react';
import { View } from '../types';
import { BrainCircuit, type LucideIcon } from 'lucide-react';

interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
}

interface SidebarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  isOpen: boolean;
  navItems: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, navItems }) => {
  return (
    <aside 
      className={`
        bg-slate-900 text-white flex flex-col transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64' : 'w-0 md:w-20'} 
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        fixed md:relative z-30 h-full border-r border-slate-800
      `}
    >
      <div className="h-16 flex items-center justify-center border-b border-slate-800">
        <div className="flex items-center gap-3 px-4 w-full overflow-hidden">
          <div className="min-w-[2rem] text-blue-500">
             <BrainCircuit size={32} />
          </div>
          <span className={`font-bold text-xl whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>
            AI Workspace
          </span>
        </div>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = currentView === item.view;
            return (
              <li key={item.view}>
                <button
                  onClick={() => onChangeView(item.view)}
                  className={`
                    w-full flex items-center gap-4 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                      : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }
                  `}
                  title={!isOpen ? item.label : ''}
                >
                  <div className="min-w-[1.5rem]">
                    <item.icon size={24} />
                  </div>
                  <span className={`whitespace-nowrap transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 md:hidden'}`}>
                    {item.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className={`text-xs text-slate-500 text-center ${isOpen ? 'block' : 'hidden md:hidden'}`}>
          v0.1.0 Beta
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;