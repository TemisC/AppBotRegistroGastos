import React from 'react';
import { ShoppingCart, Utensils, Home, Heart, Film, CreditCard, User, GraduationCap, Package, Trash2, Edit2 } from 'lucide-react';

const categoryIcons = {
  'Transporte': ShoppingCart,
  'Alimentación': Utensils,
  'Vivienda': Home,
  'Salud': Heart,
  'Entretenimiento': Film,
  'Suscripciones': CreditCard,
  'Personal': User,
  'Educación': GraduationCap,
  'Varios': Package
};

const ExpenseList = ({ expenses, loading, onDelete, onEdit }) => {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted/20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No se encontraron registros recientes.</p>
        <p className="text-sm">Tus gastos aparecerán aquí una vez que los registres.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {expenses.map((expense) => {
        const Icon = categoryIcons[expense.categoria] || Package;
        return (
          <div 
            key={expense.id} 
            className="group relative p-4 bg-card/60 border border-border/50 rounded-2xl hover:border-primary/40 hover:bg-card transition-all duration-300"
          >
            {/* Grid Architecture: Icon | Content | Amount/Actions */}
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
              
              {/* 1. Icon Container */}
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary group-hover:scale-105 transition-all shadow-inner">
                <Icon size={20} />
              </div>

              {/* 2. Main Content Wrapper */}
              <div className="min-w-0 pr-2">
                <p className="font-bold text-foreground truncate block leading-tight group-hover:text-primary transition-colors">
                  {expense.descripcion || expense.categoria}
                </p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black uppercase tracking-widest text-[#a855f7] bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                      {expense.categoria}
                   </span>
                   <span className="text-[10px] tabular-nums text-muted-foreground font-medium">
                      {expense.fecha_gasto}
                   </span>
                </div>
              </div>

              {/* 3. Amount & Action Wrapper */}
              <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                <p className="font-black text-foreground tabular-nums tracking-tighter text-lg leading-none">
                  ${parseFloat(expense.monto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </p>
                
                {/* Floating Actions on Hover */}
                <div className="flex items-center gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-1">
                  <button 
                    onClick={() => onEdit(expense)}
                    className="p-1 text-muted-foreground hover:text-primary transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button 
                    onClick={() => {
                      if (window.confirm('¿Estás seguro de eliminar este gasto?')) {
                        onDelete(expense.id);
                      }
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ExpenseList;
