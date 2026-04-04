import React, { useState, useEffect } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

const categories = [
  'Transporte', 'Alimentación', 'Vivienda', 'Salud', 
  'Entretenimiento', 'Suscripciones', 'Personal', 'Educación', 'Varios'
];

const ExpenseForm = ({ onAdd, onUpdate, editingExpense, onCancelEdit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    monto: '',
    descripcion: '',
    categoria: 'Alimentación',
    fecha_gasto: new Date().toISOString().split('T')[0]
  });

  // Effect to handle editing mode
  useEffect(() => {
    if (editingExpense) {
      setFormData({
        monto: editingExpense.monto,
        descripcion: editingExpense.descripcion || '',
        categoria: editingExpense.categoria,
        fecha_gasto: editingExpense.fecha_gasto
      });
      setIsOpen(true);
    }
  }, [editingExpense]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (editingExpense) {
        // UPDATE MODE
        const { data, error } = await supabase
          .from('gastos')
          .update({
            ...formData,
            monto: parseFloat(formData.monto)
          })
          .eq('id', editingExpense.id)
          .select();

        if (error) throw error;
        if (onUpdate) onUpdate(data[0]);
      } else {
        // CREATE MODE
        const { data, error } = await supabase
          .from('gastos')
          .insert([{
            ...formData,
            monto: parseFloat(formData.monto)
          }])
          .select();

        if (error) throw error;
        if (onAdd) onAdd(data[0]);
      }
      
      closeForm();
    } catch (error) {
      alert('Error en la operación: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const closeForm = () => {
    setFormData({
      monto: '',
      descripcion: '',
      categoria: 'Alimentación',
      fecha_gasto: new Date().toISOString().split('T')[0]
    });
    setIsOpen(false);
    if (onCancelEdit) onCancelEdit();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 active:scale-95 transition-all z-50 flex items-center gap-2 shadow-primary/20"
      >
        <Plus size={24} />
        <span className="hidden md:inline pr-1 font-semibold">Registrar Gasto</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md p-6 rounded-2xl border border-border shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={closeForm}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-6">
          {editingExpense ? 'Editar Registro' : 'Nuevo Registro'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Monto ($)</label>
            <input
              required
              type="number"
              step="0.01"
              className="w-full bg-input border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all"
              placeholder="0.00"
              value={formData.monto}
              onChange={(e) => setFormData({...formData, monto: e.target.value})}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Categoría</label>
            <select
              className="w-full bg-input border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none appearance-none"
              value={formData.categoria}
              onChange={(e) => setFormData({...formData, categoria: e.target.value})}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Descripción</label>
            <input
              type="text"
              className="w-full bg-input border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              placeholder="Ej. Cena en..."
              value={formData.descripcion}
              onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">Fecha</label>
            <input
              type="date"
              className="w-full bg-input border border-border p-3 rounded-xl focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none"
              value={formData.fecha_gasto}
              onChange={(e) => setFormData({...formData, fecha_gasto: e.target.value})}
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground p-4 rounded-xl font-bold hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
          >
            {loading ? 'Procesando...' : editingExpense ? (
              <><Save size={20} /> Actualizar Gasto</>
            ) : (
              <><Plus size={20} /> Guardar Gasto</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
