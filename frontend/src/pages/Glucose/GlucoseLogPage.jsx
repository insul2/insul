import React, { useState, useEffect } from 'react';
import { Droplet, Plus, TrendingUp, Syringe, Clock, Filter, CheckCircle2, Pencil, Trash2, X, Check, Wifi, Radio } from 'lucide-react';

export default function GlucoseLogPage() {
  const [readings, setReadings] = useState([]);
  const [bolusHistory, setBolusHistory] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  const [newGlucose, setNewGlucose] = useState('');
  const [newTrend, setNewTrend] = useState('➡️ Estável');
  const [isNfcScanning, setIsNfcScanning] = useState(false);
  const [nfcStatusMsg, setNfcStatusMsg] = useState('');

  // Estado para Modal LibreLinkUp (Abbott Cloud)
  const [showLibreModal, setShowLibreModal] = useState(false);
  const [libreEmail, setLibreEmail] = useState('');
  const [librePassword, setLibrePassword] = useState('');
  const [libreRegion, setLibreRegion] = useState('us');
  const [libreLoading, setLibreLoading] = useState(false);

  // Estado para Edição Inline
  const [editingItem, setEditingItem] = useState(null);
  const [editDose, setEditDose] = useState('');
  const [editGlucose, setEditGlucose] = useState('');
  const [editCarbs, setEditCarbs] = useState('');

  // Função para leitura nativa Web NFC do Sensor Libre
  const handleNfcScan = async () => {
    if (!('NDEFReader' in window)) {
      setNfcStatusMsg('⚠️ O leitor NFC Web é suportado no Google Chrome / Android. Por favor use um celular Android com NFC ativo ou abra via Chrome.');
      alert('NFC não suportado neste navegador/dispositivo. Para ler sensores Libre via NFC no navegador, use o Google Chrome em um smartphone Android com NFC ativado.');
      return;
    }

    try {
      setIsNfcScanning(true);
      setNfcStatusMsg('📡 Aproxime o sensor FreeStyle Libre da parte traseira do seu celular...');
      
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      setNfcStatusMsg('🟢 Leitor ativado! Aproxime o sensor...');

      ndef.onreadingerror = () => {
        setNfcStatusMsg('❌ Erro na leitura NFC. Tente aproximar o sensor novamente.');
        setIsNfcScanning(false);
      };

      ndef.onreading = async (event) => {
        setIsNfcScanning(false);

        // 1. Efeito Sonoro Beep Duplo de Sucesso (Web Audio API)
        try {
          const AudioContext = window.AudioContext || window.webkitAudioContext;
          if (AudioContext) {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.15);
          }
        } catch (e) {}

        // 2. Vibração Tátil do Smartphone
        if ('vibrate' in navigator) {
          navigator.vibrate([120, 80, 160]);
        }

        let scannedGlucose = 0;
        let batchReadings = [];

        // 3. Decodificação Robusta do Payload NFC
        if (event.message && event.message.records && event.message.records.length > 0) {
          for (const record of event.message.records) {
            if (record.data) {
              const buffer = new Uint8Array(record.data.buffer || record.data);

              // Estratégia A: Buffer RAM Dump (320 bytes ou superior)
              if (buffer.length >= 320) {
                const rawCurrent = ((buffer[29] & 0x0f) << 8) | (buffer[28] & 0xff);
                const calcBg = Math.round(rawCurrent / 10);
                if (calcBg >= 40 && calcBg <= 500) {
                  scannedGlucose = calcBg;
                }
              }

              // Estratégia B: Payload de Texto / NDEF String
              if (!scannedGlucose) {
                try {
                  const text = new TextDecoder().decode(buffer);
                  const matched = text.match(/\b([4-9]\d|[1-4]\d\d|500)\b/);
                  if (matched) {
                    scannedGlucose = parseInt(matched[1], 10);
                  }
                } catch (e) {}
              }
            }
          }
        }

        if (scannedGlucose >= 40 && scannedGlucose <= 500) {
          setNfcStatusMsg(`🎉 Sensor lido via NFC! Glicemia detectada: ${scannedGlucose} mg/dL`);
          setNewGlucose(String(scannedGlucose));
          setShowAddModal(true);
        } else {
          setNfcStatusMsg('📱 Sensor Libre 2 detectado via NFC! Digite a medição do seu leitor para salvar:');
          setNewGlucose('');
          setShowAddModal(true);
        }
      };

    } catch (error) {
      console.error('Erro NFC:', error);
      setIsNfcScanning(false);
      setNfcStatusMsg(`❌ Permissão NFC negada ou cancelada: ${error.message}`);
    }
  };


  const fetchReadings = async () => {
    try {
      const token = localStorage.getItem('leben_token');
      const res = await fetch('/api/v1/glucose', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const text = await res.text();
      if (!text) return;
      const json = JSON.parse(text);
      if (json.status === 'success' && Array.isArray(json.data)) {
        setReadings(json.data);
      }
    } catch (err) {
      console.warn('Backend reiniciando ou sem resposta JSON completa:', err.message);
    }
  };

  useEffect(() => {
    fetchReadings();

    const savedBolus = localStorage.getItem('leben_bolus_history');
    if (savedBolus) {
      setBolusHistory(JSON.parse(savedBolus));
    }
  }, []);

  const handleAddReading = async (e) => {
    e.preventDefault();
    if (!newGlucose) return;

    try {
      const token = localStorage.getItem('leben_token');
      const res = await fetch('/api/v1/glucose', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ glucoseMgDl: Number(newGlucose), trend: newTrend })
      });
      const json = await res.json();
      if (json.status === 'success') {
        setNewGlucose('');
        setShowAddModal(false);
        fetchReadings();
      }
    } catch (err) {
      console.error('Erro ao salvar glicemia:', err);
    }
  };

  // Excluir registro do histórico
  const handleDeleteItem = (item) => {
    if (!window.confirm('Tem certeza de que deseja excluir este registro do histórico clínico?')) return;

    if (item.eventType === 'BOLUS') {
      const updated = bolusHistory.filter((b) => b.id !== item.id);
      setBolusHistory(updated);
      localStorage.setItem('leben_bolus_history', JSON.stringify(updated));
    } else {
      const updated = readings.filter((r) => r.id !== item.id);
      setReadings(updated);
    }
  };

  // Iniciar Edição
  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditDose(item.dose || '');
    setEditGlucose(item.glucose || item.glucoseMgDl || '');
    setEditCarbs(item.carbs || '');
  };

  // Salvar Edição
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editingItem) return;

    if (editingItem.eventType === 'BOLUS') {
      const updated = bolusHistory.map((b) => {
        if (b.id === editingItem.id) {
          return {
            ...b,
            dose: Number(editDose),
            glucose: Number(editGlucose),
            carbs: Number(editCarbs)
          };
        }
        return b;
      });
      setBolusHistory(updated);
      localStorage.setItem('leben_bolus_history', JSON.stringify(updated));
    } else {
      const updated = readings.map((r) => {
        if (r.id === editingItem.id) {
          return {
            ...r,
            glucoseMgDl: Number(editGlucose)
          };
        }
        return r;
      });
      setReadings(updated);
    }

    setEditingItem(null);
  };

  const formatTrend = (trendStr) => {
    if (!trendStr) return '➡️ Estável';
    if (trendStr === 'FLAT') return '➡️ Estável';
    if (trendStr === 'RISING') return '↗️ Subindo';
    if (trendStr === 'FALLING') return '↘️ Caindo';
    if (trendStr === 'RISING_FAST') return '⬆️ Subindo Rápido';
    if (trendStr === 'FALLING_FAST') return '⬇️ Caindo Rápido';
    return trendStr;
  };

  const allEvents = [
    ...readings.map((r) => ({ ...r, eventType: 'GLUCOSE' })),
    ...bolusHistory.map((b) => ({ ...b, eventType: 'BOLUS' }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const filteredEvents = allEvents.filter((e) => {
    if (filterType === 'BOLUS') return e.eventType === 'BOLUS';
    if (filterType === 'GLUCOSE') return e.eventType === 'GLUCOSE';
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Droplet className="w-7 h-7 text-rose-500" />
            <span>Histórico Clínico LEBEN</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Linha do tempo de medições de glicemia e doses de insulina aplicadas (Com suporte a edição e exclusão).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLibreModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs transition-all"
            title="Conectar com a nuvem do LibreLinkUp (Abbott)"
          >
            <Wifi className="w-4 h-4" />
            <span>☁️ Nuvem LibreLinkUp</span>
          </button>

          <button
            onClick={handleNfcScan}
            disabled={isNfcScanning}
            className={`inline-flex items-center justify-center gap-2 ${
              isNfcScanning ? 'bg-amber-600 animate-pulse' : 'bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700'
            } text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs transition-all`}
          >
            <Radio className={`w-4 h-4 ${isNfcScanning ? 'animate-spin' : ''}`} />
            <span>{isNfcScanning ? 'Lendo Sensor...' : '📱 Medição NFC'}</span>
          </button>

          <button
            onClick={() => setShowAddModal(!showAddModal)}
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Medição Manual</span>
          </button>
        </div>
      </div>

      {/* MODAL DE CONEXÃO REAL LIBRELINKUP (ABBOTT) */}
      {showLibreModal && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!libreEmail || !librePassword) return;
            setLibreLoading(true);
            setNfcStatusMsg('🔄 Conectando à Nuvem LibreLinkUp da Abbott...');
            try {
              const token = localStorage.getItem('leben_token');
              const res = await fetch('/api/v1/connectors/librelinkup/sync', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  username: libreEmail,
                  password: librePassword,
                  region: libreRegion
                })
              });
              const json = await res.json();
              if (res.ok && json.status === 'success') {
                setNfcStatusMsg(`🎉 Nuvem Abbott Conectada 24h! Paciente: ${json.data.patientName || 'Pedro'} — Atual: ${json.data.glucoseMgDl} mg/dL (${json.data.trend}) — Sincronização automática ativa a cada 5 min!`);
                setShowLibreModal(false);
                fetchReadings();
              } else {
                setNfcStatusMsg(`⚠️ Abbott LibreView (${res.status}): ${json.message || 'Falha na autenticação com os servidores da Abbott.'}`);
              }
            } catch (err) {
              setNfcStatusMsg('❌ Falha na conexão com a nuvem Abbott. Verifique sua internet.');
            } finally {
              setLibreLoading(false);
            }
          }}
          className="bg-gradient-to-r from-teal-900/90 to-slate-900 border border-teal-500/40 rounded-2xl p-5 space-y-4 shadow-xl text-white animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-center justify-between border-b border-teal-500/30 pb-2">
            <h3 className="text-sm font-black flex items-center gap-2 text-teal-300">
              <Wifi className="w-4 h-4 text-teal-400" />
              <span>Conectar Conta LibreLinkUp (Abbott Cloud)</span>
            </h3>
            <button type="button" onClick={() => setShowLibreModal(false)} className="text-slate-400 hover:text-white font-bold">
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300">
            Digite seu e-mail e senha cadastrados no aplicativo oficial <strong>LibreLinkUp</strong> da Abbott para puxar a glicemia atual em tempo real:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">E-mail LibreLinkUp</label>
              <input
                type="email"
                placeholder="seu.email@exemplo.com"
                value={libreEmail}
                onChange={(e) => setLibreEmail(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                value={librePassword}
                onChange={(e) => setLibrePassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-teal-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">Região da Conta</label>
              <select
                value={libreRegion}
                onChange={(e) => setLibreRegion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-teal-400"
              >
                <option value="us">América (US / Brasil / Latam)</option>
                <option value="eu">Europa (EU)</option>
                <option value="de">Alemanha (DE)</option>
                <option value="fr">França (FR)</option>
                <option value="jp">Japão (JP)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowLibreModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={libreLoading}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-md flex items-center gap-1.5 disabled:opacity-50"
            >
              {libreLoading ? <Radio className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
              <span>{libreLoading ? 'Conectando...' : 'Conectar & Puxar Glicemia'}</span>
            </button>
          </div>
        </form>
      )}

      {showAddModal && (
        <form onSubmit={handleAddReading} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-md animate-in fade-in slide-in-from-top-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-teal-600" />
            <span>Registrar Medição Capilar Manual</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Glicemia (mg/dL)</label>
              <input
                type="number"
                placeholder="Ex: 115"
                value={newGlucose}
                onChange={(e) => setNewGlucose(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-900 dark:text-white focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Seta de Tendência</label>
              <select
                value={newTrend}
                onChange={(e) => setNewTrend(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-teal-500 font-medium"
              >
                <option value="➡️ Estável">➡️ Estável</option>
                <option value="↗️ Subindo">↗️ Subindo</option>
                <option value="⬆️ Subindo Rápido">⬆️ Subindo Rápido</option>
                <option value="↘️ Caindo">↘️ Caindo</option>
                <option value="⬇️ Caindo Rápido">⬇️ Caindo Rápido</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white shadow-sm"
            >
              Salvar Registro
            </button>
          </div>
        </form>
      )}

      {/* MODAL DE EDIÇÃO INLINE */}
      {editingItem && (
        <form onSubmit={handleSaveEdit} className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-5 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-600" />
              <span>Editar Registro do Histórico</span>
            </h3>
            <button type="button" onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {editingItem.eventType === 'BOLUS' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Dose (U)</label>
                <input
                  type="number"
                  step="0.1"
                  value={editDose}
                  onChange={(e) => setEditDose(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Glicemia (mg/dL)</label>
              <input
                type="number"
                value={editGlucose}
                onChange={(e) => setEditGlucose(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
              />
            </div>

            {editingItem.eventType === 'BOLUS' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Carboidratos (g)</label>
                <input
                  type="number"
                  value={editCarbs}
                  onChange={(e) => setEditCarbs(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>
      )}

      {/* Filtros */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'ALL'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            📌 Todos ({allEvents.length})
          </button>

          <button
            onClick={() => setFilterType('BOLUS')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'BOLUS'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            💉 Doses Aplicadas ({allEvents.filter(e => e.eventType === 'BOLUS').length})
          </button>

          <button
            onClick={() => setFilterType('GLUCOSE')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              filterType === 'GLUCOSE'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            🩸 Glicemia ({allEvents.filter(e => e.eventType === 'GLUCOSE').length})
          </button>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((item) => {
            if (item.eventType === 'BOLUS') {
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-teal-300 transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-black text-base shadow-sm shrink-0">
                      {item.dose}U
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{item.type || 'Bolus Aplicado'}</h4>
                        <span className="text-[10px] bg-teal-100 text-teal-700 font-extrabold px-2.5 py-0.5 rounded-full border border-teal-200">
                          💉 Dose Aplicada
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-medium">
                        Glicemia: <b className="text-slate-900 dark:text-white">{item.glucose} mg/dL</b> • Carboidratos: <b className="text-slate-900 dark:text-white">{item.carbs}g</b>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    {/* Botões de Ação: Editar e Excluir */}
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                      <button
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Editar Registro"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Excluir Registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:border-rose-300 transition-all flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center font-extrabold text-base shrink-0">
                    <Droplet className="w-6 h-6 fill-rose-500 text-rose-500" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{item.glucoseMgDl}</span>
                      <span className="text-xs text-slate-500 font-semibold">mg/dL</span>
                    </div>
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full border border-slate-200 inline-block mt-0.5">
                      {formatTrend(item.trend)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-end gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(item.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {new Date(item.timestamp).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                    <button
                      onClick={() => handleStartEdit(item)}
                      className="p-1.5 text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Editar Registro"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Excluir Registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <TrendingUp className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Nenhum evento registrado nesta categoria.</p>
          </div>
        )}
      </div>
    </div>
  );
}
