import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, 
  Syringe, 
  UtensilsCrossed, 
  Droplet, 
  BarChart3, 
  Bot,
  User, 
  Settings,
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Bolus', path: '/bolus', icon: Syringe },
    { label: 'Alimentação', path: '/foods', icon: UtensilsCrossed },
    { label: 'Glicemia', path: '/glucose', icon: Droplet },
    { label: 'Relatórios', path: '/reports', icon: BarChart3 },
    { label: 'Perfil', path: '/profile', icon: User },
    { label: 'Configurações', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between hidden md:flex min-h-screen transition-colors">
      <div>
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <img src="/logo.png" alt="LEBEN Logo" className="w-10 h-10 rounded-xl object-contain shadow-xs" />
          <div>
            <h1 className="font-black text-xl tracking-tight text-slate-900 dark:text-slate-100 leading-none">LEBEN</h1>
            <p className="text-[9px] text-teal-600 font-bold uppercase tracking-wider mt-1">Viva Mais. Preocupe-se Menos.</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-teal-500/10 text-teal-600 dark:bg-teal-500/15 dark:text-teal-400 border border-teal-500/20 dark:border-teal-500/30 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold py-2.5 rounded-xl border border-rose-500/20 transition-colors text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>

        <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 text-center font-medium">
          🌿 LEBEN Mobile PWA V4.0
        </div>
      </div>
    </aside>
  );
}
