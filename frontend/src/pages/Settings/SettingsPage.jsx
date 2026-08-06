import React, { useState, useEffect } from 'react';
import { Settings, Save, ShieldAlert, Calculator, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react';
import { loadSettings, saveSettings, loadProfiles, saveProfiles } from '../../utils/lebenSettings';

export default function SettingsPage() {
  // ── Carrega de localStorage na montagem ─────────────────────────────────────
  const [settings, setSettings] = useState(() => loadSettings());
  const [profiles, setProfiles] = useState(() => loadProfiles());
  const [saved, setSaved] = useState(false);

  // ── Assistente para Novatos ─────────────────────────────────────────────────
  const [calcMode, setCalcMode] = useState('WEIGHT');
  const [weightKg, setWeightKg] = useState('70');
  const [tdd, setTdd] = useState('40');

  const numericWeight = Number(weightKg || 0);
  const numericTdd = Number(tdd || 0);
  const tddFromWeight = numericWeight > 0 ? Number((numericWeight * 0.55).toFixed(1)) : 0;
  const activeTdd = calcMode === 'WEIGHT' ? tddFromWeight : numericTdd;
  const estimatedIcr = activeTdd > 0 ? Number((500 / activeTdd).toFixed(1)) : 0;
  const estimatedIsf = activeTdd > 0 ? Number((1800 / activeTdd).toFixed(1)) : 0;

  // ── Salvar com persistência real ─────────────────────────────────────────────
  const handleSave = () => {
    saveSettings(settings);
    saveProfiles(profiles);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleApplyCalculated = (icrVal, isfVal) => {
    const updated = profiles.map(p => ({ ...p, icr: icrVal, isf: isfVal }));
    setProfiles(updated);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Settings className="w-7 h-7 text-teal-600" />
          <span>Configuração dos Parâmetros Médicos</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Definições de ICR (Carboidratos), ISF (Sensibilidade), Alvo e Duração da Ação da Insulina (DIA).
          <strong className="text-teal-600 dark:text-teal-400 ml-1">Estas configurações são aplicadas automaticamente na Calculadora de Bolus.</strong>
        </p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl text-amber-700 dark:text-amber-300 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
        <div>
          <b>AVISO MÉDICO IMPORTANTE:</b> Os cálculos desta ferramenta utilizam as fórmulas padrão da Sociedade Brasileira de Diabetes (SBD). Sempre consulte seu endocrinologista para ajustes finos.
        </div>
      </div>

      {/* ASSISTENTE GUIADO DE CÁLCULO DE ICR E ISF PARA NOVATOS */}
      <div className="bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-amber-500/10 border border-teal-200 dark:border-teal-800 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span>Assistente para Novatos: Estimar Meu ICR e ISF</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
              Não sabe seus parâmetros? Calcule automaticamente usando seu peso ou sua dose diária de insulina.
            </p>
          </div>

          <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={() => setCalcMode('WEIGHT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calcMode === 'WEIGHT'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              ⚖️ Por Peso (kg)
            </button>
            <button
              type="button"
              onClick={() => setCalcMode('TDD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                calcMode === 'TDD'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              💉 Por Dose Diária (U)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end pt-2">
          {calcMode === 'WEIGHT' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Seu Peso Atual (kg)
              </label>
              <input
                type="number"
                placeholder="Ex: 70"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">DTT Estimada: {tddFromWeight} U/dia (0.55U/kg)</span>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                DTT (Dose Total Diária - U/dia)
              </label>
              <input
                type="number"
                placeholder="Ex: 40"
                value={tdd}
                onChange={(e) => setTdd(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">Soma de Basal + Rápida em 24h</span>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-center gap-1">
              <span>ICR Estimado (Carboidratos)</span>
              <HelpCircle className="w-3 h-3 text-slate-400" title="1U de insulina cobre esta quantidade em gramas de carboidrato" />
            </span>
            <span className="text-2xl font-black text-teal-600 dark:text-teal-400">{estimatedIcr} <span className="text-xs text-slate-400">g/U</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Regra dos 500</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 block flex items-center justify-center gap-1">
              <span>ISF Estimado (Sensibilidade)</span>
              <HelpCircle className="w-3 h-3 text-slate-400" title="1U de insulina reduz esta quantidade em mg/dL na sua glicemia" />
            </span>
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{estimatedIsf} <span className="text-xs text-slate-400">mg/dL/U</span></span>
            <span className="text-[10px] text-slate-400 block mt-0.5">Regra dos 1800</span>
          </div>
        </div>

        <div className="p-3 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-teal-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-1">
          <p className="font-semibold text-slate-900 dark:text-white">💡 Como entender estes números na prática:</p>
          <ul className="list-disc list-inside space-y-0.5 text-[11px]">
            <li><b>ICR ({estimatedIcr}g/U)</b>: Para cada {estimatedIcr} gramas de comida (ex: pão ou arroz), você aplicará 1 Unidade de insulina.</li>
            <li><b>ISF ({estimatedIsf} mg/dL)</b>: Se sua glicemia estiver alta, 1 Unidade de insulina reduzirá sua glicemia em {estimatedIsf} mg/dL.</li>
          </ul>
        </div>

        {activeTdd > 0 && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => handleApplyCalculated(estimatedIcr, estimatedIsf)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Aplicar ICR {estimatedIcr}g/U e ISF {estimatedIsf} no Meu Perfil</span>
            </button>
          </div>
        )}
      </div>

      {/* PARÂMETROS GLOBAIS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-6 shadow-sm transition-colors">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Metas Globais & Farmacocinética</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Glicemia Alvo (mg/dL)</label>
            <input
              type="number"
              value={settings.target}
              onChange={(e) => setSettings(s => ({ ...s, target: Number(e.target.value) }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">DIA (Duração da Insulina - h)</label>
            <input
              type="number"
              step="0.5"
              value={settings.diaHours}
              onChange={(e) => setSettings(s => ({ ...s, diaHours: Number(e.target.value) }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-base font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo de Insulina</label>
            <select
              value={settings.insulinType}
              onChange={(e) => setSettings(s => ({ ...s, insulinType: e.target.value }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
            >
              <option value="HUMALOG">Humalog (Lispro)</option>
              <option value="NOVORAPID">NovoRapid (Aspart)</option>
              <option value="APIDRA">Apidra (Glulisina)</option>
              <option value="FIASP">Fiasp (Aspart Ultra-Rápida)</option>
              <option value="REGULAR">Regular (Humana)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Incremento de Dose</label>
            <select
              value={settings.roundingStep}
              onChange={(e) => setSettings(s => ({ ...s, roundingStep: Number(e.target.value) }))}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:border-teal-500"
            >
              <option value="0.5">0.5 U (Canetas Convencionais)</option>
              <option value="0.1">0.1 U (Bombas Pediátricas)</option>
              <option value="0.05">0.05 U (Micro-dosagem / Bombas)</option>
            </select>
          </div>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-6">
          Perfis Circadianos de Sensibilidade
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {profiles.map((p, idx) => (
            <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">{p.name}</span>
                <span className="text-xs text-slate-500 font-semibold">{p.start}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500">ICR (g/U)</label>
                  <input
                    type="number"
                    value={p.icr}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setProfiles(profiles.map((item, i) => i === idx ? { ...item, icr: val } : item));
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500">ISF (mg/dL/U)</label>
                  <input
                    type="number"
                    value={p.isf}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setProfiles(profiles.map((item, i) => i === idx ? { ...item, isf: val } : item));
                    }}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSave}
            className={`font-bold px-6 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-sm ${
              saved
                ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                : 'bg-teal-600 hover:bg-teal-700 text-white'
            }`}
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? '✅ Configurações Salvas — Calculadora Atualizada!' : 'Salvar Parâmetros Médicos'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
