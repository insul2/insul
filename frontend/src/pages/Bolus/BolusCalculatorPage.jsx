import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Syringe, AlertTriangle, ShieldCheck, Zap, Sparkles, CheckCircle2, Clock, Info, RefreshCw, Plus, Trash2, Sun, Moon, Sunrise, Sunset, Timer, Activity, TrendingDown, ArrowRight } from 'lucide-react';
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
  const [patientProfile, setPatientProfile] = useState('ADULT');
  const [mealType, setMealType] = useState('MODERATE');
  const [roundingStep, setRoundingStep] = useState(0.5);

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
  }, [glucose, carbs, iob, icr, isf, exercise, insulinType, patientProfile, mealType, roundingStep]);

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
          insulinType,
          patientProfile,
          mealType,
          exercise,
          roundingStep: Number(roundingStep)
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

  const handleRegisterDose = () => {
    if (!calculationResult || appliedSuccess) return;

    const newRecord = {
      id: String(Date.now()),
      dose: calculationResult.recommendedDose,
      glucose: Number(glucose),
      carbs: Number(carbs),
      type: Number(carbs) > 0 ? 'Bolus Alimentar + Correção' : 'Bolus Corretivo',
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
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Syringe className="w-7 h-7 text-teal-600" />
          <span>Calculadora Clínico-Inteligente LEBEN Engine V4</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Motor de precisão com Simulação Preditiva Glicêmica, Pre-Bolus Dinâmico e Curvas Específicas por Insulina.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* PARÂMETROS E FORMULÁRIO */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
              ⚙️ Parâmetros Médicos da Aplicação
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Glicemia Atual (mg/dL)
                </label>
                <input
                  type="number"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Carboidratos (g)
                </label>
                <input
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-black text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">
                  Insulina Ativa (IOB - U)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={iob}
                  onChange={(e) => setIob(e.target.value)}
                  className="w-full bg-purple-50/60 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800 rounded-xl px-4 py-2.5 text-base font-black text-purple-600 dark:text-purple-400 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Insulina
                </label>
                <select
                  value={insulinType}
                  onChange={(e) => setInsulinType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-bold"
                >
                  <option value="HUMALOG">Humalog / Novorapid / Apidra (4h)</option>
                  <option value="FIASP">Fiasp / Lumjev (3h - Pico Precoce)</option>
                  <option value="REGULAR">Insulina Regular (6h)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Perfil de Paciente (Alvo)
                </label>
                <select
                  value={patientProfile}
                  onChange={(e) => setPatientProfile(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="ADULT">Adulto Geral (Alvo 100 mg/dL)</option>
                  <option value="PREGNANT">Gestante (Alvo 90 mg/dL)</option>
                  <option value="CHILD">Criança / Pediatria (Alvo 120 mg/dL)</option>
                  <option value="ELDERLY">Idoso (Alvo 140 mg/dL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Absorção da Refeição
                </label>
                <select
                  value={mealType}
                  onChange={(e) => setMealType(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="MODERATE">Absorção Normal (Arroz, Pão)</option>
                  <option value="FAST">Absorção Rápida (Sucos, Açúcar)</option>
                  <option value="SLOW_FPU">Absorção Lenta / FPU (Pizza, Gordura)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Incremento de Dose
                </label>
                <select
                  value={roundingStep}
                  onChange={(e) => setRoundingStep(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="0.5">0.5 U (Canetas Convencionais)</option>
                  <option value="0.1">0.1 U (Bombas Pediátricas)</option>
                  <option value="0.05">0.05 U (Micro-dosagem / Bombas)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Atividade Física
                </label>
                <select
                  value={exercise}
                  onChange={(e) => setExercise(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 font-semibold"
                >
                  <option value="NONE">Sem Exercício / Repouso</option>
                  <option value="WALK_30">Caminhada Leve (15% Desc)</option>
                  <option value="RUN_30">Corrida / Aeróbico (30% Desc)</option>
                  <option value="INTENSE_60">Treino Intenso Aeróbico (40% Desc)</option>
                  <option value="RESISTANCE_ANAEROBIC">Musculação / HIIT (Anaeróbico +10%)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* PAINEL DE RESULTADOS E SIMULAÇÃO PREDITIVA */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <span>💉 Dose Recomendada</span>
              <span className="text-[10px] bg-teal-500/10 text-teal-600 font-bold px-2 py-0.5 rounded-full border border-teal-500/20">
                IEC 62304 Compliant
              </span>
            </h2>

            {calculationResult ? (
              <div className="space-y-5">
                {calculationResult.status === 'BLOCKED_HYPO_SAFETY' ? (
                  <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-600 dark:text-rose-400 space-y-2">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>APLICAÇÃO BLOQUEADA TEMPORARIAMENTE</span>
                    </div>
                    <p className="text-xs leading-relaxed">
                      Hipoglicemia detectada ({glucose} mg/dL). Trate imediatamente com 15g de carboidrato simples e recalcule após nova medição.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block">
                        Dose Recomendada
                      </span>
                      <div className="text-5xl font-black text-teal-600 dark:text-teal-400 my-2">
                        {calculationResult.recommendedDose.toFixed(1)} <span className="text-2xl font-bold text-slate-400">U</span>
                      </div>

                      {calculationResult.requiresManualConfirmation && (
                        <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-700 dark:text-amber-300 text-xs font-bold">
                          ⚠️ Dose real calculada ({calculationResult.rawTotal}U) excede 25U. Requer confirmação médica manual.
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleRegisterDose}
                      disabled={appliedSuccess}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                    >
                      <Syringe className="w-5 h-5" />
                      <span>{appliedSuccess ? 'Registrado!' : `Registrar Dose (${calculationResult.recommendedDose} U)`}</span>
                    </button>
                  </>
                )}

                {/* TIMING DE PRE-BOLUS DINÂMICO RECOMENDADO POR FAIXA GLICÊMICA */}
                {calculationResult.clinicalGuidance?.preBolusTiming && (
                  <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs space-y-1">
                    <p className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-teal-600" />
                      <span>Timing de Pré-Bolus Recomendado: {calculationResult.clinicalGuidance.preBolusTiming.minutes} min</span>
                    </p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">
                      {calculationResult.clinicalGuidance.preBolusTiming.advice}
                    </p>
                  </div>
                )}

                {/* SIMULAÇÃO PREDITIVA GLICÊMICA (DIGITAL TWIN PREDICTION) */}
                {calculationResult.predictions && (
                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <span>Simulação Preditiva Glicêmica (Digital Twin 3h)</span>
                    </h4>

                    <div className="grid grid-cols-4 gap-1 text-center">
                      {calculationResult.predictions.slice(0, 4).map((pt, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold block">+{pt.minute} min</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{pt.estimatedGlucose}</span>
                          <span className="text-[9px] text-slate-400 block">mg/dL</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
                Aguardando cálculo em tempo real...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
