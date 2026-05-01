import React, { useState, useMemo } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, FileText, Printer, Calendar, PieChart } from 'lucide-react';

const REPORT_RANGES = {
  'mes_pasado': 'Mes Pasado',
  'ultimos_3_meses': 'Últimos 3 Meses',
  'ultimos_6_meses': 'Últimos 6 Meses',
  'ultimo_ano': 'Último Año'
};

const ReportGenerator = ({ expenses, onBack }) => {
  const [reportRange, setReportRange] = useState('mes_pasado');

  const { start: startDate, end: endDate } = useMemo(() => {
    const today = new Date();
    switch (reportRange) {
      case 'mes_pasado': {
        const lastMonth = subMonths(today, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case 'ultimos_3_meses':
        return { start: startOfMonth(subMonths(today, 2)), end: endOfMonth(today) };
      case 'ultimos_6_meses':
        return { start: startOfMonth(subMonths(today, 5)), end: endOfMonth(today) };
      case 'ultimo_ano':
        return { start: startOfMonth(subMonths(today, 11)), end: endOfMonth(today) };
      default:
        return { start: startOfMonth(today), end: endOfMonth(today) };
    }
  }, [reportRange]);

  const reportExpenses = useMemo(() => {
    return expenses.filter(e => {
      const expenseDate = e.fecha_gasto;
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      return expenseDate >= startStr && expenseDate <= endStr;
    }).sort((a, b) => new Date(b.fecha_gasto) - new Date(a.fecha_gasto));
  }, [expenses, startDate, endDate]);

  const groupedByCategory = useMemo(() => {
    const groups = reportExpenses.reduce((acc, curr) => {
      if (!acc[curr.categoria]) acc[curr.categoria] = { total: 0, items: [] };
      acc[curr.categoria].total += parseFloat(curr.monto);
      acc[curr.categoria].items.push(curr);
      return acc;
    }, {});

    return Object.entries(groups)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [reportExpenses]);

  const totalAmount = useMemo(() => {
    return reportExpenses.reduce((acc, curr) => acc + parseFloat(curr.monto), 0);
  }, [reportExpenses]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-[#080808] text-foreground font-sans">
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-30 print:hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {/* HEADER NO IMPRIMIBLE */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40 print:hidden">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors uppercase tracking-widest text-xs font-black bg-white/5 px-4 py-2 rounded-xl"
          >
            <ChevronLeft size={16} /> Volver al Dashboard
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex gap-2 bg-[#111] p-1.5 rounded-xl border border-white/5">
              {Object.entries(REPORT_RANGES).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setReportRange(key)}
                  className={`px-4 py-2 rounded-lg text-xs font-black tracking-wider uppercase transition-all ${reportRange === key ? 'bg-primary text-white shadow-lg' : 'text-white/40 hover:text-white/80'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-white text-black hover:bg-primary hover:text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95"
            >
              <Printer size={16} /> Extraer en PDF
            </button>
          </div>
        </div>
      </header>

      {/* CONTENEDOR DEL REPORTE (A4) */}
      <main className="max-w-4xl mx-auto px-6 py-10 print:py-0 print:px-0 relative z-10">
        
        {/* VISTA PREVIA DEL DOCUMENTO */}
        <div className="bg-white text-black p-12 md:p-16 rounded-[40px] shadow-2xl print:shadow-none print:rounded-none print:p-0 print:bg-transparent">
          
          {/* ENCABEZADO DEL REPORTE */}
          <div className="border-b-2 border-black/10 pb-8 mb-8 flex items-end justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic text-black mb-2">
                Reporte de <span className="text-primary">Gastos</span>
              </h1>
              <p className="text-black/60 font-medium italic">
                Generado por FinanceAgent V3.2
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-black/40 uppercase tracking-widest mb-1">Periodo Analizado</p>
              <p className="text-sm font-black text-black">
                {format(startDate, 'dd MMM yyyy', { locale: es })} - {format(endDate, 'dd MMM yyyy', { locale: es })}
              </p>
            </div>
          </div>

          {/* RESUMEN GLOBAL */}
          <div className="flex items-center gap-8 mb-12 bg-gray-50 p-6 rounded-3xl border border-gray-100 print:bg-transparent print:border-black/10 print:p-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Total Periodo</p>
              <p className="text-3xl font-black text-black">${totalAmount.toLocaleString()}</p>
            </div>
            <div className="w-[1px] h-12 bg-black/10" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Total Movimientos</p>
              <p className="text-3xl font-black text-black">{reportExpenses.length}</p>
            </div>
            <div className="w-[1px] h-12 bg-black/10" />
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/40 mb-1">Categoría Principal</p>
              <p className="text-xl font-black text-primary uppercase">{groupedByCategory[0]?.name || 'N/A'}</p>
            </div>
          </div>

          {/* DESGLOSE POR CATEGORÍA */}
          <div className="space-y-10">
            {groupedByCategory.length === 0 ? (
              <p className="text-center text-black/40 italic font-medium py-10">No hay gastos registrados en este periodo.</p>
            ) : (
              groupedByCategory.map((category) => (
                <div key={category.name} className="break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-black/10 pb-3 mb-4">
                    <h3 className="text-lg font-black uppercase tracking-wider text-black flex items-center gap-2">
                      <PieChart size={18} className="text-primary" /> {category.name}
                      <span className="text-sm text-black/40 ml-2 font-bold bg-black/5 px-2 py-0.5 rounded-lg">{Math.round((category.total / totalAmount) * 100)}%</span>
                    </h3>
                    <span className="text-lg font-black text-black">
                      ${category.total.toLocaleString()}
                    </span>
                  </div>
                  
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-widest text-black/40">
                        <th className="pb-2 font-black w-32">Fecha</th>
                        <th className="pb-2 font-black">Descripción</th>
                        <th className="pb-2 font-black text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/5">
                      {category.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 font-bold text-black/60">{format(new Date(item.fecha_gasto + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}</td>
                          <td className="py-2.5 font-medium text-black">{item.descripcion || '-'}</td>
                          <td className="py-2.5 font-black text-black text-right">${parseFloat(item.monto).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>
          
          <div className="mt-16 pt-8 border-t border-black/10 text-center print:mt-8">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/30">FinanceAgent - Reporte Confidencial</p>
            <p className="text-[10px] font-bold text-black/30 mt-1">Generado el {format(new Date(), 'dd MMM yyyy HH:mm', { locale: es })}</p>
          </div>

        </div>
      </main>

      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          @page {
            size: A4;
            margin: 20mm;
          }
        }
      `}</style>
    </div>
  );
};

export default ReportGenerator;
