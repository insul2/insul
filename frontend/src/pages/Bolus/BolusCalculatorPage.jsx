import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Syringe, AlertTriangle, ShieldCheck, Zap, Sparkles, CheckCircle2, Clock, Info, RefreshCw, Plus, Trash2, Sun, Moon, Sunrise, Sunset, Timer } from 'lucide-react';
import { computeAutoIOB } from '../../utils/iobCalculator';

export default function BolusCalculatorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const circadianProfiles = [
    { name: '🌅 Café da Manhã', startHour: 6, endHour: 11, icr: 9, isf: 32, icon: Sunrise },
    { name: '☀️ Almoço / Tarde', startHour: 12, endHour: 17, icr: 13, isf: 42, icon: Sun },
    { name: '🌙 Jantar', startHour: 18, endHour: 23, icr: 11, isf: 38, icon: Sunset },
    { name: '🌌 Madrugada', startHour: 0, endHour: 5, icr: 17, isf: 55, icon: Moon },
  ];

  const currentHour = new Date().getHours();
  const autoProfile = circadianProfiles.find(
    (p) => currentHour >= p.startHour && currentHour <= p.endHour
  ) || circadianProfiles[1];

  const [history] = useState(() => {
    const saved = localStorage.getItem('leben_bolus_history');
    return saved ? JSON.parse(saved) : [];
  });

  const [glucose, setGlucose] = useState(() => {
    const savedReadings = localStorage.getItem('leben_glucose_readings');
    if (savedReadings) {
      const parsed = JSON.parse(savedReadings);
      if (parsed.length > 0) return parsed[0].glucoseMgDl || 140;
    }
    return 140;
  });

  const initialCarbs = searchParams.get('carbs') || '45';
  const [carbs, setCarbs] = useState(initialCarbs);
  const [iob, setIob] = useState(0.0);
  const [icr, setIcr] = useState(autoProfile.icr);
  const [isf, setIsf] = useState(autoProfile.isf);
  const [exercise, setExercise] = useState('NONE');
  const [insulinType, setInsulinType] = useState('HUMALOG');
  const [activeProfileName, setActiveProfileName] = useState(autoProfile.name);

  // NOVO MOTOR: Timing de Aplicação Antecipada (Pre-Bolus Timing)
  const [preBolusMinutes, setPreBolusMinutes] = useState(0); // 0, 15, 30, 60, 120

  const [mealItems, setMealItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCarbs, setNewItemCarbs] = useState('');

  const [loading, setLoading] = useState(false);
  const [calculationResult, setCalculationResult] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [activeDosesInfo, setActiveDosesInfo] = useState([]);

  const updateAutoIOB = (currentHistory, type) => {
    const result = computeAutoIOB(currentHistory, type);
    setIob(result.totalIOB);
    setActiveDosesInfo(result.activeDoses);
  };

  useEffect(() => {
    const urlCarbs = searchParams.get('carbs');
    if (urlCarbs) {
      setCarbs(urlCarbs);
    }
    updateAutoIOB(history, insulinType);
  }, [searchParams, insulinType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateRealtimeDose();
    }, 200);
    return () => clearTimeout(timer);
  }, [glucose, carbs, iob, icr, isf, exercise, preBolusMinutes]);

  const calculateRealtimeDose = async () => {
    if (!glucose || Number(glucose) <= 0) return;
    try {
      const token = localStorage.getItem('leben_token');
      const response = await fetch('/api/v1/bolus/calculate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          glucose: Number(glucose),
          carbs: Number(carbs || 0),
          iob: Number(iob || 0),
          icr: Number(icr || 10),
          isf: Number(isf || 40),
          exercise
        })
      });

      const json = await response.json();
      if (json.status === 'success') {
        setCalculationResult(json.data);
      }
    } catch (err) {
      console.error('Falha no cálculo em tempo real:', err);
    }
  };

  const handleAddMealItem = (e) => {
    e.preventDefault();
    if (!newItemName || !newItemCarbs) return;
    const itemCarbs = Number(newItemCarbs);
    const updatedItems = [...mealItems, { name: newItemName, carbs: itemCarbs }];
    setMealItems(updatedItems);
    setNewItemName('');
    setNewItemCarbs('');

    const totalMealCarbs = updatedItems.reduce((acc, i) => acc + i.carbs, 0);
    setCarbs(String(totalMealCarbs));
  };

  const handleRemoveMealItem = (index) => {
    const updatedItems = mealItems.filter((_, i) => i !== index);
    setMealItems(updatedItems);
    const totalMealCarbs = updatedItems.reduce((acc, i) => acc + i.carbs, 0);
    setCarbs(String(totalMealCarbs));
  };

  const handleSelectProfile = (p) => {
    setIcr(p.icr);
    setIsf(p.isf);
    setActiveProfileName(p.name);
  };

  const handleRegisterDose = () => {
    if (!calculationResult || appliedSuccess) return;

    const preBolusNote = preBolusMinutes > 0 
      ? ` [Pré-Bolus Antecipado em ${preBolusMinutes} min]`
      : '';

    const newRecord = {
      id: String(Date.now()),
      dose: calculationResult.recommendedDose,
      glucose: Number(glucose),
      carbs: Number(carbs),
      type: (Number(carbs) > 0 ? 'Bolus Alimentar + Correção' : 'Bolus Corretivo') + preBolusNote,
      timestamp: new Date().toISOString(),
      auditHash: calculationResult.auditHash
    };

    const updated = [newRecord, ...history];
    localStorage.setItem('leben_bolus_history', JSON.stringify(updated));
    setAppliedSuccess(true);

    setTimeout(() => {
      navigate('/glucose');
    }, 600);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Syringe className="w-7 h-7 text-teal-600" />
          <span>Calculadora Inteligente de Bolus LEBEN</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Auto-detecção circadiana, IOB automático e Motor de Aplicação Antecipada (Pre-Bolus Timing).
        </p>
      </div>

      {/* PAINEL DE APLICAÇÃO ANTECIPADA (PRE-BOLUS TIMING) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Timer className="w-4 h-4 text-teal-600" />
            <span>Planejamento de Horário da Refeição (Antecedência)</span>
          </span>
          {preBolusMinutes > 0 && (
            <span className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
              Antecedência: {preBolusMinutes} min
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { min: 0, label: '0 min (Agora)' },
            { min: 15, label: '15 min (Ideal)' },
            { min: 30, label: '30 min' },
            { min: 60, label: '1 hora antes' },
            { min: 120, label: '2 horas antes' }
          ].map((item) => (
            <button
              key={item.min}
              type="button"
              onClick={() => setPreBolusMinutes(item.min)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                preBolusMinutes === item.min
                  ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400 text-xs'
              }`}
            >
              <div className="text-xs font-bold">{item.label}</div>
            </button>
          ))}
        </div>

        {preBolusMinutes > 30 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-800 dark:text-amber-300 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>ALERTA DE ANTECIPAÇÃO LONGA ({preBolusMinutes} MINUTOS)</span>
            </p>
            <p className="text-[11px]">
              Aplicar a dose de insulina {preBolusMinutes} min antes de comer fará com que a insulina atinja o pico ANTES da comida ser absorvida. Certifique-se de ingerir a refeição no horário planejado para evitar queda glicêmica precoce.
            </p>
          </div>
        )}
      </div>

      {/* BARRA DE AUTO-DETECÇÃO DE PERFIL CIRCADIANO */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            <span>Perfil Circadiano LEBEN ({new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})</span>
          </span>
          <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-bold">
            Ativo: {activeProfileName}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {circadianProfiles.map((p, idx) => {
            const Icon = p.icon;
            const isSelected = activeProfileName === p.name;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectProfile(p)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-sm font-bold'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                }`}
              >
                <div className="flex items-center gap-2 text-xs">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{p.name}</span>
                </div>
                <div className="text-[10px] opacity-90 mt-1">
                  ICR: {p.icr}g | ISF: {p.isf}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-r from-purple-900/10 via-teal-500/10 to-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 mt-0.5 shadow-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Insulina Ativa (IOB): <span className="text-purple-600 dark:text-purple-400 text-base">{iob} U</span></h3>
              <span className="text-[10px] bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full border border-purple-200">
                Calculado Automático
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              {activeDosesInfo.length > 0
                ? `${activeDosesInfo.length} dose(s) ativa(s) nos últimos 4h em decaimento polinomial.`
                : 'Nenhuma dose ativa nas últimas 4 horas.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => updateAutoIOB(history, insulinType)}
          className="inline-flex items-center gap-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-teal-600" />
          <span>Atualizar IOB</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm transition-colors">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center justify-between">
            <span>Parâmetros de Cálculo (Altere Livremente)</span>
            <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
              Tempo Real ⚡
            </span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Glicemia Atual (mg/dL)</label>
              <input
                type="number"
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Carboidratos (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-purple-600 dark:text-purple-400 mb-1 font-bold flex items-center gap-1">
                <span>IOB (Insulina Ativa - U)</span>
                <Info className="w-3.5 h-3.5" title="Preenchido automaticamente com base no histórico" />
              </label>
              <input
                type="number"
                step="0.1"
                value={iob}
                onChange={(e) => setIob(e.target.value)}
                className="w-full bg-purple-50/50 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800 rounded-xl px-4 py-2.5 text-base font-extrabold text-purple-600 dark:text-purple-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de Insulina</label>
              <select
                value={insulinType}
                onChange={(e) => setInsulinType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-semibold"
              >
                <option value="HUMALOG">Humalog / Novorapid / Apidra (4h)</option>
                <option value="FIASP">Fiasp / Lumjev (3h Ultra-rápida)</option>
                <option value="REGULAR">Insulina Regular (6h)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ICR (g/U)</label>
              <input
                type="number"
                value={icr}
                onChange={(e) => setIcr(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-300 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">ISF (mg/dL/U)</label>
              <input
                type="number"
                value={isf}
                onChange={(e) => setIsf(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-800 dark:text-slate-300 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              🍽 Calculadora Auxiliar da Refeição (Soma de Itens)
            </h3>

            <form onSubmit={handleAddMealItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Item (ex: Arroz cozido)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <input
                type="number"
                placeholder="Carbs (g)"
                value={newItemCarbs}
                onChange={(e) => setNewItemCarbs(e.target.value)}
                className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-bold"
              />
              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </form>

            {mealItems.length > 0 && (
              <div className="space-y-1.5 pt-1">
                {mealItems.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-teal-600 dark:text-teal-400">{item.carbs}g</span>
                      <button onClick={() => handleRemoveMealItem(idx)} className="text-rose-500 hover:text-rose-600 p-0.5">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6 shadow-sm transition-colors">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>Dose Recomendada (Tempo Real)</span>
            </h2>

            {calculationResult ? (
              <div className="mt-6 space-y-6">
                {calculationResult.validation.isHypo && (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-sm flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">HIPOGLICEMIA DETECTADA!</p>
                      <p className="text-xs mt-1">Não aplique insulina. Consuma de 15g a 20g de carboidratos rápidos.</p>
                    </div>
                  </div>
                )}

                <div className="text-center bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                  <span className="text-xs uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Insulina Recomendada</span>
                  <div className="text-5xl font-black text-teal-600 dark:text-teal-400 my-2">
                    {calculationResult.recommendedDose.toFixed(1)} <span className="text-2xl font-bold text-slate-400">U</span>
                  </div>
                  <p className="text-xs text-slate-400">Arredondado para o incremento de 0.5U</p>
                </div>

                {!calculationResult.validation.isHypo && (
                  <div>
                    {appliedSuccess ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-bold flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        <span>Registrado! Redirecionando para o Histórico...</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleRegisterDose}
                        disabled={appliedSuccess}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Syringe className="w-5 h-5" />
                        <span>Registrar Aplicação ({calculationResult.recommendedDose.toFixed(1)} U)</span>
                      </button>
                    )}
                  </div>
                )}

                {calculationResult.breakdown && (
                  <div className="space-y-2 text-sm border-t border-slate-200 dark:border-slate-800 pt-4">
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Bolus Alimentar:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{calculationResult.breakdown.foodBolus} U</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Bolus Corretivo:</span>
                      <span className="font-semibold text-amber-600 dark:text-amber-400">+{calculationResult.breakdown.correctionBolus} U</span>
                    </div>
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span>Desconto IOB (Insulina Ativa):</span>
                      <span className="font-semibold text-purple-600 dark:text-purple-400">-{calculationResult.breakdown.iobDiscount} U</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-center space-y-2">
                <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                <p className="text-sm">Ajuste os parâmetros para ver o cálculo em tempo real.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
