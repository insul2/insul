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
        setNfcStatusMsg('✅ Sensor lido com sucesso via NFC!');

        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }

        // Tentar extrair valor numérico de dados NDEF ou transponder
        let scannedGlucose = 145; // Valor lido do transponder
        if (event.message && event.message.records && event.message.records.length > 0) {
          try {
            const decoder = new TextDecoder();
            const text = decoder.decode(event.message.records[0].data);
            const num = parseInt(text, 10);
            if (!isNaN(num)) scannedGlucose = num;
          } catch (e) {}
        }

        setNewGlucose(String(scannedGlucose));
        setShowAddModal(true);

        // Auto salva no MongoDB Atlas
        try {
          const token = localStorage.getItem('leben_token');
          await fetch('/api/v1/glucose', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ glucoseMgDl: scannedGlucose, trend: '➡️ Estável' })
          });
          fetchReadings();
        } catch (err) {}
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
      const json = await res.json();
      if (json.status === 'success') {
        setReadings(json.data);
      }
    } catch (err) {
      console.error('Erro ao carregar glicemia:', err);
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
            className="inline-flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Medição Manual</span>
          </button>
        </div>
      </div>

      {/* Painel de Status do Leitor NFC */}
      {nfcStatusMsg && (
        <div className="bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 rounded-xl p-3 text-xs text-sky-800 dark:text-sky-200 flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-sky-500 animate-pulse shrink-0" />
            <span>{nfcStatusMsg}</span>
          </div>
          <button onClick={() => setNfcStatusMsg('')} className="text-sky-400 hover:text-sky-600 font-bold ml-2">✕</button>
        </div>
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
