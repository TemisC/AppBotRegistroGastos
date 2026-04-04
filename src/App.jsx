import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
  ArrowUpRight,
  Loader2,
  ChevronRight,
  AlertCircle,
  Zap
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
import { supabase } from './lib/supabase';
import StatCard from './components/StatCard';
import ExpenseList from './components/ExpenseList';
import ExpenseForm from './components/ExpenseForm';

const COLORS = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#6366f1'];

function App() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
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
      
      // 1. Calculate General Stats
      const total = allExpenses.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
      const todayStr = new Date().toISOString().split('T')[0];
      const today = allExpenses
        .filter(e => e.fecha_gasto === todayStr)
        .reduce((acc, curr) => acc + parseFloat(curr.monto), 0);

      // 2. Advanced Analysis: Daily Avg
      const uniqueDays = new Set(allExpenses.map(e => e.fecha_gasto)).size || 1;
      const avgDaily = total / uniqueDays;

      // 3. Highest Spending Day
      const dailyTotals = allExpenses.reduce((acc, curr) => {
        acc[curr.fecha_gasto] = (acc[curr.fecha_gasto] || 0) + parseFloat(curr.monto);
        return acc;
      }, {});
      
      let highestDay = { amount: 0, date: 'N/A' };
      Object.entries(dailyTotals).forEach(([date, amount]) => {
        if (amount > highestDay.amount) {
          highestDay = { amount, date };
        }
      });

      // 4. Top Category
      const catTotals = allExpenses.reduce((acc, curr) => {
        acc[curr.categoria] = (acc[curr.categoria] || 0) + parseFloat(curr.monto);
        return acc;
      }, {});
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
        
      setStats({ 
        total, 
        today, 
        count: allExpenses.length,
        avgDaily,
        topCategory: topCat,
        highestDay
      });
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

  // Category Charts Data
  const categoryData = Object.entries(
    expenses.reduce((acc, curr) => {
      acc[curr.categoria] = (acc[curr.categoria] || 0) + parseFloat(curr.monto);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }))
   .sort((a, b) => b.value - a.value);

  // Monthly Chart Data (Last 6 Months)
  const monthlyData = Object.entries(
    expenses.reduce((acc, curr) => {
      const month = String(curr.fecha_gasto).substring(0, 7);
      acc[month] = (acc[month] || 0) + parseFloat(curr.monto);
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value })).reverse().slice(0, 6);

  // Top 5 Expenses of the Month
  const topExpenses = [...expenses]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#080808] text-foreground font-sans selection:bg-primary/40 selection:text-white">
      {/* Dynamic Background Noise/Glow */}
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
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest">En Línea</span>
              <span className="text-sm font-bold text-white/90">Dashboard 2.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 relative z-10">
        {/* Welcome Section */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-5xl font-black text-white tracking-tighter mb-3 leading-none">
              Resumen <span className="text-primary underline decoration-primary/30 underline-offset-8">Financiero</span>
            </h2>
            <p className="text-muted-foreground text-lg font-medium max-w-xl">
              Análisis profundo de tus movimientos. Última actualización: {new Date().toLocaleTimeString()}.
            </p>
          </div>
          <div className="flex gap-3">
             <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl backdrop-blur-md">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Categoría Top</p>
                <p className="text-xl font-black text-primary">{stats.topCategory}</p>
             </div>
          </div>
        </section>

        {/* Primary Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <StatCard title="Capital Saliente" value={`$${stats.total.toLocaleString()}`} icon={TrendingUp} color="primary" />
          <StatCard title="Promedio Diario" value={`$${stats.avgDaily.toLocaleString()}`} icon={Zap} color="blue-500" />
          <StatCard title="Máximo en un Día" value={`$${stats.highestDay.amount.toLocaleString()}`} icon={AlertCircle} color="amber-500" />
          <StatCard title="Transacciones" value={stats.count} icon={Calendar} color="emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Analytics Column */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Detailed Categories Breakdown */}
            <div className="bg-[#111] border border-white/5 p-8 rounded-[32px] shadow-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-2xl text-white tracking-tight flex items-center gap-3">
                   <div className="w-1 h-8 bg-primary rounded-full" />
                   Detalle por Categoría
                </h3>
                <PieChartIcon className="text-muted-foreground/30" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  {categoryData.slice(0, 5).map((cat, i) => (
                    <div key={cat.name} className="space-y-2">
                       <div className="flex justify-between text-sm font-bold">
                          <span className="text-white/80">{cat.name}</span>
                          <span className="text-primary">${cat.value.toLocaleString()}</span>
                       </div>
                       <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-1000 ease-out" 
                            style={{ width: `${(cat.value / stats.total) * 100}%` }}
                          />
                       </div>
                    </div>
                  ))}
                </div>
                <div className="h-[250px]">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" animationDuration={1000} stroke="none">
                        {categoryData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Monthly Trend Chart */}
            <div className="bg-[#111] border border-white/5 p-8 rounded-[32px] shadow-2xl overflow-hidden group">
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-black text-2xl text-white tracking-tight flex items-center gap-3">
                   <div className="w-1 h-8 bg-blue-600 rounded-full" />
                   Evolución Mensual
                </h3>
                <BarChart3 className="text-muted-foreground/30" />
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#222" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 11, fontWeight: 'bold'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#666', fontSize: 11}} />
                    <Tooltip contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }} cursor={{fill: 'rgba(255,255,255,0.02)'}} />
                    <Bar dataKey="value" fill="url(#barGrad)" radius={[10, 10, 0, 0]} barSize={32} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#3b82f6" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Right Insights Column */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* Recent Expenses List */}
            <div className="bg-[#111] border border-white/5 p-8 rounded-[32px] shadow-2xl flex flex-col h-[500px]">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-white uppercase tracking-widest text-xs">Registros Recientes</h3>
                <button 
                  onClick={fetchData}
                  className="text-primary text-[10px] font-black hover:underline tracking-widest uppercase"
                >
                  Actualizar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <ExpenseList expenses={expenses.slice(0, 30)} loading={loading} onDelete={handleDelete} onEdit={setEditingExpense} />
              </div>
            </div>

            {/* Top 5 Expenses Box */}
            <div className="bg-gradient-to-br from-primary/10 to-blue-600/10 border border-primary/20 p-8 rounded-[32px] shadow-2xl">
              <h3 className="font-black text-xl text-white mb-6 tracking-tight italic">Top 5 Gastos Pesados</h3>
              <div className="space-y-4">
                {topExpenses.map((exp, i) => (
                  <div key={exp.id} className="flex items-center justify-between group cursor-default">
                    <div className="flex items-center gap-3">
                      <span className="text-primary/40 font-black italic text-lg opacity-40 group-hover:opacity-100 transition-opacity">#0{i+1}</span>
                      <span className="text-white/80 font-bold text-sm truncate max-w-[120px]">{exp.descripcion || exp.categoria}</span>
                    </div>
                    <span className="font-black text-white tabular-nums">${parseFloat(exp.monto).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Styled Components Tag (Global Styles) */}
      <style>{`
        body { margin: 0; background: #080808; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #333; }
      `}</style>
      
      <ExpenseForm 
        onAdd={() => fetchData()} 
        onUpdate={() => { fetchData(); setEditingExpense(null); }}
        editingExpense={editingExpense}
        onCancelEdit={() => setEditingExpense(null)}
      />
    </div>
  );
}

export default App;
