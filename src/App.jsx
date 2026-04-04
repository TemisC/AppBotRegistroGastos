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
  Filter
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
import { format, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { supabase } from './lib/supabase';
import StatCard from './components/StatCard';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];
const categories = ['Transporte', 'Alimentación', 'Vivienda', 'Salud', 'Entretenimiento', 'Suscripciones', 'Personal', 'Educación', 'Varios'];

function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [stats, setStats] = useState({ 
    total: 0, 
    today: 0, 
    count: 0, 
    avgDaily: 0,
    topCategory: '',
    highestDay: { amount: 0, date: '' } 
  });
  const [editingExpense, setEditingExpense] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gastos')
        .select('*')
        .order('fecha_gasto', { ascending: false });

      if (error) throw error;
      const allExpenses = data || [];
      setExpenses(allExpenses);
      
      const total = allExpenses.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const today = allExpenses.filter(e => e.fecha_gasto === todayStr).reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
      const uniqueDays = new Set(allExpenses.map(e => e.fecha_gasto)).size || 1;
      const avgDaily = total / uniqueDays;

      const dailyTotals = allExpenses.reduce((acc, curr) => {
        acc[curr.fecha_gasto] = (acc[curr.fecha_gasto] || 0) + parseFloat(curr.monto);
        return acc;
      }, {});
      
      let highestDay = { amount: 0, date: 'N/A' };
      Object.entries(dailyTotals).forEach(([date, amount]) => {
        if (amount > highestDay.amount) highestDay = { amount, date };
      });

      const catTotals = allExpenses.reduce((acc, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + parseFloat(curr.monto);
        return acc;
      }, {});
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
      setStats({ total, today, count: allExpenses.length, avgDaily, topCategory: topCat, highestDay });
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
    fetchData();
  }, []);

  // 1. Process Monthly History Data
  const monthlyData = useMemo(() => {
    return Object.entries(
      expenses.reduce((acc, curr) => {
        const month = String(curr.fecha_gasto).substring(0, 7);
        acc[month] = (acc[month] || 0) + parseFloat(curr.monto);
        return acc;
      }, {})
    ).map(([name, value]) => ({ name, value })).reverse().slice(0, 6);
  }, [expenses]);

  // 2. Process Detailed Daily Peaks Data (with categories filter)
  const dailyTimelineData = useMemo(() => {
    const days = eachDayOfInterval({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date())
    });

    return days.map(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayTotal = expenses
        .filter(e => e.fecha_gasto === dateStr && (selectedCategory === 'Todas' || e.categoria === selectedCategory))
        .reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
      
      return {
        date: format(day, 'dd/MM'),
        monto: dayTotal
      };
    });
  }, [expenses, selectedCategory]);

  // Category Charts Data
  const categoryData = Object.entries(
    expenses.reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + parseFloat(curr.monto);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  const topExpenses = [...expenses].sort((a, b) => b.monto - a.monto).slice(0, 5);

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
              <p className="text-[10px] text-muted-foreground font-bold tracking-[0.2em] uppercase">Supabase Powered</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end text-sm">
              <span className="text-emerald-500 font-black tracking-tighter">● Sincronizado</span>
              <span className="text-white/60 text-xs">V. 2.5.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-5xl font-black text-white tracking-tighter mb-3 leading-none">
              Resumen <span className="text-primary underline decoration-primary/30 underline-offset-8">Financiero</span>
            </h2>
            <p className="text-muted-foreground text-lg font-medium max-w-xl italic">
              "El control de hoy es la libertad de mañana."
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 px-8 py-4 rounded-3xl backdrop-blur-md shadow-inner">
             <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">Monto Total de Mes</p>
             <p className="text-3xl font-black text-white tracking-tighter">${stats.total.toLocaleString()}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Capital Saliente" value={`$${stats.total.toLocaleString()}`} icon={TrendingUp} color="primary" />
          <StatCard title="Promedio Diario" value={`$${stats.avgDaily.toLocaleString()}`} icon={Zap} color="blue-500" />
          <StatCard title="Máximo Día" value={`$$${stats.highestDay.amount.toLocaleString()}`} icon={AlertCircle} color="amber-500" />
          <StatCard title="Transacciones" value={stats.count} icon={Calendar} color="emerald-500" />
        </div>

        {/* --- NEW DAILY PEAKS SECTION --- */}
        <div className="grid grid-cols-1 mb-12">
          <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-2 bg-gradient-to-b from-primary to-blue-600 rounded-full" />
                 <div>
                    <h3 className="font-black text-2xl text-white tracking-tight uppercase">Análisis de Picos Diarios</h3>
                    <p className="text-muted-foreground text-sm font-medium">Radiografía completa de gastos mes actual</p>
                 </div>
              </div>
              
              <div className="flex items-center gap-3 bg-black/40 p-2 rounded-2xl border border-white/5">
                <Filter size={14} className="text-primary ml-2" />
                <select 
                  className="bg-transparent text-white font-bold text-sm outline-none cursor-pointer pr-4"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="Todas">Todas las Categorías</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTimelineData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.02)" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10, fontWeight: 'bold'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#444', fontSize: 10}} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px' }} 
                    itemStyle={{ color: '#8b5cf6', fontSize: '14px', fontWeight: 'bold' }}
                    cursor={{fill: 'rgba(139, 92, 246, 0.05)'}}
                  />
                  <Bar dataKey="monto" fill="url(#dailyGrad)" radius={[4, 4, 0, 0]} animationDuration={1500} />
                  <defs>
                    <linearGradient id="dailyGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#4f46e5" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl relative overflow-hidden group">
               <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-6 bg-primary rounded-full" />
                  <h3 className="font-black text-xl text-white tracking-widest uppercase italic">Concentración de Capital</h3>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  {categoryData.slice(0, 5).map((cat) => (
                    <div key={cat.name} className="space-y-2">
                       <div className="flex justify-between text-[11px] font-black uppercase tracking-widest">
                          <span className="text-white/60">{cat.name}</span>
                          <span className="text-primary">${cat.value.toLocaleString()}</span>
                       </div>
                       <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${(cat.value / stats.total) * 100}%` }} />
                       </div>
                    </div>
                  ))}
                </div>
                <div className="h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {categoryData.map((_, i) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#000', border: '1px solid #222', borderRadius: '16px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <div className="bg-[#111] border border-white/5 p-8 rounded-[40px] shadow-2xl flex flex-col h-[600px]">
              <h3 className="font-black text-xs text-white uppercase tracking-[0.3em] mb-8 italic">Journal de Actividad</h3>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <ExpenseList expenses={expenses} loading={loading} onDelete={handleDelete} onEdit={setEditingExpense} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        body { margin: 0; background: #080808; overflow-x: hidden; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #a855f7; }
        select option { background: #111; color: #fff; }
      `}</style>
      
      <ExpenseForm onAdd={fetchData} onUpdate={() => { fetchData(); setEditingExpense(null); }} editingExpense={editingExpense} onCancelEdit={() => setEditingExpense(null)} />
    </div>
  );
}

export default App;
