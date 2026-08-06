import React, { useState, useEffect } from 'react';
import { Search, Bell, User, Moon, Sun, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Topbar() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('leben_theme') === 'dark';
  });
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('leben_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('leben_theme', 'light');
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/foods?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const mockNotifications = [
    { id: 1, type: 'info', title: 'Glicemia Estável', desc: 'Sua última medição (118 mg/dL) está dentro da faixa alvo.', time: 'Há 15 min' },
    { id: 2, type: 'warning', title: 'Lembrete de Medição', desc: 'Medir glicemia pós-prandial 2h após o almoço.', time: 'Em 45 min' },
    { id: 3, type: 'success', title: 'LEBEN Engine Pronta', desc: 'Perfis circadianos de ICR e ISF sincronizados.', time: 'Hoje, 08:00' }
  ];

  return (
    <header className="h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
      {/* Busca Global */}
      <form onSubmit={handleSearchSubmit} className="relative w-48 sm:w-72 md:w-96">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Pesquisar alimentos ou carboidratos no LEBEN..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 transition-colors"
        />
      </form>

      {/* Ações da Barra Superior */}
      <div className="flex items-center gap-2 sm:gap-3 relative">
        <button
          onClick={handleToggleTheme}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition-colors active:scale-95 shadow-xs"
          title="Alternar Tema Claro/Escuro"
        >
          {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-teal-600" />}
        </button>

        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 relative transition-colors active:scale-95 shadow-xs"
          title="Notificações e Alertas LEBEN"
        >
          <Bell className="w-5 h-5" />
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 absolute top-2 right-2 ring-2 ring-white dark:ring-slate-900 animate-pulse"></span>
        </button>

        {showNotifications && (
          <div className="absolute top-14 right-0 w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">Notificações & Alertas</h4>
              <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mockNotifications.map((n) => (
                <div key={n.id} className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 flex items-start gap-2.5">
                  {n.type === 'warning' ? (
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  )}
                  <div className="text-xs">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title}</p>
                    <p className="text-slate-500 dark:text-slate-400 mt-0.5">{n.desc}</p>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-1">{n.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-slate-200 dark:border-slate-800 text-left hover:opacity-85 transition-opacity active:scale-95"
          title="Ver Perfil do Paciente LEBEN"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-amber-500 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-white font-bold shadow-xs">
            <User className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Dr. Paciente'}</p>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold">LEBEN Diabetes</p>
          </div>
        </button>
      </div>
    </header>
  );
}
