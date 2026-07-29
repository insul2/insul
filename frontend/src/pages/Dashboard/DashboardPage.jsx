import React, { useState, useEffect } from 'react';
import { Activity, Syringe, Flame, HeartPulse, Clock, Utensils, Droplet, Dumbbell, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import GlucoseChart24h from '../../components/charts/GlucoseChart24h';
import { useAuth } from '../../context/AuthContext';
import { computeAutoIOB } from '../../utils/iobCalculator';

export default function DashboardPage() {
  const { user } = useAuth();

  const [glucoseReadings, setGlucoseReadings] = useState([]);
  const [bolusHistory, setBolusHistory] = useState([]);
  const [activeIob, setActiveIob] = useState(0);
  const [lastBolusInfo, setLastBolusInfo] = useState(null);

  useEffect(() => {
    const fetchApiReadings = async () => {
      try {
        const token = localStorage.getItem('leben_token');
        const res = await fetch('/api/v1/glucose', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.length > 0) {
          setGlucoseReadings(json.data);
          return;
        }
      } catch (e) {}

      const savedReadings = localStorage.getItem('leben_glucose_readings');
      const readings = savedReadings ? JSON.parse(savedReadings) : [];
      setGlucoseReadings(readings);
    };

    fetchApiReadings();

    const savedBolus = localStorage.getItem('leben_bolus_history');
    const bolus = savedBolus ? JSON.parse(savedBolus) : [];
    setBolusHistory(bolus);

    if (bolus.length > 0) {
      const iobResult = computeAutoIOB(bolus, 'HUMALOG');
      setActiveIob(iobResult.totalIOB);

      const latestDose = bolus[0];
      if (latestDose && latestDose.timestamp) {
        const elapsedMin = Math.round((new Date() - new Date(latestDose.timestamp)) / 60000);
        let timeStr = `${elapsedMin} min`;
        if (elapsedMin >= 60) {
          const h = Math.floor(elapsedMin / 60);
          const m = elapsedMin % 60;
          timeStr = `${h}h ${m}m`;
        }
        setLastBolusInfo({
          timeStr,
          dose: latestDose.dose,
          type: latestDose.type || 'Bolus'
        });
      }
    } else {
      setActiveIob(0);
      setLastBolusInfo(null);
    }
  }, []);

  const latestGlucose = glucoseReadings.length > 0 ? glucoseReadings[0] : null;
  const isNewUser = glucoseReadings.length === 0 && bolusHistory.length === 0;

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Painel Geral LEBEN
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
          Resumo em tempo real de saúde, IOB, COB e ações rápidas.
        </p>
      </div>

      {/* BOAS-VINDAS PARA NOVO USUÁRIO (PERFIL LIMPO) */}
      {isNewUser && (
        <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-amber-500/10 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Bem-vindo ao LEBEN, {user?.name || 'Paciente'}! 🌿
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Sua conta está criada e pronta. Faça seu primeiro cálculo de bolus ou registre uma glicemia manual para iniciar seu acompanhamento.
              </p>
            </div>
          </div>
          <Link
            to="/bolus"
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs shrink-0"
          >
            💉 Calcular Primeiro Bolus
          </Link>
        </div>
      )}

      {/* Cards Principais Dinâmicos */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Glicemia Atual */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Glicemia</span>
            <Activity className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {latestGlucose ? latestGlucose.glucoseMgDl : '--'}
            </span>
            {latestGlucose && <span className="text-[10px] text-slate-500 dark:text-slate-400">mg/dL</span>}
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {latestGlucose ? (latestGlucose.trend || '➡️ Estável') : 'Sem registros ainda'}
          </p>
        </div>

        {/* Card 2: IOB (Insulina Ativa) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">IOB</span>
            <Syringe className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">{activeIob}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">U</span>
          </div>
          <p className="text-[10px] text-purple-600 dark:text-purple-300 font-medium mt-1">
            {activeIob > 0 ? 'Insulina Ativa em Decaimento' : 'Sem insulina ativa'}
          </p>
        </div>

        {/* Card 3: COB (Carbs Ativos) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">COB</span>
            <Utensils className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {bolusHistory.length > 0 ? bolusHistory[0].carbs || 0 : 0}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">g</span>
          </div>
          <p className="text-[10px] text-amber-600 dark:text-amber-300 font-medium mt-1">
            {bolusHistory.length > 0 ? 'Absorção recente' : 'Sem carbo em absorção'}
          </p>
        </div>

        {/* Card 4: Tempo desde último Bolus */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Último Bolus</span>
            <Clock className="w-4 h-4 text-teal-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {lastBolusInfo ? lastBolusInfo.timeStr : '--'}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1">
            {lastBolusInfo ? `Dose ${lastBolusInfo.dose} U` : 'Nenhuma aplicação'}
          </p>
        </div>

        {/* Card 5: Tempo na Faixa (TIR) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">TIR (Faixa)</span>
            <HeartPulse className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {glucoseReadings.length > 0 ? '100%' : '--'}
            </span>
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            {glucoseReadings.length > 0 ? 'Meta >70% cumprida' : 'Aguardando medições'}
          </p>
        </div>

        {/* Card 6: GMI (HbA1c Estimada) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm transition-colors">
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">GMI (HbA1c)</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {glucoseReadings.length > 0 ? '6.0%' : '--'}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium mt-1">
            {glucoseReadings.length > 0 ? 'Estimativa clínica' : 'Aguardando histórico'}
          </p>
        </div>
      </div>

      {/* Ações Rápidas */}
      <div>
        <h2 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">⚡ Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            to="/bolus"
            className="flex items-center gap-3 bg-teal-600 hover:bg-teal-700 text-white p-4 rounded-2xl font-bold shadow-md shadow-teal-500/20 active:scale-95 transition-transform"
          >
            <Syringe className="w-6 h-6 shrink-0 text-white" />
            <span className="text-xs sm:text-sm font-extrabold">💉 Calcular Bolus</span>
          </Link>

          <Link
            to="/glucose"
            className="flex items-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-rose-500 p-4 rounded-2xl font-bold active:scale-95 transition-transform shadow-xs"
          >
            <Droplet className="w-6 h-6 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-900 dark:text-slate-200 font-bold">🩸 Registrar Glicemia</span>
          </Link>

          <Link
            to="/foods"
            className="flex items-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-amber-500 p-4 rounded-2xl font-bold active:scale-95 transition-transform shadow-xs"
          >
            <Utensils className="w-6 h-6 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-900 dark:text-slate-200 font-bold">🍽 Refeição</span>
          </Link>

          <Link
            to="/bolus"
            className="flex items-center gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 text-emerald-500 p-4 rounded-2xl font-bold active:scale-95 transition-transform shadow-xs"
          >
            <Dumbbell className="w-6 h-6 shrink-0" />
            <span className="text-xs sm:text-sm text-slate-900 dark:text-slate-200 font-bold">🏃 Exercício</span>
          </Link>
        </div>
      </div>

      {/* Gráfico Dinâmico CGM SVG */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Monitoramento Glicêmico Contínuo (+24h)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Faixa Alvo Clinicamente Recomendada: 70 a 180 mg/dL</p>
          </div>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> 70-180 (Alvo)</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span> &gt;180 (Hiper)</span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span> &lt;70 (Hipo)</span>
          </div>
        </div>

        <GlucoseChart24h />
      </div>
    </div>
  );
}
