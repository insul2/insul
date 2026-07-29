import React, { useState } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';

export default function XiviaAIFloating() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Olá! Sou o assistente **LEBEN AI**. Como posso te ajudar na sua gestão de diabetes, contagem de carboidratos ou dúvidas de exercícios hoje?'
    }
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
    setInput('');

    setTimeout(() => {
      let aiReply = 'Entendi! Para essa atividade, recomendo monitorar a glicemia 30 minutos após o término e considerar um pequeno snack de 15g se estiver caindo rápido.';
      if (userText.toLowerCase().includes('caminh') || userText.toLowerCase().includes('exercic')) {
        aiReply = 'Caminhadas aumentam a sensibilidade à insulina por até 24 horas. É aconselhável reduzir o bolus da próxima refeição em cerca de 15% a 20%.';
      } else if (userText.toLowerCase().includes('pão') || userText.toLowerCase().includes('pizza')) {
        aiReply = 'Refeições ricas em carboidratos com gordura possuem absorção mais lenta (efeito FPU). Pode ser indicado o uso de Bolus Estendido / Dual em bomba ou fracionamento.';
      }
      setMessages((prev) => [...prev, { sender: 'ai', text: aiReply }]);
    }, 800);
  };

  return (
    <>
      {/* Botão Flutuante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-20 md:bottom-6 right-5 w-14 h-14 rounded-full bg-gradient-to-tr from-teal-500 via-emerald-500 to-amber-500 text-white shadow-xl shadow-teal-500/25 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 z-50 border border-white/40"
        title="Assistente LEBEN AI"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
      </button>

      {/* Drawer / Modal de Chat */}
      {isOpen && (
        <div className="fixed bottom-36 md:bottom-24 right-4 md:right-6 w-[92vw] sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col h-[500px] max-h-[70vh] transition-all animate-in fade-in slide-in-from-bottom-5">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-teal-50 via-emerald-50 to-amber-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-400/30 flex items-center justify-center text-teal-600 font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">LEBEN AI Assistant</h3>
                <p className="text-[10px] text-teal-700 font-semibold">Viva Mais. Preocupe-se Menos.</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mensagens */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl ${
                    m.sender === 'user'
                      ? 'bg-teal-600 text-white font-medium rounded-br-xs shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder="Digite sua dúvida clínica ou nutricional..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-teal-500 font-medium"
            />
            <button
              type="submit"
              className="p-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
