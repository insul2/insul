import React from 'react';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-500 transition-colors">
      <p>
        ⚠️ <b>AVISO MÉDICO-LEGAL</b>: O sistema LEBEN é um software de apoio à decisão clínica. Todos os parâmetros de dosagem DEVEM ser configurados exclusivamente pelo endocrinologista responsável.
      </p>
      <p className="mt-1 font-medium">
        © 2026 LEBEN Engine — Viva Mais. Preocupe-se Menos. | Conformidade IEC 62304 / SBD / ADA.
      </p>
    </footer>
  );
}
