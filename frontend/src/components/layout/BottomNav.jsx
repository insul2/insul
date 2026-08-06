import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Syringe, UtensilsCrossed, Droplet, BarChart3, User, Settings } from 'lucide-react';

export default function BottomNav() {
  const navItems = [
    { label: 'Início', path: '/', icon: LayoutDashboard },
    { label: 'Bolus', path: '/bolus', icon: Syringe },
    { label: 'Comida', path: '/foods', icon: UtensilsCrossed },
    { label: 'Glicemia', path: '/glucose', icon: Droplet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 flex items-center justify-between px-1 z-40 transition-colors overflow-x-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center min-w-[54px] sm:min-w-[64px] flex-1 py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-teal-600 dark:text-teal-400 font-bold scale-105'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] tracking-tight font-medium truncate">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}
