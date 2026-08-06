import React, { useState, useEffect } from 'react';
import { Apple, Search, Utensils, CheckCircle2, Syringe, Sparkles } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export default function FoodSearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialQuery = searchParams.get('q') || 'arroz';
  const [query, setQuery] = useState(initialQuery);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  // Lista de alimentos selecionados para a refeição
  const [selectedFoods, setSelectedFoods] = useState([]);

  const fetchFoods = async (searchTerm) => {
    const q = (searchTerm || 'arroz').trim();
    setLoading(true);
    try {
      const token = localStorage.getItem('leben_token');
      const res = await fetch(`/api/v1/foods/search?q=${encodeURIComponent(q)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const text = await res.text();
      if (!text) {
        setLoading(false);
        return;
      }
      const json = JSON.parse(text);
      if (json.status === 'success' && json.data) {
        setFoods(json.data);
      }
    } catch (err) {
      console.error('Erro ao pesquisar alimentos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFoods(query);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFoods(query);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.length >= 2 || val.length === 0) {
      fetchFoods(val || 'arroz');
    }
  };

  // Alternar seleção do alimento
  const toggleSelectFood = (food) => {
    const exists = selectedFoods.some((f) => f.name === food.name);
    if (exists) {
      setSelectedFoods(selectedFoods.filter((f) => f.name !== food.name));
    } else {
      setSelectedFoods([...selectedFoods, food]);
    }
  };

  // Soma total de carboidratos selecionados
  const totalCarbs = selectedFoods.reduce((acc, f) => acc + (f.carbs_g || 0), 0);

  const handleCalculateSelected = () => {
    if (totalCarbs <= 0) return;
    navigate(`/bolus?carbs=${totalCarbs}`);
  };

  const quickCategories = ['Arroz', 'Feijão', 'Pão', 'Banana', 'Maçã', 'Leite', 'Macarrão'];

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-24">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Utensils className="w-7 h-7 text-amber-500" />
          <span>Tabela Nutricional LEBEN</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Pesquise na base de 8.053 alimentos verificados (TACO/UNICAMP + SBD) e selecione para calcular o bolus.
        </p>
      </div>

      {/* Busca e Categorias Rápidas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Digite o nome do alimento (ex: Arroz, Pão francês, Maçã)..."
            value={query}
            onChange={handleSearchChange}
            className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-11 pr-24 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-500 font-medium"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors"
          >
            {loading ? 'Buscando...' : 'Pesquisar'}
          </button>
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Filtros Rápidos:</span>
          {quickCategories.map((cat, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(cat);
                fetchFoods(cat);
              }}
              className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors shrink-0"
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados da Busca */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-teal-500 animate-spin" />
            <p className="text-sm font-semibold">Consultando tabela de alimentos...</p>
          </div>
        ) : foods.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {foods.map((food, idx) => {
              const isSelected = selectedFoods.some((f) => f.name === food.name);
              return (
                <div
                  key={idx}
                  onClick={() => toggleSelectFood(food)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500 dark:border-teal-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-300'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-sm">{food.name}</h4>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Porção: <b className="text-slate-700 dark:text-slate-300">{food.portion_description || '100g'}</b> • Grupo: {food.group || 'Geral'}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-teal-600 dark:text-teal-400 block">{food.carbs_g}g</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Carboidratos</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-500 space-y-2">
            <Apple className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-semibold">Nenhum alimento encontrado para "{query}".</p>
            <p className="text-xs text-slate-400">Tente buscar por termos simples como "Arroz", "Pão", "Leite" ou "Banana".</p>
          </div>
        )}
      </div>

      {/* BARRA FLUTUANTE DE SOMA E CÁLCULO DE BOLUS */}
      {selectedFoods.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 w-[92vw] max-w-xl bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex items-center justify-between gap-4 z-40 animate-in fade-in slide-in-from-bottom-5">
          <div>
            <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold block">
              Refeição Selecionada ({selectedFoods.length} itens)
            </span>
            <span className="text-xl font-black text-teal-400">
              {totalCarbs}g <span className="text-xs font-semibold text-slate-300">de Carboidratos Total</span>
            </span>
          </div>

          <button
            onClick={handleCalculateSelected}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-md shadow-teal-500/30 flex items-center gap-2 shrink-0 transition-transform active:scale-95"
          >
            <Syringe className="w-4 h-4" />
            <span>Calcular Bolus ({totalCarbs}g)</span>
          </button>
        </div>
      )}
    </div>
  );
}
