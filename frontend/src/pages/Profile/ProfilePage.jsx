import React, { useState } from 'react';
import { User, Stethoscope, Save, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || 'Dr. Paciente Xivia');
  const [diabetesType, setDiabetesType] = useState('TYPE_1');
  const [weight, setWeight] = useState(72);
  const [height, setHeight] = useState(175);
  const [doctorName, setDoctorName] = useState('Dra. Amanda endocrinologia');
  const [emergencyPhone, setEmergencyPhone] = useState('(11) 99999-8888');
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <User className="w-7 h-7 text-sky-500" />
            <span>Perfil do Paciente & Dados Clínicos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Informações pessoais, biometria e contatos de emergência médica.</p>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta (Logout)</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm transition-colors">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-sky-500 to-purple-600 flex items-center justify-center text-2xl font-bold text-white shadow-md">
            XP
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{name}</h2>
            <span className="text-xs bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 px-2.5 py-0.5 rounded-full font-semibold">
              Diabetes Tipo 1 (DM1)
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nome Completo</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de Diabetes</label>
            <select
              value={diabetesType}
              onChange={(e) => setDiabetesType(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="TYPE_1">Diabetes Tipo 1 (DM1)</option>
              <option value="LADA">Diabetes LADA</option>
              <option value="TYPE_2">Diabetes Tipo 2 (Insulinodependente)</option>
              <option value="GESTATIONAL">Diabetes Gestacional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Peso (kg)</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Altura (cm)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 dark:text-white pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-purple-500" />
          <span>Acompanhamento Médico & Emergência</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Endocrinologista Responsável</label>
            <input
              type="text"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Telefone de Emergência (SOS Hipo)</label>
            <input
              type="text"
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="bg-sky-500 hover:bg-sky-400 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm flex items-center gap-2"
        >
          <Save className="w-5 h-5" />
          <span>{saved ? 'Perfil Salvo!' : 'Salvar Dados do Perfil'}</span>
        </button>
      </form>
    </div>
  );
}
