import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Syringe, AlertTriangle, ShieldCheck, Zap, Sparkles, CheckCircle2,
  Clock, RefreshCw, Timer, Activity, TrendingDown, ChevronDown, ChevronUp, Settings
} from 'lucide-react';
import { computeAutoIOB } from '../../utils/iobCalculator';
import { loadSettings, loadProfiles, getActiveProfile } from '../../utils/lebenSettings';

export default function BolusCalculatorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // ── Carrega configurações salvas (single source of truth) ───────────────────
  const savedSettings = loadSettings();
  const savedProfiles = loadProfiles();
  const autoProfile = getActiveProfile(savedProfiles);

  // ── Histórico local de bolus para auto-IOB ──────────────────────────────────
  const [history] = useState(() => {
    const saved = localStorage.getItem('leben_bolus_history');
    return saved ? JSON.parse(saved) : [];
  });

  // ── Estado de UI ─────────────────────────────────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [glucose, setGlucose] = useState(140);

  // ── Campos primários (sempre visíveis) ──────────────────────────────────────
  const [carbs, setCarbs] = useState(searchParams.get('carbs') || '45');

  // ── Parâmetros clínicos — pré-preenchidos das Configurações ─────────────────
  const [iob, setIob] = useState(0.0);
  const [icr, setIcr] = useState(autoProfile.icr);
  const [isf, setIsf] = useState(autoProfile.isf);
  const [exercise, setExercise] = useState(searchParams.get('exercise') === 'true' ? 'WALK_30' : 'NONE');
  const [insulinType, setInsulinType] = useState(savedSettings.insulinType || 'HUMALOG');
  const [patientProfile, setPatientProfile] = useState(savedSettings.patientProfile || 'ADULT');
  const [mealType, setMealType] = useState('MODERATE');
  const [roundingStep, setRoundingStep] = useState(savedSettings.roundingStep || 0.5);
  const [target] = useState(savedSettings.target || 100);

  const [calculationResult, setCalculationResult] = useState(null);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [activeDosesInfo, setActiveDosesInfo] = useState([]);

  // ── Auto-IOB no carregamento ─────────────────────────────────────────────────
  const updateAutoIOB = (currentHistory, type) => {
    const result = computeAutoIOB(currentHistory, type);
    setIob(result.totalIOB);
    setActiveDosesInfo(result.activeDoses);
  };

  // ── Busca última glicemia da API ─────────────────────────────────────────────
  useEffect(() => {
    const fetchLatestGlucose = async () => {
      try {
        const token = localStorage.getItem('leben_token');
        const res = await fetch('/api/v1/glucose', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.length > 0) {
          setGlucose(json.data[0].glucoseMgDl || 140);
          return;
        }
      } catch (e) {}
      const savedReadings = localStorage.getItem('leben_glucose_readings');
      if (savedReadings) {
        const parsed = JSON.parse(savedReadings);
        if (parsed.length > 0) setGlucose(parsed[0].glucoseMgDl || 140);
      }
    };
    fetchLatestGlucose();
    updateAutoIOB(history, insulinType);
  }, []);

  // ── Atualiza carbs e IOB quando URL muda ─────────────────────────────────────
  useEffect(() => {
    const urlCarbs = searchParams.get('carbs');
    if (urlCarbs) setCarbs(urlCarbs);
    const urlExercise = searchParams.get('exercise');
    if (urlExercise === 'true') setExercise('WALK_30');
    updateAutoIOB(history, insulinType);
  }, [searchParams, insulinType]);

  // ── Cálculo em tempo real (debounce 200ms) ────────────────────────────────────
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
          targetGlucose: target,
          insulinType,
          patientProfile,
          mealType,
          exercise,
          roundingStep: Number(roundingStep)
        })
      });
      const json = await response.json();
      if (json.status === 'success' && json.data) {
        setCalculationResult(json.data);
        return;
      }
    } catch (err) {
      console.warn('Backend REST lento ou offline, utilizando engine local:', err);
    }

    // ── FALLBACK LOCAL INSTANTÂNEO (Zero Lag / Offline Ready) ─────────────────
    const numG = Number(glucose);
    const numC = Number(carbs || 0);
    const numIob = Number(iob || 0);
    const numIcr = Number(icr || 10);
    const numIsf = Number(isf || 40);
    const numTarget = Number(target || 100);

    if (numG < 70) {
      setCalculationResult({
        status: 'BLOCKED_HYPO_SAFETY',
        recommendedDose: 0,
        rawTotal: 0
      });
      return;
    }

    const foodBolus = numC > 0 ? numC / numIcr : 0;
    const correctionBolus = numG > numTarget ? (numG - numTarget) / numIsf : 0;
    let total = foodBolus + correctionBolus - numIob;
    if (total < 0) total = 0;

    const step = Number(roundingStep || 0.5);
    const rounded = Math.round(total / step) * step;

    setCalculationResult({
      status: 'APPROVED',
      recommendedDose: Number(rounded.toFixed(2)),
      rawTotal: Number(total.toFixed(2)),
      clinicalGuidance: {
        preBolusTiming: { minutes: numG > 180 ? 25 : 15, advice: 'Aguarde o tempo recomendado para otimizar o pico glicêmico.' }
      },
      predictions: [
        { minute: 30, estimatedGlucose: Math.round(numG + 20) },
        { minute: 60, estimatedGlucose: Math.round(numG + 35) },
        { minute: 90, estimatedGlucose: Math.round(numG + 10) },
        { minute: 120, estimatedGlucose: Math.round(numTarget + 15) }
      ]
    });
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
    setTimeout(() => { navigate('/glucose'); }, 600);
  };

  // ── Indicador de perfil ativo ─────────────────────────────────────────────────
  const currentHour = new Date().getHours();
  const activeProfileName = savedProfiles.find(
    p => currentHour >= p.startHour && currentHour <= p.endHour
  )?.name || '☀️ Almoço / Tarde';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Syringe className="w-7 h-7 text-teal-600" />
          <span>Calculadora de Bolus</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Perfil ativo: <strong className="text-teal-600 dark:text-teal-400">{activeProfileName}</strong>
          {' · '}ICR <strong>{icr}g/U</strong> · ISF <strong>{isf} mg/dL/U</strong>
          {' · '}
          <button
            onClick={() => navigate('/settings')}
            className="text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-0.5"
          >
            <Settings className="w-3 h-3" /> Ajustar em Configurações
          </button>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ── COLUNA DE ENTRADAS ─────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">

          {/* CAMPOS PRIMÁRIOS */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2">
              💉 Dados da Aplicação
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Glicemia Atual (mg/dL)
                </label>
                <input
                  id="bolus-glucose-input"
                  type="number"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-teal-400 dark:border-teal-600 rounded-xl px-4 py-3 text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Carboidratos (g)
                </label>
                <input
                  id="bolus-carbs-input"
                  type="number"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-amber-400 dark:border-amber-600 rounded-xl px-4 py-3 text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* IOB auto-calculado (somente leitura com opção de override) */}
            <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-300 dark:border-purple-800 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-purple-600 dark:text-purple-400 block">
                  ⚡ Insulina Ativa (IOB) — Auto-calculada
                </span>
                <span className="text-2xl font-black text-purple-600 dark:text-purple-400">
                  {Number(iob || 0).toFixed(2)} <span className="text-sm font-semibold">U</span>
                </span>
              </div>
              <div className="text-right">
                <input
                  type="number"
                  step="0.1"
                  value={iob}
                  onChange={(e) => setIob(e.target.value)}
                  className="w-20 bg-white dark:bg-slate-900 border border-purple-300 dark:border-purple-700 rounded-lg px-2 py-1 text-sm font-bold text-purple-600 text-center focus:outline-none"
                  title="Sobrescrever IOB manualmente"
                />
                <p className="text-[10px] text-purple-400 mt-0.5">Toque para editar</p>
              </div>
            </div>
          </div>

          {/* PAINEL AVANÇADO — accordion */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between px-5 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-600" />
                ⚙️ Parâmetros Avançados
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                  Exercício · Absorção · ICR · ISF
                </span>
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ICR (g/U) — Sobrescrever
                    </label>
                    <input
                      type="number"
                      value={icr}
                      onChange={(e) => setIcr(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Padrão vem das Configurações</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      ISF (mg/dL/U) — Sobrescrever
                    </label>
                    <input
                      type="number"
                      value={isf}
                      onChange={(e) => setIsf(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5">Padrão vem das Configurações</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Tipo de Insulina
                    </label>
                    <select
                      value={insulinType}
                      onChange={(e) => setInsulinType(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white font-bold"
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

                  <div className="sm:col-span-2">
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
                </div>

                {activeDosesInfo.length > 0 && (
                  <div className="bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 space-y-1.5">
                    <h4 className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <TrendingDown className="w-3.5 h-3.5" /> Doses em Decaimento (IOB Detalhado)
                    </h4>
                    {activeDosesInfo.slice(0, 3).map((d, i) => (
                      <div key={i} className="flex justify-between text-[11px] text-purple-600 dark:text-purple-400">
                        <span>Há {Math.round((new Date() - new Date(d.timestamp)) / 60000)} min — {d.originalDose}U aplicada</span>
                        <span className="font-bold">{d.remainingIOB.toFixed(2)}U restante</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── PAINEL DE RESULTADOS ───────────────────────────────────────────── */}
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
                      id="bolus-register-btn"
                      onClick={handleRegisterDose}
                      disabled={appliedSuccess}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95"
                    >
                      <Syringe className="w-5 h-5" />
                      <span>{appliedSuccess ? '✅ Registrado!' : `Registrar Dose (${calculationResult.recommendedDose} U)`}</span>
                    </button>
                  </>
                )}

                {/* Timing de Pre-Bolus */}
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

                {/* Simulação Preditiva */}
                {calculationResult.predictions && (
                  <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-teal-600" />
                      <span>Simulação Preditiva Glicêmica (Digital Twin 3h)</span>
                    </h4>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {calculationResult.predictions.slice(0, 4).map((pt, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                          <span className="text-[10px] text-slate-400 font-bold block">+{pt.minute}min</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white">{pt.estimatedGlucose}</span>
                          <span className="text-[9px] text-slate-400 block">mg/dL</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-teal-400" />
                <span>Calculando em tempo real...</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
