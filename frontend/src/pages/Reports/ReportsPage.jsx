import React from 'react';
import { BarChart3, Download, Award, FileText } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <BarChart3 className="w-7 h-7 text-purple-500" />
            <span>Relatórios Médicos & Estatísticas Clínicas</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Parâmetros padronizados ADA / ISPAD / SBD (TIR, GMI, CV%).</p>
        </div>

        <button className="inline-flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm transition-colors shadow-xs">
          <Download className="w-4 h-4" />
          <span>Exportar PDF para Médico</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tempo na Faixa (TIR)</span>
            <Award className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white">82%</p>
          <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden flex">
            <div className="bg-rose-500 h-full w-[5%]" title="Abaixo (<70)"></div>
            <div className="bg-emerald-500 h-full w-[82%]" title="Na faixa (70-180)"></div>
            <div className="bg-amber-500 h-full w-[13%]" title="Acima (>180)"></div>
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>TBR (&lt;70): 5%</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">TIR: 82%</span>
            <span>TAR (&gt;180): 13%</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm transition-colors">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Coeficiente de Variação (CV%)</span>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white">32.4%</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Meta &le; 36% (Estabilidade Glicêmica Alta)</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3 shadow-sm transition-colors">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">GMI (HbA1c Estimada)</span>
          <p className="text-4xl font-extrabold text-slate-900 dark:text-white">6.4%</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Média Glicêmica: 137 mg/dL</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm transition-colors">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-sky-500" />
          <span>Resumo dos Últimos 14 Dias</span>
        </h2>
        <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-xl border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 space-y-2">
          <p>• <b>Total de registros:</b> 126 medições (média de 9 registros/dia).</p>
          <p>• <b>Menor glicemia:</b> 64 mg/dL | <b>Maior glicemia:</b> 210 mg/dL.</p>
          <p>• <b>Conformidade de dosagem:</b> 100% dos cálculos de bolus com snapshot SHA-256 verificado.</p>
        </div>
      </div>
    </div>
  );
}
