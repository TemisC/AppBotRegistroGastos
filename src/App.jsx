import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
  ArrowUpRight,
  Loader2,
  AlertCircle,
  Zap,
  Filter,
  History,
  Lock,
  ChevronRight,
  ChevronDown,
  Check,
  Search,
  X,
  FileText
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, subMonths, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const DATE_FILTERS = {
  'mes_actual': 'Mes Actual',
  'mes_anterior': 'Mes Anterior',
  'ultimos_3_meses': 'Últimos 3 Meses',
  'ultimos_6_meses': 'Últimos 6 Meses',
  'ultimo_ano': 'Último Año',
  'todos': 'Todos'
};
import { supabase } from './lib/supabase';
import StatCard from './components/StatCard';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';
import ReportGenerator from './components/ReportGenerator';

const COLORS = [
  '#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#ec4899', '#84cc16', '#6366f1', '#f97316',
  '#14b8a6', '#f43f5e', '#8b5cf6', '#d946ef', '#0ea5e9', '#22c55e'
];
const categories = [
  'Transporte', 'Alimentación', 'Vivienda', 'Salud',
  'Entretenimiento', 'Suscripciones', 'Personal', 'Educación',
  'Varios', 'Gastos del Negocio', 'Gastos del Negocio Tienda',
  'Impuestos y Servicios', 'Ahorro e Inversión', 'Mascotas',
  'Regalos', 'Ropa y Calzado'
];
const MASTER_PIN = '3339';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [excludedCategories, setExcludedCategories] = useState([]);
  const [dateFilter, setDateFilter] = useState('mes_actual');
  const [isDateFilterMenuOpen, setIsDateFilterMenuOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [selectedDateSummary, setSelectedDateSummary] = useState(null);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [useSmartScale, setUseSmartScale] = useState(true);
  const [journalSearch, setJournalSearch] = useState('');

  const getDateRange = (filter) => {
    const today = new Date();
    switch (filter) {
      case 'mes_actual':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'mes_anterior': {
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case 'ultimos_3_meses':
        return { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) };
      case 'ultimos_6_meses':
        return { start: startOfMonth(subMonths(today, 5)), end: endOfMonth(today) };
      case 'ultimo_ano':
        return { start: startOfMonth(subMonths(today, 11)), end: endOfMonth(today) };
      case 'todos':
      default:
        return { start: null, end: null };
    }
  };

  const { start: startDate, end: endDate } = useMemo(() => getDateRange(dateFilter), [dateFilter]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      if (!startDate || !endDate) return true;
      const expenseDate = e.fecha_gasto;
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      return expenseDate >= startStr && expenseDate <= endStr;
    });
  }, [expenses, startDate, endDate]);

  const stats = useMemo(() => {
    const total = filteredExpenses.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const today = filteredExpenses.filter(e => e.fecha_gasto === todayStr).reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
    const uniqueDays = new Set(filteredExpenses.map(e => e.fecha_gasto)).size || 1;
    const avgDaily = total / uniqueDays;

    const dailyTotals = filteredExpenses.reduce((acc, curr) => {
      acc[curr.fecha_gasto] = (acc[curr.fecha_gasto] || 0) + parseFloat(curr.monto);
      return acc;
    }, {});

    let highestDay = { amount: 0, date: 'N/A' };
    Object.entries(dailyTotals).forEach(([date, amount]) => {
      if (amount > highestDay.amount) highestDay = { amount, date };
    });

    const catTotals = filteredExpenses.reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + parseFloat(curr.monto);
      return acc;
    }, {});
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return { total, today, count: filteredExpenses.length, avgDaily, topCategory: topCat, highestDay };
  }, [filteredExpenses]);

  // Check auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('finance_agent_token');
    if (savedToken === btoa(MASTER_PIN)) {
      setIsAuthorized(true);
    }
  }, []);

  const handleAuth = (e) => {
    e?.preventDefault();
    if (pinInput === MASTER_PIN) {
      setIsAuthorized(true);
      localStorage.setItem('finance_agent_token', btoa(MASTER_PIN));
      setPinError(false);
    } else {
      setPinError(true);
      setPinInput('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const fetchData = async () => {
    if (!isAuthorized) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .order('fecha_gasto', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase.from('gastos').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error) {
      alert('Error: ' + error.message);
    }
  };

  useEffect(() => {
    if (isAuthorized) fetchData();
  }, [isAuthorized]);

  useEffect(() => {
    if (selectedDateSummary) {
      const dayExpenses = filteredExpenses.filter(e =>
        e.fecha_gasto === selectedDateSummary.fullDate &&
        (selectedCategory === 'Todas'
          ? !excludedCategories.includes(e.categoria)
          : e.categoria === selectedCategory)
      );
      const dayTotal = dayExpenses.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
      setSelectedDateSummary(prev => ({
        ...prev,
        expenses: dayExpenses,
        total: dayTotal
      }));
    }
  }, [selectedCategory, excludedCategories, filteredExpenses]);

  const monthlyHistoryData = useMemo(() => {
    return Object.entries(
      filteredExpenses
        .filter(e => selectedCategory === 'Todas'
          ? !excludedCategories.includes(e.categoria)
          : e.categoria === selectedCategory)
        .reduce((acc, curr) => {
          const month = String(curr.fecha_gasto).substring(0, 7);
          acc[month] = (acc[month] || 0) + parseFloat(curr.monto);
          return acc;
        }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => a.name.localeCompare(b.name)).slice(-6);
  }, [filteredExpenses, selectedCategory, excludedCategories]);

  const dailyTimelineData = useMemo(() => {
    let startInterval = startDate;
    let endInterval = endDate;

    if (!startInterval || !endInterval) {
      if (filteredExpenses.length === 0) {
        startInterval = startOfMonth(new Date());
        endInterval = endOfMonth(new Date());
      } else {
        const dates = filteredExpenses.map(e => e.fecha_gasto).sort();
        startInterval = new Date(dates[0] + 'T00:00:00');
        endInterval = new Date(dates[dates.length - 1] + 'T00:00:00');
        if (isBefore(endInterval, startInterval)) endInterval = startInterval;
      }
    }

    const days = eachDayOfInterval({
      start: startInterval,
      end: endInterval
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTotal = filteredExpenses
        .filter(e =>
          e.fecha_gasto === dateStr &&
          (selectedCategory === 'Todas'
            ? !excludedCategories.includes(e.categoria)
            : e.categoria === selectedCategory)
        )
        .reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

      return {
        date: format(day, 'dd/MM'),
        monto: dayTotal,
        fullDate: dateStr
      };
    });
  }, [filteredExpenses, selectedCategory, excludedCategories, startDate, endDate]);

  const categoryMonthTotal = useMemo(() => {
    return dailyTimelineData.reduce((acc, d) => acc + d.monto, 0);
  }, [dailyTimelineData]);

  const { chartData, yAxisMax } = useMemo(() => {
    const data = dailyTimelineData;
    const values = data.map(d => d.monto).filter(v => v > 0).sort((a, b) => b - a);

    let max = 'auto';
    if (useSmartScale && values.length >= 2) {
      const highest = values[0];
      const secondHighest = values[1];
      const thirdHighest = values[2] || secondHighest;

      // Si el más alto es más de 3 veces el segundo, aplicar tope inteligente
      if (highest > secondHighest * 3) {
        max = Math.max(secondHighest * 1.2, thirdHighest * 1.5);
      }
    }

    const processedData = data.map(d => ({
      ...d,
      displayMonto: max === 'auto' ? d.monto : Math.min(d.monto, max),
      isOutlier: max !== 'auto' && d.monto > max
    }));

    return { chartData: processedData, yAxisMax: max };
  }, [dailyTimelineData, useSmartScale]);

  const categoryData = Object.entries(
    filteredExpenses.reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + parseFloat(curr.monto);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const topExpenses = [...filteredExpenses].sort((a, b) => b.monto - a.monto).slice(0, 5);

  // AUTH VIEW (THE WALL)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-6 font-sans">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-primary/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full" />

        <div className="w-full max-w-md bg-[#111] border border-white/5 p-12 rounded-[48px] shadow-2xl relative z-10 text-center">
          <div className="bg-gradient-to-tr from-primary to-blue-600 w-16 h-16 rounded-3xl mx-auto flex items-center justify-center mb-10 shadow-lg shadow-primary/20">
            <Lock className="text-white" size={32} />
          </div>
          <h1 className="text-4xl font-black text-white tracking-widest uppercase italic mb-2">FinanceAgent</h1>
          <p className="text-muted-foreground font-bold tracking-[0.3em] uppercase text-xs mb-10">Secure Access</p>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="relative">
              <input
                type="password"
                placeholder="Enter Security PIN"
                className={`w-full bg-black border ${pinError ? 'border-destructive animate-shake' : 'border-white/10'} px-6 py-5 rounded-2xl text-center text-2xl font-black tracking-[1em] text-white outline-none focus:border-primary transition-all placeholder:tracking-normal placeholder:text-muted-foreground/30`}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="w-full bg-white text-black font-black py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary hover:text-white transition-all transform active:scale-95 text-sm uppercase tracking-widest"
            >
              Verify Identity <ChevronRight size={18} />
            </button>
          </form>
          {pinError && <p className="mt-6 text-destructive font-black text-xs uppercase tracking-widest animate-fade-in">Código PIN Incorrecto</p>}
        </div>

        <style>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; }
        `}</style>
      </div>
    );
  }

  if (currentView === 'reports') {
    return <ReportGenerator expenses={expenses} onBack={() => setCurrentView('dashboard')} />;
  }

  // MAIN DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-[#080808] text-foreground font-sans selection:bg-primary/40 selection:text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-primary to-blue-600 p-2.5 rounded-2xl shadow-lg shadow-primary/20">
              <Wallet className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-white uppercase italic">FinanceAgent</h1>
              <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">V. 3.2 Premium</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentView('reports')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <FileText size={14} /> Reportes
            </button>
            <button
              onClick={() => { localStorage.removeItem('finance_agent_token'); setIsAuthorized(false); }}
              className="text-[10px] font-black text-muted-foreground hover:text-white uppercase tracking-widest border border-white/10 px-4 py-2 rounded-xl transition-all hover:bg-white/5"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-5xl font-black text-white tracking-tighter mb-3 leading-none italic uppercase">
              Finanzas <span className="text-primary underline decoration-primary/30 underline-offset-8">Inteligentes</span>
            </h2>
            <p className="text-muted-foreground text-lg font-medium max-w-xl italic">
              Visión total de tus finanzas en tiempo real.
            </p>
          </div>
          <div className="relative z-20">
            <div
              className="flex items-center gap-3 bg-[#111] px-5 py-3 rounded-2xl border border-white/10 cursor-pointer hover:bg-white/5 transition-all shadow-lg"
              onClick={() => setIsDateFilterMenuOpen(!isDateFilterMenuOpen)}
            >
              <Calendar size={18} className="text-primary" />
              <span className="text-white font-black text-sm uppercase tracking-wider">
                {DATE_FILTERS[dateFilter]}
              </span>
              <ChevronDown size={16} className="text-white/40 ml-2" />
            </div>

            {isDateFilterMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDateFilterMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-[#111] border border-white/10 rounded-[24px] shadow-2xl z-50 overflow-hidden animate-fade-in">
                  <div className="p-2 space-y-1">
                    {Object.entries(DATE_FILTERS).map(([key, label]) => (
                      <div
                        key={key}
                        onClick={() => {
                          setDateFilter(key);
                          setIsDateFilterMenuOpen(false);
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${dateFilter === key ? 'bg-primary/20 text-white' : 'hover:bg-white/5 text-white/60'}`}
                      >
                        <span className="text-xs font-black uppercase tracking-wider">{label}</span>
                        {dateFilter === key && <Check size={14} className="text-primary" />}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Capital Saliente" value={`$${stats.total.toLocaleString()}`} icon={TrendingUp} color="primary" />
          <StatCard title="Gasto Medio" value={`$${stats.avgDaily.toLocaleString()}`} icon={Zap} color="blue-500" />
          <StatCard title="Máximo Día" value={`$${stats.highestDay.amount.toLocaleString()}`} icon={AlertCircle} color="amber-500" />
          <StatCard title="Movimientos" value={stats.count} icon={History} color="emerald-500" />
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 items-start">

          {/* MAIN CHARTS AREA (Left) */}
          <div className="lg:col-span-8 space-y-8 w-full">

            <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl relative">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-8 w-2 bg-primary rounded-full" />
                  <h3 className="font-black text-xl text-white tracking-tight uppercase">Análisis de Picos Diarios</h3>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    onClick={() => setUseSmartScale(!useSmartScale)}
                    className={`flex items-center gap-2 p-2 rounded-2xl border cursor-pointer transition-all ${useSmartScale ? 'bg-primary/20 border-primary text-primary' : 'bg-black/40 border-white/5 text-white/40 hover:text-white'}`}
                    title={useSmartScale ? "Desactivar Escala Inteligente" : "Activar Escala Inteligente"}
                  >
                    <TrendingUp size={14} className={useSmartScale ? 'animate-pulse' : ''} />
                    <span className="text-[10px] font-black uppercase hidden md:inline">{useSmartScale ? 'Escala: Smart' : 'Escala: Normal'}</span>
                  </div>

                  <div className="relative">
                    <div
                      className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5 cursor-pointer hover:bg-black/60 transition-all"
                      onClick={() => setIsCategoryMenuOpen(!isCategoryMenuOpen)}
                    >
                      <Filter size={14} className="text-primary ml-2" />
                      <span className="text-white font-bold text-sm pr-2">
                        {selectedCategory === 'Todas'
                          ? (excludedCategories.length > 0 ? `Todas (-${excludedCategories.length})` : 'Categoría: Todas')
                          : selectedCategory}
                      </span>
                      <ChevronDown size={14} className="text-white/40" />
                    </div>

                    {isCategoryMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsCategoryMenuOpen(false)} />
                        <div className="absolute right-0 mt-2 w-64 bg-[#111] border border-white/10 rounded-[24px] shadow-2xl z-50 overflow-hidden animate-fade-in">
                          <div className="p-2 space-y-1">
                            <div
                              onClick={() => {
                                setSelectedCategory('Todas');
                                setIsCategoryMenuOpen(false);
                                if (selectedCategory !== 'Todas') setExcludedCategories([]);
                              }}
                              className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all ${selectedCategory === 'Todas' ? 'bg-primary/20 text-white' : 'hover:bg-white/5 text-white/60'}`}
                            >
                              <span className="text-xs font-black uppercase tracking-wider">Todas las Categorías</span>
                              {selectedCategory === 'Todas' && <Check size={14} className="text-primary" />}
                            </div>

                            <div className="h-[1px] bg-white/5 my-1 mx-2" />

                            <div className="max-h-[350px] overflow-y-auto custom-scrollbar py-1">
                              {categories.map(cat => {
                                const isExcluded = excludedCategories.includes(cat);
                                const isSelected = selectedCategory === cat;
                                return (
                                  <div
                                    key={cat}
                                    className={`flex items-center justify-between px-4 py-2 rounded-xl cursor-pointer transition-all group ${isSelected ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-white/60'}`}
                                    onClick={() => {
                                      setSelectedCategory(cat);
                                      setIsCategoryMenuOpen(false);
                                      setExcludedCategories([]);
                                    }}
                                  >
                                    <span className="text-xs font-bold">{cat}</span>

                                    <div className="flex items-center gap-2">
                                      {selectedCategory === 'Todas' && (
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExcludedCategories(prev =>
                                              prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
                                            );
                                          }}
                                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${isExcluded ? 'bg-red-500/20 border-red-500/50' : 'bg-black/40 border-white/10 hover:border-white/30'}`}
                                        >
                                          {isExcluded && <Check size={12} className="text-red-500" />}
                                        </div>
                                      )}
                                      {isSelected && <Check size={14} className="text-primary" />}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              {selectedCategory !== 'Todas' && (
                <p className="text-xs font-bold text-white/50 mb-6 -mt-4">
                  Categoría <span className="text-primary font-black">{selectedCategory}</span>
                  <span className="text-white/30 mx-2">·</span>
                  Total: <span className="text-white font-black">${categoryMonthTotal.toLocaleString()}</span>
                </p>
              )}
              <div className="h-[300px]">
                {selectedDateSummary ? (
                  <div className="h-full flex flex-col animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-xl">
                          <Calendar size={16} className="text-primary" />
                        </div>
                        <div>
                          <h4 className="text-white font-black uppercase text-xs tracking-widest leading-none">Detalle del Día</h4>
                          <p className="text-muted-foreground text-[10px] font-bold mt-1">{selectedDateSummary.date} — Total: ${selectedDateSummary.total.toLocaleString()}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedDateSummary(null)}
                        className="text-[10px] font-black text-muted-foreground hover:text-white uppercase tracking-widest bg-white/5 border border-white/10 px-4 py-2 rounded-xl transition-all hover:bg-white/10"
                      >
                        Volver a la Gráfica
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                      {selectedDateSummary.expenses.length > 0 ? (
                        selectedDateSummary.expenses.map((exp, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.04] transition-all">
                            <div className="flex items-center gap-3 overflow-hidden">
                              <span className="text-[10px] font-black text-primary/60 bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/10 whitespace-nowrap">
                                {exp.categoria}
                              </span>
                              <span className="text-xs font-bold text-white truncate">{exp.descripcion || 'Sin descripción'}</span>
                            </div>
                            <span className="text-xs font-black text-white tabular-nums ml-4">${parseFloat(exp.monto).toLocaleString()}</span>
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-sm">
                          No hay gastos este día para la categoría seleccionada
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.01)" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#444', fontSize: 9 }} />
                      <YAxis
                        domain={[0, yAxisMax]}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#444', fontSize: 9 }}
                        tickFormatter={(val) => {
                          if (val === yAxisMax && chartData.some(d => d.isOutlier)) {
                            const realMax = Math.max(...chartData.map(d => d.monto));
                            return `$${realMax.toLocaleString()}`;
                          }
                          return val;
                        }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#000', border: '1px solid #111', borderRadius: '16px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: '#a855f7', fontWeight: '900' }}
                        cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                        formatter={(value, name, props) => [`$${props.payload.monto.toLocaleString()}`, 'Monto']}
                      />
                      <Bar
                        dataKey="displayMonto"
                        fill="url(#picoGrad)"
                        radius={[4, 4, 0, 0]}
                        style={{ cursor: 'pointer' }}
                        label={(props) => {
                          const { x, y, width, isOutlier, monto } = props;
                          if (!isOutlier || monto == null) return null;
                          return (
                            <text
                              x={x + width / 2}
                              y={y - 10}
                              fill="#ef4444"
                              textAnchor="middle"
                              fontSize={11}
                              fontWeight="900"
                              fontFamily="inherit"
                            >
                              ${monto.toLocaleString()}
                            </text>
                          );
                        }}
                        onClick={(data) => {
                          if (data && data.fullDate) {
                            const dayExpenses = expenses.filter(e =>
                              e.fecha_gasto === data.fullDate &&
                              (selectedCategory === 'Todas'
                                ? !excludedCategories.includes(e.categoria)
                                : e.categoria === selectedCategory)
                            );
                            setSelectedDateSummary({
                              date: data.date,
                              fullDate: data.fullDate,
                              expenses: dayExpenses,
                              total: data.monto
                            });
                          }
                        }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.isOutlier ? 'url(#outlierGrad)' : 'url(#picoGrad)'}
                          />
                        ))}
                      </Bar>
                      <defs>
                        <linearGradient id="picoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a855f7" />
                          <stop offset="100%" stopColor="#3b82f6" />
                        </linearGradient>
                        <linearGradient id="outlierGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ef4444" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-1 h-8 bg-blue-600 rounded-full" />
                <h3 className="font-black text-xl text-white tracking-widest uppercase italic">Evolución Mensual</h3>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyHistoryData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#666', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #222', borderRadius: '12px' }} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[10, 10, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl">
              <div>
                <h3 className="font-black text-xl text-white tracking-tight uppercase mb-8 italic">Distribución de Capital</h3>
                <div className="space-y-5">
                  {categoryData.slice(0, 5).map((cat) => (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-tighter">
                        <span className="text-white/40">{cat.name}</span>
                        <span className="text-primary">${cat.value.toLocaleString()}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${(cat.value / stats.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                      {categoryData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* SIDEBAR AREA (Right) */}
          <div className="lg:col-span-4 w-full h-full">
            <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl flex flex-col h-[600px] lg:h-[calc(100vh-250px)] lg:sticky lg:top-32">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-black text-xs text-white uppercase tracking-[0.3em] italic">Journal Diario</h3>
                <div className="px-2 py-1 bg-primary/20 text-primary text-[10px] font-black rounded uppercase">Live</div>
              </div>
              <div className="relative mb-4">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  value={journalSearch}
                  onChange={e => setJournalSearch(e.target.value)}
                  placeholder="Buscar gasto..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl pl-8 pr-8 py-2.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary/40 transition-all"
                />
                {journalSearch && (
                  <button
                    onClick={() => setJournalSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <ExpenseList
                  expenses={filteredExpenses.filter(e => {
                    if (!journalSearch.trim()) return true;
                    const q = journalSearch.toLowerCase();
                    return (
                      (e.descripcion || '').toLowerCase().includes(q) ||
                      e.categoria.toLowerCase().includes(q) ||
                      e.fecha_gasto.includes(q) ||
                      String(e.monto).includes(q)
                    );
                  })}
                  loading={loading}
                  onDelete={handleDelete}
                  onEdit={setEditingExpense}
                />
              </div>
            </div>
          </div>

        </div>
      </main>

      <style>{`
        body { margin: 0; background: #080808; overflow-x: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a855f7; }
        select option { background: #111; color: #fff; }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>

      <ExpenseForm onAdd={fetchData} onUpdate={() => { fetchData(); setEditingExpense(null); }} editingExpense={editingExpense} onCancelEdit={() => setEditingExpense(null)} />
    </div>
  );
}

export default App;
