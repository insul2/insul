import React, { useState, useEffect } from 'react';
import { Droplet, Activity } from 'lucide-react';

export default function GlucoseChart24h() {
  const [activePoint, setActivePoint] = useState(null);
  const [userPoints, setUserPoints] = useState([]);

  useEffect(() => {
    const fetchApiReadings = async () => {
      let readings = [];
      try {
        const token = localStorage.getItem('leben_token');
        const res = await fetch('/api/v1/glucose', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.status === 'success' && json.data && json.data.length > 0) {
          readings = json.data;
        }
      } catch (e) {}

      if (readings.length === 0) {
        const savedReadings = localStorage.getItem('leben_glucose_readings');
        readings = savedReadings ? JSON.parse(savedReadings) : [];
      }

      const savedBolus = localStorage.getItem('leben_bolus_history');
      const bolus = savedBolus ? JSON.parse(savedBolus) : [];

      const combined = [
        ...readings.map(r => ({
          time: new Date(r.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          bg: r.glucoseMgDl,
          note: r.trend || 'Medição'
        })),
        ...bolus.map(b => ({
          time: new Date(b.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          bg: b.glucose,
          note: `💉 Bolus ${b.dose}U (${b.carbs}g carbo)`
        }))
      ];

      setUserPoints(combined);
    };

    fetchApiReadings();
  }, []);

  if (userPoints.length === 0) {
    return (
      <div className="h-48 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-2 bg-slate-50/50 dark:bg-slate-950/40">
        <Droplet className="w-8 h-8 text-slate-300 dark:text-slate-700" />
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Nenhuma leitura de glicemia registrada ainda</p>
        <p className="text-xs text-slate-400 max-w-sm">
          Assim que você registrar sua primeira medição capilar ou dose de bolus, o gráfico contínuo de 24h será gerado aqui.
        </p>
      </div>
    );
  }

  const dataPoints = userPoints.slice(0, 12).reverse();

  const width = 800;
  const height = 220;
  const paddingX = 50;
  const paddingY = 20;

  const minBg = 40;
  const maxBg = 240;

  const getY = (bg) => {
    const clamped = Math.max(minBg, Math.min(maxBg, bg));
    const ratio = (clamped - minBg) / (maxBg - minBg);
    return height - paddingY - ratio * (height - 2 * paddingY);
  };

  const getX = (index) => {
    const step = dataPoints.length > 1 ? (width - 2 * paddingX) / (dataPoints.length - 1) : 0;
    return paddingX + index * step;
  };

  const points = dataPoints.map((pt, i) => ({
    x: getX(i),
    y: getY(pt.bg),
    ...pt
  }));

  const pathD = points.reduce((acc, pt, i, arr) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${getY(minBg)} L ${points[0].x} ${getY(minBg)} Z`;

  const yTargetMin = getY(70);
  const yTargetMax = getY(180);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[600px] select-none">
        <defs>
          <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        <rect
          x={paddingX}
          y={yTargetMax}
          width={width - 2 * paddingX}
          height={yTargetMin - yTargetMax}
          fill="url(#targetGrad)"
          rx="4"
        />

        <line x1={paddingX} y1={yTargetMax} x2={width - paddingX} y2={yTargetMax} stroke="#10b981" strokeDasharray="3 3" strokeOpacity="0.5" strokeWidth="1" />
        <line x1={paddingX} y1={yTargetMin} x2={width - paddingX} y2={yTargetMin} stroke="#10b981" strokeDasharray="3 3" strokeOpacity="0.5" strokeWidth="1" />

        <path d={areaD} fill="url(#lineGrad)" opacity="0.08" />
        <path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((pt, i) => {
          let dotColor = '#10b981';
          if (pt.bg < 70) dotColor = '#f43f5e';
          if (pt.bg > 180) dotColor = '#f59e0b';

          return (
            <g key={i} className="cursor-pointer group" onMouseEnter={() => setActivePoint(pt)} onMouseLeave={() => setActivePoint(null)}>
              <circle cx={pt.x} cy={pt.y} r="8" fill="white" stroke={dotColor} strokeWidth="3" className="transition-transform group-hover:scale-125" />
              <text x={pt.x} y={height - 5} textAnchor="middle" className="text-[10px] font-semibold fill-slate-400 dark:fill-slate-500">
                {pt.time}
              </text>
            </g>
          );
        })}
      </svg>

      {activePoint && (
        <div
          className="absolute bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-700 pointer-events-none z-10 animate-in fade-in"
          style={{
            left: `${(activePoint.x / width) * 100}%`,
            top: `${(activePoint.y / height) * 100}%`,
            transform: 'translate(-50%, -120%)'
          }}
        >
          <p className="font-black text-sm">{activePoint.bg} mg/dL</p>
          <p className="text-[10px] text-slate-300">{activePoint.time} • {activePoint.note}</p>
        </div>
      )}
    </div>
  );
}
