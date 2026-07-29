import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';
import XiviaAIFloating from './XiviaAIFloating';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 md:pb-0 transition-colors duration-200">
      {/* Sidebar Lateral para Desktops */}
      <Sidebar />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra Superior Universal */}
        <Topbar />

        {/* Rotas Dinâmicas */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        {/* Rodapé */}
        <Footer />
      </div>

      {/* Navegação Inferior para Dispositivos Móbiles */}
      <BottomNav />

      {/* Assistente Flutuante Xivia AI Global */}
      <XiviaAIFloating />
    </div>
  );
}
