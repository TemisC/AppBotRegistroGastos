import React from 'react';

const StatCard = ({ title, value, icon: Icon, trend, color = 'primary' }) => {
  return (
    <div className="bg-card border border-border p-6 rounded-xl hover:border-primary/50 transition-all group overflow-hidden relative">
      <div className="flex items-center justify-between relative z-10">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>
          {trend && (
            <p className={`text-xs mt-2 font-medium ${trend > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% este mes
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-${color}/10 text-${color}`}>
          <Icon size={24} />
        </div>
      </div>
      <div className={`absolute -right-4 -bottom-4 w-24 h-24 bg-${color}/5 rounded-full group-hover:scale-150 transition-transform duration-500`} />
    </div>
  );
};

export default StatCard;
